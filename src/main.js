// This is the magic function that lets JS talk to Rust
const { invoke } = window.__TAURI__.core;

async function startDownload() {
  const urlInput = document.querySelector("#url-input");
  const statusMsg = document.querySelector("#status-msg");
  const btn = document.querySelector("#download-btn");

  if (!urlInput.value) {
    statusMsg.textContent = "Please paste a URL first!";
    return;
  }

  // UI Feedback
  statusMsg.textContent = "Downloading... please wait (this takes a moment)";
  btn.disabled = true;

  try {
    // Calling the Rust function we wrote in lib.rs
    const result = await invoke("download_video", { url: urlInput.value });
    
    statusMsg.textContent = "✅ " + result;
  } catch (error) {
    statusMsg.textContent = "❌ Error: " + error;
    console.error(error);
  } finally {
    btn.disabled = false;
  }
}

// Attach the function to the button
document.querySelector("#download-btn").addEventListener("click", startDownload);