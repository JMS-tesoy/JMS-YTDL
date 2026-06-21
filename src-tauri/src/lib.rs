use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri::ipc::Channel;

#[tauri::command]
async fn download_video(
    app: tauri::AppHandle, 
    url: String, 
    download_path: String,
    quality: String,
    cookies: String,
    on_progress: Channel<String>
) -> Result<String, String> {
    let shell = app.shell();

    let sidecar_command = shell
        .sidecar("yt-dlp")
        .map_err(|e| format!("Could not find sidecar: {}", e))?;

    let mut args = vec![
        "--newline".to_string(),
        "--no-colors".to_string(),
        "--restrict-filenames".to_string(),
        "-P".to_string(),
        download_path.clone(),
        "-o".to_string(),
        "%(title).50s.%(ext)s".to_string(),
    ];

    if cookies != "none" {
        args.push("--cookies-from-browser".to_string());
        args.push(cookies);
    }

    match quality.as_str() {
        "1080p" => {
            args.push("-f".to_string());
            args.push("bestvideo[height<=1080]+bestaudio/best[height<=1080]/best".to_string());
        }
        "720p" => {
            args.push("-f".to_string());
            args.push("bestvideo[height<=720]+bestaudio/best[height<=720]/best".to_string());
        }
        "audio" => {
            args.push("-x".to_string());
            args.push("--audio-format".to_string());
            args.push("mp3".to_string());
        }
        _ => { // "best"
            args.push("-f".to_string());
            args.push("bestvideo+bestaudio/best".to_string());
        }
    }

    args.push(url);

    let (mut rx, _child) = sidecar_command
        .args(args)
        .spawn()
        .map_err(|e| format!("Failed to run downloader: {}", e))?;

    let mut success = false;
    let mut stderr_output = String::new();

    // Loop through the terminal stream in real-time
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line);
                let _ = on_progress.send(line_str.into_owned()); // Pipe output to Javascript
            }
            CommandEvent::Stderr(line) => {
                let line_str = String::from_utf8_lossy(&line);
                stderr_output.push_str(&line_str);
            }
            CommandEvent::Terminated(payload) => {
                success = payload.code == Some(0); // Exit code 0 means perfect completion
            }
            _ => {}
        }
    }

    if success {
        Ok(format!("Finished! Saved to: {}", download_path))
    } else {
        Err(format!("yt-dlp error: {}", stderr_output))
    }
}

#[tauri::command]
async fn update_engine(app: tauri::AppHandle) -> Result<String, String> {
    let shell = app.shell();
    let sidecar_command = shell
        .sidecar("yt-dlp")
        .map_err(|e| format!("Could not find sidecar: {}", e))?;

    let output = sidecar_command
        .arg("-U")
        .output()
        .await
        .map_err(|e| format!("Failed to execute update: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into_owned())
    }
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let command = "explorer";
    #[cfg(target_os = "macos")]
    let command = "open";
    #[cfg(target_os = "linux")]
    let command = "xdg-open";

    std::process::Command::new(command)
        .arg(&path)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to open folder: {}", e))
}

#[tauri::command]
fn open_new_instance() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| format!("Failed to get executable path: {}", e))?;
    std::process::Command::new(exe)
        .spawn()
        .map_err(|e| format!("Failed to open new instance: {}", e))?;
    Ok(())
}

#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to save file: {}", e))
}

#[tauri::command]
fn get_model_filename(model_size: &str) -> String {
    match model_size {
        "small" => "ggml-small.bin".to_string(),
        "medium" => "ggml-medium.bin".to_string(),
        _ => "ggml-base.bin".to_string(),
    }
}

fn get_model_url(model_size: &str) -> String {
    match model_size {
        "small" => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin".to_string(),
        "medium" => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin".to_string(),
        _ => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin".to_string(),
    }
}

fn get_min_model_size(model_size: &str) -> u64 {
    match model_size {
        "small" => 200_000_000,
        "medium" => 500_000_000,
        _ => 50_000_000,
    }
}

#[tauri::command]
fn check_whisper_model(app: tauri::AppHandle, model_size: String) -> Result<String, String> {
    let resource_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let filename = get_model_filename(&model_size);
    let model_path = resource_dir.join(&filename);
    if model_path.exists() {
        Ok(format!("Model found: {}", model_path.display()))
    } else {
        Err("Model not found".to_string())
    }
}

#[tauri::command]
async fn download_whisper_model(
    app: tauri::AppHandle,
    model_size: String,
    on_progress: Channel<String>,
) -> Result<String, String> {
    let resource_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    std::fs::create_dir_all(&resource_dir)
        .map_err(|e| format!("Failed to create data dir: {}", e))?;
    let filename = get_model_filename(&model_size);
    let model_path = resource_dir.join(&filename);

    if model_path.exists() {
        return Ok(format!("Model already exists: {}", model_path.display()));
    }

    let model_url = get_model_url(&model_size);

    let client = reqwest::Client::new();
    let response = client
        .get(model_url)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut buf = Vec::new();

    let mut stream = response.bytes_stream();
    while let Some(chunk) = futures_util::StreamExt::next(&mut stream).await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        downloaded += chunk.len() as u64;
        buf.extend_from_slice(&chunk);
        if total_size > 0 {
            let pct = (downloaded as f64 / total_size as f64 * 100.0) as u32;
            let _ = on_progress.send(format!("Downloading model... {}%", pct));
        }
    }

    std::fs::write(&model_path, &buf)
        .map_err(|e| format!("Failed to save model: {}", e))?;

    let _ = on_progress.send("Download complete!".to_string());
    Ok(format!("Model saved to: {}", model_path.display()))
}

#[tauri::command]
async fn transcribe_audio(
    app: tauri::AppHandle,
    audio_path: String,
    language: String,
    model_size: String,
    on_progress: Channel<String>,
) -> Result<String, String> {
    let shell = app.shell();
    let resource_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let filename = get_model_filename(&model_size);
    let model_path = resource_dir.join(&filename);
    if !model_path.exists() {
        return Err(format!("{} model not found. Please download it first.", model_size));
    }
    // Validate model file size
    let file_size = std::fs::metadata(&model_path)
        .map(|m| m.len())
        .unwrap_or(0);
    let min_size = get_min_model_size(&model_size);
    if file_size < min_size {
        return Err(format!(
            "{} model appears corrupted ({} MB). Please re-download it.",
            model_size,
            file_size / 1_000_000
        ));
    }

    let temp_dir = std::env::temp_dir().join("jms-transcriber");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    let wav_path = temp_dir.join("audio_convert.wav");

    // Step 1: Convert to 16kHz mono WAV using ffmpeg
    let _ = on_progress.send("Converting audio to 16kHz WAV...".to_string());

    let ffmpeg_cmd = shell
        .sidecar("ffmpeg")
        .map_err(|e| format!("Could not find ffmpeg: {}", e))?;

    let ffmpeg_output = ffmpeg_cmd
        .args([
            "-y",
            "-i",
            &audio_path,
            "-ar",
            "16000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            &wav_path.to_string_lossy(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !ffmpeg_output.status.success() {
        let stderr = String::from_utf8_lossy(&ffmpeg_output.stderr);
        return Err(format!("ffmpeg conversion failed: {}", stderr));
    }

    // Step 2: Find whisper binary and its DLL directory
    // Search multiple locations for DLLs (dev mode vs production)
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));
    let cwd = std::env::current_dir().ok();
    let possible_dirs: Vec<std::path::PathBuf> = [
        exe_dir.clone(),
        cwd.as_ref().map(|p| p.join("binaries")),
        cwd.as_ref().map(|p| p.join("src-tauri").join("binaries")),
    ]
        .into_iter()
        .flatten()
        .collect();
    let dll_names: [&str; 4] = ["whisper.dll", "ggml.dll", "ggml-base.dll", "ggml-cpu-x64.dll"];

    // Find the directory containing both whisper.exe and its DLLs
    let whisper_exe_name = if cfg!(target_os = "windows") {
        "whisper-x86_64-pc-windows-msvc.exe"
    } else {
        "whisper"
    };
    let mut whisper_dir: Option<std::path::PathBuf> = None;
    for dir in &possible_dirs {
        let exe_path = dir.join(whisper_exe_name);
        let first_dll = dir.join(dll_names[0]);
        if exe_path.exists() && first_dll.exists() {
            whisper_dir = Some(dir.clone());
            break;
        }
    }

    let whisper_dir = whisper_dir.ok_or_else(|| {
        format!(
            "Whisper binary or DLLs not found in: {:?}",
            possible_dirs.iter().map(|d| d.display().to_string()).collect::<Vec<_>>()
        )
    })?;

    // Step 3: Run whisper.cpp via raw process (not Tauri sidecar) with correct working directory
    let _ = on_progress.send("Running transcription with whisper...".to_string());

    let whisper_exe = whisper_dir.join(whisper_exe_name);
    let mut args = vec![
        "-m".to_string(),
        model_path.to_string_lossy().to_string(),
        "-f".to_string(),
        wav_path.to_string_lossy().to_string(),
        "-nt".to_string(),
        "-np".to_string(),
    ];

    if !language.is_empty() && language != "auto" {
        args.push("-l".to_string());
        args.push(language);
    }

    let output = std::process::Command::new(&whisper_exe)
        .args(&args)
        .current_dir(&whisper_dir)
        .output()
        .map_err(|e| format!("Failed to run whisper: {}", e))?;

    // Cleanup temp file
    let _ = std::fs::remove_file(&wav_path);

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Filter out whisper debug/status lines, keep only transcript text
        let all_text = format!("{}\n{}", stdout, stderr);
        let transcript: String = all_text
            .lines()
            .filter(|line| {
                let trimmed = line.trim();
                if trimmed.is_empty() { return false; }
                // Skip whisper diagnostic/startup lines
                let skip_prefixes = [
                    "load_backend:", "read_audio_data:", "whisper_init",
                    "system_info", "main:", "whisper_",
                ];
                for prefix in &skip_prefixes {
                    if trimmed.starts_with(prefix) { return false; }
                }
                // Skip timing/progress lines
                if trimmed.starts_with('[') && trimmed.len() > 2 && trimmed.chars().nth(2) == Some(':') {
                    return false;
                }
                true
            })
            .collect::<Vec<_>>()
            .join("\n");
        if transcript.trim().is_empty() {
            Err("Whisper ran successfully but produced no transcript text (audio may have no speech).".to_string())
        } else {
            let _ = on_progress.send(transcript.trim().to_string());
            Ok(transcript.trim().to_string())
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!(
            "Whisper error (exit code {}): {}",
            output.status.code().unwrap_or(-1),
            stderr
        ))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            download_video,
            open_folder,
            open_new_instance,
            update_engine,
            save_text_file,
            check_whisper_model,
            download_whisper_model,
            transcribe_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}