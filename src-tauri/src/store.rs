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
