use sherpa_onnx::{OfflineRecognizer, OfflineRecognizerConfig, OfflineSenseVoiceModelConfig};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct SpeechRecognizer {
    recognizer: Mutex<Option<OfflineRecognizer>>,
    model_dir: Mutex<Option<PathBuf>>,
}

unsafe impl Send for SpeechRecognizer {}
unsafe impl Sync for SpeechRecognizer {}

impl SpeechRecognizer {
    pub fn new() -> Self {
        Self {
            recognizer: Mutex::new(None),
            model_dir: Mutex::new(None),
        }
    }

    pub fn load_model(&self, model_dir: PathBuf) -> Result<(), String> {
        let model_path = model_dir.join("model.onnx");
        let tokens_path = model_dir.join("tokens.txt");

        if !model_path.exists() {
            // Try int8 variant
            let int8_path = model_dir.join("model.int8.onnx");
            if !int8_path.exists() {
                return Err(format!(
                    "模型文件不存在: {} 或 {}",
                    model_path.display(),
                    int8_path.display()
                ));
            }
            return self.load_model_files(&int8_path, &tokens_path);
        }

        self.load_model_files(&model_path, &tokens_path)
    }

    fn load_model_files(
        &self,
        model_path: &std::path::Path,
        tokens_path: &std::path::Path,
    ) -> Result<(), String> {
        if !tokens_path.exists() {
            return Err(format!("tokens 文件不存在: {}", tokens_path.display()));
        }

        let mut config = OfflineRecognizerConfig::default();
        config.model_config.sense_voice = OfflineSenseVoiceModelConfig {
            model: Some(model_path.to_string_lossy().into_owned()),
            language: Some("auto".into()),
            use_itn: true,
        };
        config.model_config.tokens = Some(tokens_path.to_string_lossy().into_owned());
        config.model_config.num_threads = 2;
        config.model_config.debug = false;
        config.model_config.provider = Some("cpu".into());

        let rec = OfflineRecognizer::create(&config)
            .ok_or_else(|| "创建识别器失败，请检查模型文件是否完整".to_string())?;

        *self.recognizer.lock().map_err(|e| e.to_string())? = Some(rec);
        *self.model_dir.lock().map_err(|e| e.to_string())? = Some(model_path.parent().unwrap().to_path_buf());
        Ok(())
    }

    pub fn is_loaded(&self) -> bool {
        self.recognizer
            .lock()
            .map(|r| r.is_some())
            .unwrap_or(false)
    }

    pub fn recognize(&self, samples: &[f32], sample_rate: i32, _language: &str) -> Result<String, String> {
        let guard = self.recognizer.lock().map_err(|e| e.to_string())?;
        let rec = guard
            .as_ref()
            .ok_or_else(|| "模型未加载，请先配置模型路径".to_string())?;

        let stream = rec.create_stream();
        stream.accept_waveform(sample_rate, samples);
        rec.decode(&stream);

        let result = stream
            .get_result()
            .ok_or_else(|| "识别失败，未返回结果".to_string())?;

        Ok(result.text.trim().to_string())
    }
}
