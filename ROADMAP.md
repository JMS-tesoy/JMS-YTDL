# 🗺️ JMS Universal Video Downloader — Future Roadmap

## Planned Features

### 1. Vocal & Instrumental Separation (AI Stem Splitter)
- **Goal**: Extract vocals, drums, bass, and instrumental tracks from any song.
- **Tech**: Integrate `demucs` (Meta's AI source separator) or `spleeter` as a sidecar binary.
- **UI**: Add a "Stem Separation" section similar to the transcriber panel, letting users select which stems to export.
- **Output**: Separate WAV/MP3 files for vocals, instrumental, drums, and bass.
- **Challenge**: Demucs models are large (~80MB for the smallest) and processing takes 1-3 minutes per song on CPU.
- **Status**: 📋 Planned

### 2. Batch Download Queue
- **Goal**: Paste multiple URLs and download them sequentially or in parallel.
- **UI**: Queue list with pause/resume/cancel per item, overall progress summary.
- **Status**: 📋 Planned

### 3. Download Scheduler
- **Goal**: Schedule downloads for a specific time (e.g., overnight).
- **Status**: 📋 Planned

### 4. Playlist & Channel Support
- **Goal**: Download entire YouTube playlists or channels with a single click.
- **UI**: Toggle between single video and playlist/channel mode.
- **Status**: 📋 Planned

### 5. Format Converter
- **Goal**: Convert downloaded files between formats (MP4→MP3, MKV→MP4, etc.).
- **Tech**: Already have FFmpeg bundled, just needs UI.
- **Status**: 📋 Planned

### 6. Built-in Media Player
- **Goal**: Preview downloaded videos/audio directly in the app.
- **Status**: 📋 Planned

### 7. Subtitle Download
- **Goal**: Download subtitles/closed captions alongside videos.
- **Status**: 📋 Planned

### 8. Dark/Light Theme Toggle
- **Goal**: Let users switch between dark and light modes.
- **Status**: 📋 Planned

### 9. Cross-Platform Support
- **Goal**: Build for macOS and Linux in addition to Windows.
- **Challenge**: Sidecar binaries must be compiled per platform.
- **Status**: 📋 Planned

### 10. Auto-Update for the App Itself
- **Goal**: Check for new versions and auto-update the Tauri app (not just yt-dlp).
- **Tech**: Use Tauri's updater plugin.
- **Status**: 📋 Planned

---

## Recently Completed ✅

- ✅ Audio & Video Transcription (whisper.cpp integration)
- ✅ Multi-model support (Base/Small/Medium whisper models)
- ✅ Smooth expand/collapse UI for transcription panel
- ✅ Auto-resize window when panel expands
- ✅ Refresh/reset button for transcription fields
- ✅ Debug output filtering for clean transcripts
- ✅ Scrollbar hidden for clean UI
- ✅ DLL resolution for whisper binary in dev & production

---

*Last updated: June 21, 2026*