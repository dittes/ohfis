# FFmpeg (WebAssembly) for the video tools

- `index.js`, `classes.js`, `worker.js`, … : `@ffmpeg/ffmpeg` 0.12.10 (MIT), the JavaScript wrapper.
- `core/ffmpeg-core.js`, `core/ffmpeg-core.wasm` : `@ffmpeg/core` 0.12.6 (single-thread build of FFmpeg 5.1.4).

The WebAssembly core contains FFmpeg and encoders such as x264, libvpx, LAME and Opus. FFmpeg is licensed under
LGPL/GPL (the build with x264 is GPL-2.0-or-later). Source code and licence texts:
FFmpeg https://ffmpeg.org · x264 https://www.videolan.org/developers/x264.html · ffmpeg.wasm https://github.com/ffmpegwasm/ffmpeg.wasm.
The core is loaded only when a video tool is used. Files are processed in the browser and never uploaded.
