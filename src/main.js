const { invoke, Channel } = window.__TAURI__.core;
const { open } = window.__TAURI__.dialog;
const { downloadDir } = window.__TAURI__.path;
const { getCurrentWindow } = window.__TAURI__.window;

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
  const quality = document.querySelector("#quality-select").value;
  const cookies = document.querySelector("#cookie-select").value;
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

  const onProgress = new Channel();
  onProgress.onmessage = (msg) => {
    const match = msg.match(/\[download\]\s+([\d\.]+)%/);
    if (match) {
      const percent = parseFloat(match[1]);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${Math.floor(percent)}%`;
    }
  };
  
  try {
    await invoke("download_video", { url, downloadPath: selectedPath, quality, cookies, onProgress });
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
  document.querySelector("#quality-select").value = "best";
  document.querySelector("#cookie-select").value = "none";
  const statusMsg = document.querySelector("#status-msg");
  statusMsg.textContent = "Waiting for input...";
  statusMsg.style.color = "#f6f6f6";
  document.querySelector("#progress-bar").style.width = "0%";
  document.querySelector("#progress-text").style.display = "none";
  document.querySelector("#open-folder-btn").style.display = "none";
  document.querySelector("#cookie-warning").style.display = "none";
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

document.querySelector("#cookie-select").addEventListener("change", (e) => {
  const warning = document.querySelector("#cookie-warning");
  if (e.target.value === "chrome" || e.target.value === "edge") {
    warning.style.display = "block";
  } else {
    warning.style.display = "none";
  }
});

document.querySelector("#new-instance-btn").onclick = openNewInstance;

document.querySelector("#update-btn").onclick = async () => {
  const btn = document.querySelector("#update-btn");
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ Updating Engine...";
  btn.disabled = true;

  try {
    const result = await invoke("update_engine");
    showToast(true);
  } catch (err) {
    showToast(false);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

document.querySelector("#close-btn").onclick = async () => {
  await getCurrentWindow().close();
};

document.querySelector("#minimize-btn").onclick = async () => {
  await getCurrentWindow().minimize();
};

let isPinned = false;
document.querySelector("#pin-btn").onclick = async () => {
  isPinned = !isPinned;
  await getCurrentWindow().setAlwaysOnTop(isPinned);
  document.querySelector("#pin-btn").classList.toggle("pinned", isPinned);
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

// Reveal the window only after the HTML and CSS have completely loaded
window.addEventListener("DOMContentLoaded", async () => {
  await getCurrentWindow().show();
});

function showToast(isSuccess) {
  const toast = document.getElementById("toast-notification");
  toast.className = ""; // Reset all classes
  void toast.offsetWidth; // Force a DOM reflow to cleanly restart the animation
  
  toast.textContent = isSuccess ? "Engine Updated" : "Update Failed";
  toast.classList.add("show", isSuccess ? "success" : "error");
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500); // Hide after 3.5 seconds
}

// ═══════════════════════════════════════════
//  TRANSCRIPTION LOGIC
// ═══════════════════════════════════════════

let selectedMediaPath = "";
let isTranscribing = false;

// ── Reset transcription fields ──
document.querySelector("#transcribe-reset-btn").addEventListener("click", () => {
  selectedMediaPath = "";
  document.querySelector("#media-path-display").value = "";
  document.querySelector("#language-select").value = "auto";
  document.querySelector("#transcribe-status").textContent = "";
  document.querySelector("#transcribe-progress-bar").style.width = "0%";
  document.querySelector("#transcript-output").value = "";
  document.querySelector("#transcript-output-container").style.display = "none";
});

// ── Toggle section visibility ──
document.querySelector("#toggle-transcribe").addEventListener("click", async () => {
  const section = document.querySelector("#transcribe-section");
  const chevron = document.querySelector("#toggle-chevron");
  const isExpanded = section.classList.contains("expanded");
  const currentWindow = getCurrentWindow();

  if (!isExpanded) {
    section.classList.add("expanded");
    chevron.style.transform = "rotate(180deg)";
    checkModelStatus();
    // Grow the window to fit the expanded panel
    try {
      const currentSize = await currentWindow.innerSize();
      const newHeight = Math.max(currentSize.height, 900);
      await currentWindow.setSize({ width: currentSize.width, height: newHeight });
    } catch (_) {
      // setSize might fail if user is resizing, that's fine
    }
  } else {
    section.classList.remove("expanded");
    chevron.style.transform = "rotate(0deg)";
    // Shrink the window back to default
    try {
      const currentSize = await currentWindow.innerSize();
      if (currentSize.height > 750) {
        await currentWindow.setSize({ width: currentSize.width, height: 700 });
      }
    } catch (_) {}
  }
});

// ── Get selected model size ──
function getModelSize() {
  return document.querySelector("#model-size-select").value;
}

// ── Check if whisper model exists ──
async function checkModelStatus() {
  const statusEl = document.querySelector("#model-status-text");
  const downloadBtn = document.querySelector("#download-model-btn");
  const statusBadge = document.querySelector("#model-status");
  const modelSize = getModelSize();
  const sizeLabels = { base: "142 MB", small: "466 MB", medium: "1.5 GB" };
  try {
    await invoke("check_whisper_model", { modelSize });
    statusEl.textContent = `✅ ${modelSize} Model Ready`;
    statusBadge.className = "model-status-badge ready";
    downloadBtn.style.display = "none";
  } catch (e) {
    statusEl.textContent = `❌ ${modelSize} Model Not Found`;
    statusBadge.className = "model-status-badge missing";
    downloadBtn.style.display = "inline-block";
  }
}

// ── Model size change → re-check status ──
document.querySelector("#model-size-select").addEventListener("change", () => {
  checkModelStatus();
});

// ── Download whisper model ──
document.querySelector("#download-model-btn").addEventListener("click", async () => {
  const downloadBtn = document.querySelector("#download-model-btn");
  const statusEl = document.querySelector("#model-status-text");
  const statusBadge = document.querySelector("#model-status");
  const progressBar = document.querySelector("#transcribe-progress-bar");
  const statusMsg = document.querySelector("#transcribe-status");
  const modelSize = getModelSize();
  const sizeLabels = { base: "142 MB", small: "466 MB", medium: "1.5 GB" };

  downloadBtn.disabled = true;
  downloadBtn.textContent = "⏳ Downloading...";
  statusBadge.className = "model-status-badge downloading";
  progressBar.style.width = "0%";

  const onProgress = new Channel();
  onProgress.onmessage = (msg) => {
    const match = msg.match(/Downloading model...\s+(\d+)%/);
    if (match) {
      const pct = parseInt(match[1]);
      progressBar.style.width = `${pct}%`;
      statusEl.textContent = `⬇ Downloading ${modelSize} model... ${pct}%`;
      statusMsg.textContent = `Model is ~${sizeLabels[modelSize] || "?"}. Please wait...`;
    } else if (msg === "Download complete!") {
      progressBar.style.width = "100%";
      statusEl.textContent = `✅ ${modelSize} Model Ready`;
      statusBadge.className = "model-status-badge ready";
      statusMsg.textContent = "";
      downloadBtn.style.display = "none";
    }
  };

  try {
    await invoke("download_whisper_model", { modelSize, onProgress });
    progressBar.style.width = "100%";
    statusEl.textContent = `✅ ${modelSize} Model Ready`;
    statusBadge.className = "model-status-badge ready";
    statusMsg.textContent = "";
    downloadBtn.style.display = "none";
  } catch (err) {
    statusEl.textContent = "❌ Download Failed";
    statusBadge.className = "model-status-badge missing";
    statusMsg.textContent = "Error: " + err;
    progressBar.style.width = "0%";
    downloadBtn.textContent = "⬇ Download Model";
    downloadBtn.disabled = false;
  }
});

// ── Select media file (audio or video) ──
document.querySelector("#media-file-btn").addEventListener("click", async () => {
  const result = await open({
    multiple: false,
    title: "Select Audio or Video File",
    filters: [
      { name: "Audio & Video Files", extensions: ["mp3", "wav", "m4a", "flac", "ogg", "opus", "aac", "wma", "aiff", "webm", "mp4", "mkv", "avi", "mov", "wmv", "flv", "m4v", "3gp"] }
    ]
  });
  if (result) {
    selectedMediaPath = result;
    document.querySelector("#media-path-display").value = selectedMediaPath;
  }
});

// ── Start transcription ──
document.querySelector("#transcribe-btn").addEventListener("click", async () => {
  if (isTranscribing) return;
  if (!selectedMediaPath) return alert("Please select an audio or video file first!");

  const language = document.querySelector("#language-select").value;
  const statusMsg = document.querySelector("#transcribe-status");
  const progressBar = document.querySelector("#transcribe-progress-bar");
  const outputContainer = document.querySelector("#transcript-output-container");
  const outputArea = document.querySelector("#transcript-output");
  const transcribeBtn = document.querySelector("#transcribe-btn");

  isTranscribing = true;
  transcribeBtn.style.opacity = "0.5";
  statusMsg.textContent = "Starting transcription...";
  statusMsg.style.color = "#f6f6f6";
  progressBar.style.width = "0%";
  outputContainer.style.display = "none";
  outputArea.value = "";

  const onProgress = new Channel();
  onProgress.onmessage = (msg) => {
    if (msg === "Converting audio to 16kHz WAV...") {
      statusMsg.textContent = "🔧 Converting audio...";
      progressBar.style.width = "10%";
    } else if (msg === "Running transcription with whisper...") {
      statusMsg.textContent = "🎙️ Transcribing...";
      progressBar.style.width = "30%";
    } else if (msg.trim()) {
      // Skip whisper debug/progress lines (typically start with whisper_ or contain timing info)
      const trimmed = msg.trim();
      const isDebugLine =
        trimmed.startsWith("whisper_") ||
        trimmed.startsWith("system_info") ||
        /^\s*\[\d{2}:\d{2}:\d{2}\.\d{3}/.test(trimmed) ||
        /^\s*-->\s*\[\d{2}:\d{2}/.test(trimmed) ||
        trimmed.startsWith("main:") ||
        trimmed.startsWith("whisper_init") ||
        trimmed.includes("processing") ||
        trimmed.includes("sampling");
      if (!isDebugLine) {
        // Actual transcript text
        outputArea.value += msg;
        outputContainer.style.display = "block";
        outputArea.scrollTop = outputArea.scrollHeight;
      }
    }
  };

  try {
    const result = await invoke("transcribe_audio", {
      audioPath: selectedMediaPath,
      language,
      modelSize: getModelSize(),
      onProgress
    });
    outputArea.value = result;
    outputContainer.style.display = "block";
    progressBar.style.width = "100%";
    statusMsg.textContent = "✅ Transcription Complete!";
    statusMsg.style.color = "#00d2ff";
  } catch (err) {
    statusMsg.textContent = "❌ " + err;
    statusMsg.style.color = "#ff4d4d";
    progressBar.style.width = "0%";
  } finally {
    isTranscribing = false;
    transcribeBtn.style.opacity = "1";
  }
});

// ── Copy transcript to clipboard ──
document.querySelector("#copy-transcript-btn").addEventListener("click", async () => {
  const text = document.querySelector("#transcript-output").value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.querySelector("#copy-transcript-btn");
    const original = btn.innerHTML;
    btn.innerHTML = "✅ Copied!";
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  } catch (err) {
    alert("Failed to copy: " + err);
  }
});

// ── Save transcript as .txt ──
document.querySelector("#save-transcript-btn").addEventListener("click", async () => {
  const text = document.querySelector("#transcript-output").value;
  if (!text) return alert("Nothing to save!");

  const { save } = window.__TAURI__.dialog;
  const filePath = await save({
    defaultPath: "transcript.txt",
    title: "Save Transcript",
    filters: [{ name: "Text Files", extensions: ["txt"] }]
  });
  if (filePath) {
    try {
      await invoke("save_text_file", { path: filePath, content: text });
      const btn = document.querySelector("#save-transcript-btn");
      const original = btn.innerHTML;
      btn.innerHTML = "✅ Saved!";
      setTimeout(() => { btn.innerHTML = original; }, 1500);
    } catch (err) {
      alert("Failed to save: " + err);
    }
  }
});
