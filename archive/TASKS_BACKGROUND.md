# 任务：BackgroundVideo 组件 + Pexels API

## 背景

LoFiClaude 需要动态背景层（类似 lofi.cafe 的风格），放在 Canvas 之下作为基础氛围。

## 实现

### 1. src/components/BackgroundVideo.svelte

支持三种背景模式，优先级从高到低：

**模式 A：Pexels API 视频搜索**
- 读取 `import.meta.env.VITE_PEXELS_API_KEY`
- 如果 Key 存在，调用 `https://api.pexels.com/videos/search?query=KEYWORD&per_page=1`
- 关键词根据当前场景 `scene.current` 映射：
  - `lofiNight` → "lofi room night cozy animation"
  - `softRain` → "rainy night window city"
  - `starDrift` → "night sky stars timelapse"
- 从返回结果的 `video_files` 中选 `quality: "hd"` 或 `"sd"` 的 MP4 链接
- 用 `<video>` 元素播放（muted, loop, autoplay, playsinline）
- 加暗色遮罩滤镜：`filter: brightness(0.55) contrast(0.95)` + overlay gradient

**模式 B：本地文件 fallback**
- 如果无 API Key 或 API 请求失败，尝试加载本地视频：
  - `public/backgrounds/lofi-room.mp4`
  - `public/backgrounds/rain-city.mp4`
  - `public/backgrounds/dotted-space.mp4`

**模式 C：纯 Canvas fallback**
- 如果视频都不可用，设置 `fallbackToCanvas = true` 事件供父组件判断
- 父组件可据此决定是否显示 CanvasEngine 作为全量背景

### 2. 在 App.svelte 中集成

在 CanvasEngine 之前插入 BackgroundVideo：
```svelte
<BackgroundVideo {scene} on:fallback={(e) => handleFallback(e.detail)} />
<CanvasEngine ... />
```

视频背景时：Canvas 只渲染 overlay 粒子（雨/星星），不渲染全量背景
Canvas fallback 时：Canvas 渲染完整 5 层场景

### 3. 环境变量

在 README 中加入：
```
## Pexels API（可选）
注册 https://www.pexels.com/api/ 获取免费 API Key
在项目根目录创建 .env 文件：
VITE_PEXELS_API_KEY=your_key_here
```

## 验收标准

- [ ] 有 API Key 时，页面背景显示 Pexels 搜索到的视频
- [ ] 无 API Key 时，优雅降级（现有 Canvas 继续工作）
- [ ] 场景切换时，背景视频平滑过渡
- [ ] 视频上方有暗色遮罩保证 UI 可读
- [ ] npm run build 通过
