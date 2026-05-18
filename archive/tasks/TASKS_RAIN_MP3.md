# 任务：下载雨声 MP3 文件

需要下载 3 个 CC0 雨声音频到 `public/` 目录。

## 素材来源

1. **rain-light.mp3** — "Rain on Window" (轻柔雨声)
   - 来源：https://pixabay.com/zh/sound-effects/rain-on-window-77620/
   - Pixabay CC0 免费

2. **rain-medium.mp3** — "Raining" (中等雨声)
   - 来源：https://pixabay.com/zh/sound-effects/raining-40318/
   - Pixabay CC0 免费

3. **rain-heavy.mp3** — "Rain Loop" (大雨/雷雨)
   - 来源：https://pixabay.com/zh/sound-effects/rain-on-window-77620/ 或
   - 备用：https://dev.creazilla.com/media/audio/15488823/rain-loop

## 方法

从 Pixabay 页面获取实际的 CDN 下载链接（页面里有一个 download button，链接类似 `https://cdn.pixabay.com/download/audio/...`）。用 curl 或 Python requests 获取正确文件。

也可以用 Freesound API 搜索 CC0 rain 音效。

## 验收

- `public/rain-light.mp3` 是真实 MP3 文件（file 命令显示 Audio file）
- `public/rain-medium.mp3` 是真实 MP3 文件
- `public/rain-heavy.mp3` 是真实 MP3 文件
- npm run build 通过
