# 📥 JMS Universal Video Downloader

A fast, lightweight, and modern desktop application for downloading videos from YouTube, Facebook, TikTok, and more. Built with **Tauri 2.0**, **Rust**, and **Vanilla JavaScript** for maximum performance and a tiny footprint.

![JMS Downloader Screenshot](image_3fb6e3.png)

## ✨ Features
- **Modern UI**: Clean, dark-themed interface with zero-clutter.
- **Universal Support**: Uses `yt-dlp` under the hood, allowing downloads from over 1,000 sites including YouTube, Facebook, Instagram, and Twitter/X.
- **Custom Location**: Select your preferred download folder via native Windows dialogs.
- **Asynchronous**: Downloads run in the background without freezing the UI.
- **Ultra Lightweight**: Built with Rust, keeping resource usage to a minimum.
- **Audio & Video Transcription**: Converts speech from audio/video files to text using whisper.cpp with multiple model sizes (Base, Small, Medium).
- **Multi-format Support**: Accepts MP3, WAV, M4A, FLAC, OGG, MP4, MKV, AVI, MOV, and more for transcription.
- **Offline Mode**: Once the whisper model is downloaded, transcription works completely offline.
- **Cookie Integration**: Bypass login walls on Facebook, Instagram, and other sites using browser cookies.

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Rust (Tauri 2.0 Framework)
- **Dependencies**: `tauri-plugin-shell`, `tauri-plugin-dialog`, `yt-dlp` (as a sidecar)

## 🚀 Getting Started

### Prerequisites
- [Rust & Cargo](https://www.rust-lang.org/tools/install)
- [Node.js & npm](https://nodejs.org/)
- Sidecar binaries placed in `src-tauri/binaries/`:
  - `yt-dlp-x86_64-pc-windows-msvc.exe`
  - `ffmpeg-x86_64-pc-windows-msvc.exe`
  - `whisper-x86_64-pc-windows-msvc.exe`
  - `whisper.dll`, `ggml.dll`, `ggml-base.dll`, `ggml-cpu-x64.dll`

### Installation & Development
1. Clone the repository:
   ```bash
   git clone https://github.com/JMS-tesoy/JMS-YTDL.git
   cd JMS-YTDL
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode (with hot-reload):
   ```bash
   npm run tauri dev
   ```

### Building for Production
To bundle the application into a standalone `.exe` installer:
```bash
npm run tauri build
```
The installer will be output to `src-tauri/target/release/bundle/`.

## 💻 Developer Command Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install all npm dependencies (run first time only) |
| `npm run tauri dev` | Build and run in development mode with hot-reload |
| `npm run tauri build` | Create a production build/installer |
| `npm run tauri add <plugin>` | Add a Tauri plugin (e.g., `shell`, `dialog`) |
| `cargo check` | Check Rust code for errors (faster than full build) |
| `cargo build` | Build only the Rust backend |
| `cargo clean` | Clean Rust build artifacts to force a fresh rebuild |

### Troubleshooting Builds
- **Sidecar not found**: Ensure all binaries and DLLs listed in Prerequisites exist in `src-tauri/binaries/` with the exact filenames.
- **Cargo build errors**: Run `cargo clean` then rebuild to clear cached artifacts.
- **Outdated yt-dlp**: The app can self-update yt-dlp via the UI, or replace the binary manually.
