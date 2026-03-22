const { invoke, Channel } = window.__TAURI__.core;
const { open } = window.__TAURI__.dialog; // The folder picker logic
const { downloadDir } = window.__TAURI__.path; // API to get the system's default Downloads folder
const { getCurrentWindow } = window.__TAURI__.window; // API to control the window

let selectedPath = "";

// Fetch the default downloads path when the app starts
async function initDefaultPath() {
  try {
    selectedPath = await downloadDir();
    // Display the path in the new read-only input box
    document.querySelector("#path-display").value = selectedPath;
  } catch (err) {
    console.warn("Could not get default downloads folder:", err);
  }
}

initDefaultPath(); // Call immediately on load

async function selectFolder() {
  const result = await open({
    directory: true, // Crucial: This makes it a folder picker, not a file picker
    multiple: false,
    title: "Select Download Folder",
    defaultPath: selectedPath || undefined // Starts the picker in the current selected path
  });

  if (result) {
    selectedPath = result;
    // Display the newly picked path
    document.querySelector("#path-display").value = selectedPath;
  }
}

async function startDownload() {
  const url = document.querySelector("#url-input").value;
  const statusMsg = document.querySelector("#status-msg");
  const progressBar = document.querySelector("#progress-bar");
  const progressText = document.querySelector("#progress-text");
  const openFolderBtn = document.querySelector("#open-folder-btn");

  if (!url) return alert("Please paste a URL!");
  if (!selectedPath) return alert("Please select a folder first!");

  statusMsg.textContent = "🚀 Starting download...";
  statusMsg.style.color = "#f6f6f6";
  progressBar.style.width = "0%"; // Start the progress bar at 0
  progressText.textContent = "0%";
  progressText.style.display = "block";
  openFolderBtn.style.display = "none";

  // We create a listener channel to receive real-time terminal output from yt-dlp
  const onProgress = new Channel();
  onProgress.onmessage = (msg) => {
    // Extract the percentage using a regex (e.g., "[download]  15.3% of...")
    const match = msg.match(/\[download\]\s+([\d\.]+)%/);
    if (match) {
      const percent = parseFloat(match[1]);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${Math.floor(percent)}%`;
    }
  };
  
  try {
    // We send BOTH the url and the downloadPath to the Rust side
    await invoke("download_video", { url, downloadPath: selectedPath, onProgress });
    statusMsg.textContent = "✅ Download Complete! Open folder ➔";
    statusMsg.style.color = "#00d2ff";
    progressBar.style.width = "100%"; // Fill bar on success
    progressText.style.display = "none"; // Hide percentage when finished
    openFolderBtn.style.display = "flex";
  } catch (err) {
    statusMsg.textContent = "❌ " + err;
    statusMsg.style.color = "#ff4d4d";
    progressBar.style.width = "0%"; // Empty bar on failure
    progressText.style.display = "none";
  }
}

document.querySelector("#folder-btn").onclick = selectFolder;
document.querySelector("#download-btn").onclick = startDownload;

document.querySelector("#reset-btn").onclick = () => {
  document.querySelector("#url-input").value = "";
  const statusMsg = document.querySelector("#status-msg");
  statusMsg.textContent = "Waiting for input...";
  statusMsg.style.color = "#f6f6f6";
  document.querySelector("#progress-bar").style.width = "0%";
  document.querySelector("#progress-text").style.display = "none";
  document.querySelector("#open-folder-btn").style.display = "none";
};

document.querySelector("#open-folder-btn").onclick = async () => {
  try {
    await invoke("open_folder", { path: selectedPath });
  } catch (err) {
    console.error("Could not open folder:", err);
  }
};

async function openNewInstance() {
  try {
    await invoke("open_new_instance");
  } catch (err) {
    console.error("Could not open new instance:", err);
  }
}

document.querySelector("#new-instance-btn").onclick = openNewInstance;

document.querySelector("#close-btn").onclick = async () => {
  await getCurrentWindow().close();
};

// Explicitly tell the window to drag when the drag region is clicked
document.querySelector(".header-bar").addEventListener("mousedown", async (e) => {
  // Only drag if left-clicking (buttons === 1) on a designated drag area (not the close buttons)
  if (e.buttons === 1 && e.target.hasAttribute("data-tauri-drag-region")) {
    await getCurrentWindow().startDragging();
  }
});

// Global event listener for Shift+Click
window.addEventListener("click", (e) => {
  // Ignore if clicking inside a text input (so users can still use Shift+Click to highlight text)
  if (e.shiftKey && e.target.tagName !== "INPUT") {
    // Prevent normal UI actions (like trying to download) when shift clicking
    e.preventDefault();
    e.stopPropagation(); 
    openNewInstance();
  }
}, { capture: true }); // Capture phase ensures we intercept the click before buttons process it