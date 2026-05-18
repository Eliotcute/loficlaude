# Phase 3 剩余工作

以下文件已部分修改，需要补完：

## 1. App.svelte
- 已添加 `const claudeMode = claude.mode;`
- 需要把 `<AsciiBackground scene={$currentScene} rainVolume={$rainVolume} />`
  改为 `<AsciiBackground scene={$currentScene} rainVolume={$rainVolume} working={$claudeMode === 'working'} />`

## 2. AsciiBackground.svelte
- 已添加 `export let working = false;` 和 `class:working`
- 需要确认 CSS `.working .ascii-background { filter: brightness(1.08) ... }` 存在

## 3. 验证
- npm run build 通过
