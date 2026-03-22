use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri::ipc::Channel;

#[tauri::command]
async fn download_video(
    app: tauri::AppHandle, 
    url: String, 
    download_path: String,
    on_progress: Channel<String> // <--- Added channel to emit events back to frontend
) -> Result<String, String> {
    let shell = app.shell();

    let sidecar_command = shell
        .sidecar("yt-dlp")
        .map_err(|e| format!("Could not find sidecar: {}", e))?;

    // We use .spawn() instead of .output() so we can read data as it arrives
    // Adding "--newline" and "--no-colors" makes the terminal text much easier to parse!
    let (mut rx, _child) = sidecar_command
        .args(["--newline", "--no-colors", "-P", &download_path, &url])
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Both plugins initialized here
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![download_video, open_folder, open_new_instance])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}