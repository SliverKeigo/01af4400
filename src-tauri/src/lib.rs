mod store;

use store::{Language, Task, TaskStore};
use tauri::Manager;

#[tauri::command]
fn create_task(
    state: tauri::State<'_, TaskStore>,
    title: String,
    text: String,
    language: Language,
) -> Result<Task, String> {
    let title = if title.trim().is_empty() {
        None
    } else {
        Some(title.trim().to_string())
    };
    let items: Vec<String> = text
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    if items.is_empty() {
        return Err("文本不能为空".to_string());
    }
    state.create_task(title, items, language)
}

#[tauri::command]
fn list_tasks(state: tauri::State<'_, TaskStore>) -> Vec<Task> {
    state.list_tasks()
}

#[tauri::command]
fn get_task(state: tauri::State<'_, TaskStore>, task_id: String) -> Result<Task, String> {
    state
        .get_task(&task_id)
        .ok_or_else(|| "任务不存在".to_string())
}

#[tauri::command]
fn delete_task(state: tauri::State<'_, TaskStore>, task_id: String) -> Result<(), String> {
    state.delete_task(&task_id)
}

#[tauri::command]
fn save_attempt(
    state: tauri::State<'_, TaskStore>,
    task_id: String,
    item_index: usize,
    recognized_text: String,
) -> Result<Task, String> {
    state.save_attempt(&task_id, item_index, &recognized_text)
}

#[tauri::command]
fn delete_attempt(
    state: tauri::State<'_, TaskStore>,
    task_id: String,
    item_index: usize,
    attempt_index: usize,
) -> Result<Task, String> {
    state.delete_attempt(&task_id, item_index, attempt_index)
}

#[tauri::command]
fn recognize_audio(_audio_data: Vec<u8>, _language: Language) -> Result<String, String> {
    // TODO: Integrate sherpa-onnx SenseVoice model
    // Currently returns mock recognition result
    let mock_texts = [
        "这是一段模拟的识别结果",
        "The quick brown fox jumps over the lazy dog",
        "今日はいい天気ですね",
        "안녕하세요 반갑습니다",
        "今日天氣好好呀",
    ];
    let idx = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .subsec_millis() as usize
        % mock_texts.len();
    Ok(mock_texts[idx].to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            let store = TaskStore::new(app_data_dir.join("tasks.json"));
            app.manage(store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_task,
            list_tasks,
            get_task,
            delete_task,
            save_attempt,
            delete_attempt,
            recognize_audio,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
