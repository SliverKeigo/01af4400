mod recognizer;
mod store;

use recognizer::SpeechRecognizer;
use store::{Language, Task, TaskStore};
use tauri::Manager;
use std::path::PathBuf;

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

fn language_to_sense_voice(lang: &Language) -> &'static str {
    match lang {
        Language::Chinese => "zh",
        Language::English => "en",
        Language::Japanese => "ja",
        Language::Korean => "ko",
        Language::Cantonese => "yue",
    }
}

#[tauri::command]
fn recognize_audio(
    recognizer_state: tauri::State<'_, SpeechRecognizer>,
    samples_base64: String,
    sample_rate: i32,
    language: Language,
) -> Result<String, String> {
    use base64::Engine;

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&samples_base64)
        .map_err(|e| format!("base64 解码失败: {e}"))?;

    if bytes.len() < 4 {
        return Err("音频数据为空".to_string());
    }

    // Convert bytes back to f32 samples (little-endian)
    let samples: Vec<f32> = bytes
        .chunks_exact(4)
        .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
        .collect();

    let lang = language_to_sense_voice(&language);

    recognizer_state.recognize(&samples, sample_rate, lang)
}

#[tauri::command]
fn get_model_status(recognizer_state: tauri::State<'_, SpeechRecognizer>) -> bool {
    recognizer_state.is_loaded()
}

#[tauri::command]
fn load_model(
    recognizer_state: tauri::State<'_, SpeechRecognizer>,
    model_dir: String,
) -> Result<(), String> {
    recognizer_state.load_model(PathBuf::from(model_dir))
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;

    #[test]
    fn language_to_sense_voice_mapping() {
        assert_eq!(language_to_sense_voice(&Language::Chinese), "zh");
        assert_eq!(language_to_sense_voice(&Language::English), "en");
        assert_eq!(language_to_sense_voice(&Language::Japanese), "ja");
        assert_eq!(language_to_sense_voice(&Language::Korean), "ko");
        assert_eq!(language_to_sense_voice(&Language::Cantonese), "yue");
    }

    #[test]
    fn base64_f32_roundtrip() {
        let samples: Vec<f32> = vec![0.0, 0.5, -0.5, 1.0, -1.0];
        let bytes: Vec<u8> = samples.iter().flat_map(|s| s.to_le_bytes()).collect();
        let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);

        let decoded_bytes = base64::engine::general_purpose::STANDARD
            .decode(&encoded)
            .unwrap();
        let decoded: Vec<f32> = decoded_bytes
            .chunks_exact(4)
            .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
            .collect();

        assert_eq!(samples, decoded);
    }

    #[test]
    fn base64_empty_audio_rejected() {
        // Less than 4 bytes (one f32) should be rejected
        let encoded = base64::engine::general_purpose::STANDARD.encode(&[0u8, 1, 2]);
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&encoded)
            .unwrap();
        assert!(bytes.len() < 4);
    }

    #[test]
    fn create_task_trims_and_filters_lines() {
        let dir = std::env::temp_dir().join(format!("ttv_cmd_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let store = TaskStore::new(dir.join("t.json"));

        let text = "  hello  \n\n  world  \n   \n";
        let items: Vec<String> = text
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();

        let task = store.create_task(None, items, Language::Chinese).unwrap();
        assert_eq!(task.items.len(), 2);
        assert_eq!(task.items[0].original_text, "hello");
        assert_eq!(task.items[1].original_text, "world");

        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn create_task_empty_title_becomes_none() {
        let title = "   ";
        let result = if title.trim().is_empty() {
            None
        } else {
            Some(title.trim().to_string())
        };
        assert_eq!(result, None);
    }

    #[test]
    fn create_task_nonempty_title_trimmed() {
        let title = "  my task  ";
        let result = if title.trim().is_empty() {
            None
        } else {
            Some(title.trim().to_string())
        };
        assert_eq!(result, Some("my task".to_string()));
    }
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

            // Initialize recognizer and try to auto-load model
            let recognizer = SpeechRecognizer::new();

            // Try to find model in common locations
            let resource_dir = app.path().resource_dir().ok();
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()));

            let candidate_dirs = [
                // Project root (for dev mode)
                Some(PathBuf::from("sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17")),
                // Absolute path in project
                Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().join("sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17")),
                // Resource dir
                resource_dir.map(|d| d.join("sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17")),
                // Next to executable
                exe_dir.map(|d| d.join("sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17")),
                // int8 variants
                Some(PathBuf::from("sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09")),
                Some(PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().join("sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09")),
            ];

            for dir in candidate_dirs.into_iter().flatten() {
                if dir.join("model.onnx").exists() || dir.join("model.int8.onnx").exists() {
                    match recognizer.load_model(dir.clone()) {
                        Ok(()) => {
                            eprintln!("[跟读助手] 模型加载成功: {}", dir.display());
                            break;
                        }
                        Err(e) => {
                            eprintln!("[跟读助手] 模型加载失败 {}: {}", dir.display(), e);
                        }
                    }
                }
            }

            if !recognizer.is_loaded() {
                eprintln!("[跟读助手] 警告: 未找到语音识别模型，请手动配置模型路径");
            }

            app.manage(recognizer);

            // Set window icon for dev mode (bundle mode uses icon.icns automatically)
            if let Some(window) = app.get_webview_window("main") {
                let icon_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("icons/icon.png");
                if icon_path.exists() {
                    if let Ok(icon_data) = std::fs::read(&icon_path) {
                        let icon = tauri::image::Image::from_bytes(&icon_data)
                            .expect("failed to load icon");
                        let _ = window.set_icon(icon);
                    }
                }
            }

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
            get_model_status,
            load_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
