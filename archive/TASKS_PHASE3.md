# LoFiClaude — Phase 3：音频 + 控件

## 目标

lofi 可播、雨声可调、所有 popover 控件可展开收起

## 文件

### 1. src/audio/YouTubePlayer.js
YouTube iframe API 封装，歌单：
```
{ id: 'jfKfPfyJRdk', name: 'Lofi Girl - beats to relax' }
{ id: 'YmQ7jRgf4f0', name: 'Claude FM' }
{ id: '5yx6BWlEVcY', name: 'Chillhop Radio' }
```
- loadTrack(index) 切换歌曲
- play() / pause() / setVolume(v)
- onError 自动跳过下一首
- onStateChange 同步 store player.isPlaying

### 2. src/audio/RainPlayer.js
Howler.js 封装，支持三种雨声强度 light / medium / heavy
- loadType(type) 切换雨声文件
- setVolume(v) 0-100
- fadeOut(ms) 淡出
- 文件位置：public/rain-light.mp3, rain-medium.mp3, rain-heavy.mp3

### 3. src/components/ExpandedPlayer.svelte
点击 mini player 后展开：
```
┌──────────────────────────────────────────────┐
│ lofi hip hop radio - beats to relax          │
│                                              │
│ ◄                  ❚❚                  ►    │
└──────────────────────────────────────────────┘
```
关闭：点击外部 / Esc / 鼠标离开 3 秒

### 4. src/components/RainPopover.svelte
```
┌────────────────────┐
│ RAIN               │
│ light medium heavy │
│ ───────●──── 60%   │
└────────────────────┘
```
点击 mini player 中 🌧60 展开

### 5. src/components/TimerPopover.svelte
```
┌─────────┐
│ TIMER   │
│ 25 min  │
│ 45 min  │
│ 60 min  │
│ Off     │
└─────────┘
```
点击右上 timer 展开

### 6. src/components/ScenePopover.svelte
```
┌────────────┐
│ SCENE      │
│ 🌙 Night   │
│ 🌧 Rain    │
│ ⭐ Stars   │
│ 🔒 Lock    │
└────────────┘
```
点击左上场景图标展开

## Popover 规范
- 点击外部关闭 / Esc / 5 秒无操作关闭
- 样式：background: rgba(8,10,12,0.72), border 1px solid rgba(212,165,116,0.3), backdrop-filter blur(10px), border-radius 8px
- 120ms fade + slight move 动画

## 验收标准
- [ ] YouTube 流可播放，可切歌
- [ ] 雨声可调音量，可切换 light/medium/heavy
- [ ] 点击 mini player 展开控制
- [ ] Rain/Timer/Scene popover 可正常展开收起
- [ ] npm run build 通过
