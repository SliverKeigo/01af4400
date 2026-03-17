use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Chinese,
    English,
    Japanese,
    Korean,
    Cantonese,
}

impl Language {
    pub fn label(&self) -> &str {
        match self {
            Language::Chinese => "中文",
            Language::English => "English",
            Language::Japanese => "日本語",
            Language::Korean => "한국어",
            Language::Cantonese => "粤语",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attempt {
    pub text: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskItem {
    pub original_text: String,
    pub attempts: Vec<Attempt>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: Option<String>,
    pub language: Language,
    pub items: Vec<TaskItem>,
    pub created_at: String,
}

impl Task {
    pub fn completed_count(&self) -> usize {
        self.items.iter().filter(|i| !i.attempts.is_empty()).count()
    }
}

pub struct TaskStore {
    path: PathBuf,
    tasks: Mutex<Vec<Task>>,
}

impl TaskStore {
    pub fn new(path: PathBuf) -> Self {
        let tasks = if path.exists() {
            match std::fs::read_to_string(&path) {
                Ok(data) => serde_json::from_str(&data).unwrap_or_default(),
                Err(_) => Vec::new(),
            }
        } else {
            Vec::new()
        };
        Self {
            path,
            tasks: Mutex::new(tasks),
        }
    }

    fn save(&self, tasks: &Vec<Task>) {
        if let Ok(data) = serde_json::to_string_pretty(tasks) {
            let _ = std::fs::write(&self.path, data);
        }
    }

    pub fn create_task(
        &self,
        title: Option<String>,
        texts: Vec<String>,
        language: Language,
    ) -> Result<Task, String> {
        let task = Task {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            language,
            items: texts
                .into_iter()
                .map(|t| TaskItem {
                    original_text: t,
                    attempts: Vec::new(),
                })
                .collect(),
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        let mut tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        tasks.push(task.clone());
        self.save(&tasks);
        Ok(task)
    }

    pub fn list_tasks(&self) -> Vec<Task> {
        self.tasks.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn get_task(&self, id: &str) -> Option<Task> {
        self.tasks
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .iter()
            .find(|t| t.id == id)
            .cloned()
    }

    pub fn delete_task(&self, id: &str) -> Result<(), String> {
        let mut tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        let len = tasks.len();
        tasks.retain(|t| t.id != id);
        if tasks.len() == len {
            return Err("任务不存在".to_string());
        }
        self.save(&tasks);
        Ok(())
    }

    pub fn save_attempt(
        &self,
        task_id: &str,
        item_index: usize,
        text: &str,
    ) -> Result<Task, String> {
        let mut tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        let idx = tasks
            .iter()
            .position(|t| t.id == task_id)
            .ok_or("任务不存在")?;
        let item = tasks[idx]
            .items
            .get_mut(item_index)
            .ok_or("句子索引越界")?;
        if item.attempts.len() >= 2 {
            return Err("已达到最大识别记录数（2条），请先删除再录".to_string());
        }
        item.attempts.push(Attempt {
            text: text.to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        });
        self.save(&tasks);
        Ok(tasks[idx].clone())
    }

    pub fn delete_attempt(
        &self,
        task_id: &str,
        item_index: usize,
        attempt_index: usize,
    ) -> Result<Task, String> {
        let mut tasks = self.tasks.lock().map_err(|e| e.to_string())?;
        let idx = tasks
            .iter()
            .position(|t| t.id == task_id)
            .ok_or("任务不存在")?;
        let item = tasks[idx]
            .items
            .get_mut(item_index)
            .ok_or("句子索引越界")?;
        if attempt_index >= item.attempts.len() {
            return Err("记录索引越界".to_string());
        }
        item.attempts.remove(attempt_index);
        self.save(&tasks);
        Ok(tasks[idx].clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn tmp_store() -> (TaskStore, PathBuf) {
        let dir = std::env::temp_dir().join(format!("ttv_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("tasks.json");
        (TaskStore::new(path.clone()), dir)
    }

    fn cleanup(dir: PathBuf) {
        let _ = fs::remove_dir_all(dir);
    }

    // ── Language ──

    #[test]
    fn language_labels() {
        assert_eq!(Language::Chinese.label(), "中文");
        assert_eq!(Language::English.label(), "English");
        assert_eq!(Language::Japanese.label(), "日本語");
        assert_eq!(Language::Korean.label(), "한국어");
        assert_eq!(Language::Cantonese.label(), "粤语");
    }

    #[test]
    fn language_serde_roundtrip() {
        let json = serde_json::to_string(&Language::Cantonese).unwrap();
        assert_eq!(json, "\"cantonese\"");
        let parsed: Language = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, Language::Cantonese);
    }

    // ── Task.completed_count ──

    #[test]
    fn completed_count_empty() {
        let task = Task {
            id: "t1".into(),
            title: None,
            language: Language::Chinese,
            items: vec![
                TaskItem { original_text: "a".into(), attempts: vec![] },
                TaskItem { original_text: "b".into(), attempts: vec![] },
            ],
            created_at: "2026-01-01T00:00:00Z".into(),
        };
        assert_eq!(task.completed_count(), 0);
    }

    #[test]
    fn completed_count_partial() {
        let task = Task {
            id: "t1".into(),
            title: None,
            language: Language::English,
            items: vec![
                TaskItem {
                    original_text: "a".into(),
                    attempts: vec![Attempt { text: "a".into(), timestamp: "ts".into() }],
                },
                TaskItem { original_text: "b".into(), attempts: vec![] },
                TaskItem {
                    original_text: "c".into(),
                    attempts: vec![Attempt { text: "c".into(), timestamp: "ts".into() }],
                },
            ],
            created_at: "2026-01-01T00:00:00Z".into(),
        };
        assert_eq!(task.completed_count(), 2);
    }

    // ── TaskStore: create & list ──

    #[test]
    fn create_and_list_tasks() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(
                Some("test".into()),
                vec!["hello".into(), "world".into()],
                Language::English,
            )
            .unwrap();
        assert_eq!(task.title, Some("test".into()));
        assert_eq!(task.items.len(), 2);
        assert_eq!(task.items[0].original_text, "hello");
        assert_eq!(task.items[1].original_text, "world");
        assert_eq!(task.language, Language::English);
        assert!(task.items[0].attempts.is_empty());

        let list = store.list_tasks();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, task.id);
        cleanup(dir);
    }

    #[test]
    fn create_task_no_title() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["line".into()], Language::Japanese)
            .unwrap();
        assert_eq!(task.title, None);
        cleanup(dir);
    }

    // ── TaskStore: get ──

    #[test]
    fn get_task_found() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["a".into()], Language::Chinese)
            .unwrap();
        let found = store.get_task(&task.id);
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, task.id);
        cleanup(dir);
    }

    #[test]
    fn get_task_not_found() {
        let (store, dir) = tmp_store();
        assert!(store.get_task("nonexistent").is_none());
        cleanup(dir);
    }

    // ── TaskStore: delete ──

    #[test]
    fn delete_task_success() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["a".into()], Language::Chinese)
            .unwrap();
        assert!(store.delete_task(&task.id).is_ok());
        assert_eq!(store.list_tasks().len(), 0);
        cleanup(dir);
    }

    #[test]
    fn delete_task_not_found() {
        let (store, dir) = tmp_store();
        let result = store.delete_task("nonexistent");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("任务不存在"));
        cleanup(dir);
    }

    // ── TaskStore: save_attempt ──

    #[test]
    fn save_attempt_success() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["hello".into(), "world".into()], Language::English)
            .unwrap();

        let updated = store.save_attempt(&task.id, 0, "hello there").unwrap();
        assert_eq!(updated.items[0].attempts.len(), 1);
        assert_eq!(updated.items[0].attempts[0].text, "hello there");
        assert_eq!(updated.items[1].attempts.len(), 0);
        cleanup(dir);
    }

    #[test]
    fn save_attempt_two_max() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["hello".into()], Language::Chinese)
            .unwrap();

        store.save_attempt(&task.id, 0, "first").unwrap();
        store.save_attempt(&task.id, 0, "second").unwrap();
        let result = store.save_attempt(&task.id, 0, "third");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("2条"));
        cleanup(dir);
    }

    #[test]
    fn save_attempt_invalid_task() {
        let (store, dir) = tmp_store();
        let result = store.save_attempt("bad_id", 0, "text");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("任务不存在"));
        cleanup(dir);
    }

    #[test]
    fn save_attempt_invalid_index() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["a".into()], Language::Chinese)
            .unwrap();
        let result = store.save_attempt(&task.id, 99, "text");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("索引越界"));
        cleanup(dir);
    }

    // ── TaskStore: delete_attempt ──

    #[test]
    fn delete_attempt_success() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["a".into()], Language::Chinese)
            .unwrap();
        store.save_attempt(&task.id, 0, "first").unwrap();
        store.save_attempt(&task.id, 0, "second").unwrap();

        let updated = store.delete_attempt(&task.id, 0, 0).unwrap();
        assert_eq!(updated.items[0].attempts.len(), 1);
        assert_eq!(updated.items[0].attempts[0].text, "second");
        cleanup(dir);
    }

    #[test]
    fn delete_attempt_then_save_again() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["a".into()], Language::Chinese)
            .unwrap();
        store.save_attempt(&task.id, 0, "first").unwrap();
        store.save_attempt(&task.id, 0, "second").unwrap();

        store.delete_attempt(&task.id, 0, 1).unwrap();
        let updated = store.save_attempt(&task.id, 0, "new second").unwrap();
        assert_eq!(updated.items[0].attempts.len(), 2);
        assert_eq!(updated.items[0].attempts[1].text, "new second");
        cleanup(dir);
    }

    #[test]
    fn delete_attempt_invalid_index() {
        let (store, dir) = tmp_store();
        let task = store
            .create_task(None, vec!["a".into()], Language::Chinese)
            .unwrap();
        let result = store.delete_attempt(&task.id, 0, 0);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("记录索引越界"));
        cleanup(dir);
    }

    #[test]
    fn delete_attempt_invalid_task() {
        let (store, dir) = tmp_store();
        let result = store.delete_attempt("bad", 0, 0);
        assert!(result.is_err());
        cleanup(dir);
    }

    // ── Persistence ──

    #[test]
    fn persistence_across_instances() {
        let dir = std::env::temp_dir().join(format!("ttv_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("tasks.json");

        let task_id;
        {
            let store = TaskStore::new(path.clone());
            let task = store
                .create_task(Some("persist".into()), vec!["line1".into()], Language::Korean)
                .unwrap();
            task_id = task.id;
            store.save_attempt(&task_id, 0, "recognized").unwrap();
        }

        // New instance reads from disk
        let store2 = TaskStore::new(path);
        let list = store2.list_tasks();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].title, Some("persist".into()));
        assert_eq!(list[0].language, Language::Korean);
        assert_eq!(list[0].items[0].attempts.len(), 1);
        assert_eq!(list[0].items[0].attempts[0].text, "recognized");

        cleanup(dir);
    }

    #[test]
    fn persistence_corrupt_file() {
        let dir = std::env::temp_dir().join(format!("ttv_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("tasks.json");
        fs::write(&path, "not valid json {{{").unwrap();

        let store = TaskStore::new(path);
        assert_eq!(store.list_tasks().len(), 0);
        cleanup(dir);
    }

    // ── Multiple tasks ──

    #[test]
    fn multiple_tasks_independent() {
        let (store, dir) = tmp_store();
        let t1 = store
            .create_task(Some("task1".into()), vec!["a".into()], Language::Chinese)
            .unwrap();
        let t2 = store
            .create_task(Some("task2".into()), vec!["b".into()], Language::English)
            .unwrap();

        store.save_attempt(&t1.id, 0, "aaa").unwrap();
        store.delete_task(&t2.id).unwrap();

        assert_eq!(store.list_tasks().len(), 1);
        let remaining = store.get_task(&t1.id).unwrap();
        assert_eq!(remaining.items[0].attempts.len(), 1);

        cleanup(dir);
    }
}
