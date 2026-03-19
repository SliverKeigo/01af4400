fn main() {
    if let Ok(lib_dir) = std::env::var("SHERPA_ONNX_LIB_DIR") {
        println!("cargo:rustc-link-search=native={lib_dir}");

        #[cfg(target_os = "macos")]
        {
            // For dev: use the lib dir directly
            println!("cargo:rustc-link-arg=-Wl,-rpath,{lib_dir}");
            // For bundled .app: look in Frameworks directory
            println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
        }

        #[cfg(target_os = "linux")]
        println!("cargo:rustc-link-arg=-Wl,-rpath,{lib_dir}");
    }
    tauri_build::build()
}
