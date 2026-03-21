use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn download_video(app: tauri::AppHandle, url: String) -> Result<String, String> {
    // 1. Get the shell from the app handle
    let shell = app.shell();
    
    // 2. Setup the sidecar (yt-dlp)
    // Note: We use format! to turn the error into a clear String for the frontend
    let sidecar_command = shell
        .sidecar("yt-dlp")
        .map_err(|e| format!("Could not find sidecar: {}", e))?;
    
    // 3. Run the command with the URL and wait for it to finish
    let output = sidecar_command
        .args([url])
        .output()
        .await
        .map_err(|e| format!("Failed to run downloader: {}", e))?;

    // 4. Return the result back to your JavaScript
    if output.status.success() {
        Ok("Download Finished successfully!".into())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("yt-dlp error: {}", stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // This is what the warning was asking for:
        .plugin(tauri_plugin_shell::init()) 
        // This registers your command so the frontend can "invoke" it
        .invoke_handler(tauri::generate_handler![download_video])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}