const { invoke } = window.__TAURI__.core;
const { open } = window.__TAURI__.dialog; // The folder picker logic

let selectedPath = "";

async function selectFolder() {
  const result = await open({
    directory: true, // Crucial: This makes it a folder picker, not a file picker
    multiple: false,
    title: "Select Download Folder"
  });

  if (result) {
    selectedPath = result;
    document.querySelector("#status-msg").textContent = `📁 Saving to: ${selectedPath}`;
    document.querySelector("#status-msg").style.color = "#00d2ff";
  }
}

async function startDownload() {
  const url = document.querySelector("#url-input").value;
  const statusMsg = document.querySelector("#status-msg");

  if (!url) return alert("Please paste a URL!");
  if (!selectedPath) return alert("Please select a folder first!");

  statusMsg.textContent = "🚀 Starting download...";
  
  try {
    // We send BOTH the url and the downloadPath to the Rust side
    const response = await invoke("download_video", { url, downloadPath: selectedPath });
    statusMsg.textContent = "✅ " + response;
  } catch (err) {
    statusMsg.textContent = "❌ " + err;
  }
}

document.querySelector("#folder-btn").onclick = selectFolder;
document.querySelector("#download-btn").onclick = startDownload;