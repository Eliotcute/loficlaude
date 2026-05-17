# LoFiClaude

一个沉浸式像素 lofi 氛围房间。

## 快速开始
```bash
npm install
npm run dev
```

## 快捷键
Space 播放/暂停 | ←→ 切歌 | ↑↓ 雨声 | M 静音  
1/2/3 切换场景 | T 定时 | H 快捷键提示 | Esc 关闭面板

## 音频素材
雨声文件需要放在 `public/` 目录：
- `rain-light.mp3`
- `rain-medium.mp3`
- `rain-heavy.mp3`

## Pexels API（可选）
注册 https://www.pexels.com/api/ 获取免费 API Key。  
在项目根目录创建 `.env` 文件：

```bash
VITE_PEXELS_API_KEY=your_key_here
```

未配置 API Key 时，应用会优先尝试本地背景视频：
- `public/backgrounds/lofi-room.mp4`
- `public/backgrounds/rain-city.mp4`
- `public/backgrounds/dotted-space.mp4`

如果本地背景视频也不存在，会自动回退到纯 Canvas 背景渲染。

## ⚠️ API Key 安全警告
`VITE_ANTHROPIC_API_KEY` 会打包到前端代码中。  
仅限本地开发使用，不要部署到公开站点。  
无 API Key 时回退到本地预设句子。
