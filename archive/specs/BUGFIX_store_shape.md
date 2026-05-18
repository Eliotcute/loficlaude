# LoFiClaude — Bug Fix: store_invalid_shape (页面空白)

## 根因

所有组件（7 个文件）使用了错误的 Svelte store 自动订阅模式。

`src/stores/appState.js` 中 `scene`, `player`, `rain`, `timer`, `claude`, `ui` 是**普通对象**（包含嵌套 writable stores），不是 store 本身。但组件中用 `$scene.current`、`$player.isPlaying` 等语法，Svelte 尝试对普通对象调用 `.subscribe()` 失败，导致整个 app 不渲染。

## 修复方案

每个组件中，把嵌套的 store 解构为局部变量，再使用 `$` 前缀。

## 受影响文件（7 个）

1. `src/canvas/CanvasEngine.svelte`
   - `scene` → `const currentScene = scene.current; const sceneTransition = scene.transitionProgress;`
   - `claude` → `const claudeMood = claude.mood;`
   - `rain` → `const rainVolume = rain.volume;`
   - 把 `$scene.current` 替换为 `$currentScene`，`$claude.mood` 替换为 `$claudeMood`，`$rain.volume` 替换为 `$rainVolume`
   - `scene.transitionProgress.set(...)` 替换为 `sceneTransition.set(...)`

2. `src/App.svelte`
   - 解构 `player` → `const playerIsPlaying = player.isPlaying;` 等
   - 修所有 `$player.isPlaying` → `$playerIsPlaying`，`$scene.current` → `$currentScene`，`$rain.volume` → `$rainVolume` 等

3. `src/components/AmbientHeader.svelte`
   - 解构 `scene.current` → `const currentScene = scene.current;` 等
   - 修 `$scene.current` → `$currentScene`

4. `src/components/MiniPlayer.svelte`
   - 解构 `player.currentTrackTitle` → `const trackTitle = player.currentTrackTitle;` 等
   - 修所有 `$player.xxx` → `$trackTitle`

5. `src/components/RainPopover.svelte`
   - 解构 `rain.volume`, `rain.type` 等
   - 修所有 `$rain.xxx`

6. `src/components/ScenePopover.svelte`
   - 解构 `scene.current`, `scene.locked`
   - 修 `$scene.current`, `$scene.locked`

7. `src/components/TimerPopover.svelte`
   - 解构 `timer.active`, `timer.minutes`
   - 修 `$timer.xxx`

## 修复后验收
- [ ] `npm run dev` 打开页面能看到 "Click to start 🎵"
- [ ] 没有 `store_invalid_shape` 错误
- [ ] `npm run build` 通过
