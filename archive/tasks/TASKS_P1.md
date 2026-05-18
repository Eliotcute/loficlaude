# LoFiClaude — P1 任务：场景轮播 + Drawer + 拆分 + README

按优先级执行以下 4 个任务。雨声 MP3 和 API 安全最后单独处理。

---

## 任务 1：场景自动轮播

**文件**：`src/App.svelte`

在 `idleInterval`（约 475 行附近）中补充自动场景轮播逻辑：

- 每 5 分钟自动切换到下一个场景（lofiNight → softRain → starDrift → lofiNight）
- 如果 `$scene.locked` 为 true，停止自动轮播
- 用户手动切换场景后，重置 5 分钟计时器
- Claude 在场景切换时可以冒泡评论一句

## 任务 2：播放器 Drawer 两态

**文件**：`src/components/ExpandedPlayer.svelte`（重构）

改为 collapsed / expanded 两态 drawer：

**Collapsed（默认 48-56px）**：
```
┌────────────────────────────────────┐
│ Claude FM                 ❚❚  🌧60 │
└────────────────────────────────────┘
```

**Expanded（180-220px，点击/上拉展开）**：
```
┌────────────────────────────────────┐
│ NOW PLAYING                        │
│ lofi hip hop radio                 │
│                                    │
│        ◀      ❚❚      ▶            │
│                                    │
│ RAIN     light medium heavy        │
│          ─────────●──── 60%        │
│                                    │
│ TIMER    25  45  60  off           │
└────────────────────────────────────┘
```

展开触发：点击 mini bar / 上拉手势
收起触发：Esc / 点击背景 / 5 秒无操作

样式约束：
```css
background: rgba(8, 10, 12, 0.72);
border: 1px solid rgba(212, 165, 116, 0.28);
backdrop-filter: blur(12px);
border-radius: 12px;
```

## 任务 3：App.svelte 拆分

**目标**：当前 570 行 → 拆分为独立模块，主 App.svelte 只做编排。

创建 `src/utils/` 目录，从 App.svelte 中提取：

1. `src/utils/keyboard.js` — 所有快捷键处理器，导出 `setupKeyboardShortcuts(callbacks)`
2. `src/utils/session.js` — timer 倒计时 + idle 检测逻辑
3. `src/utils/audioInit.js` — YouTube + Rain 初始化，导出 `initAudio()`
4. `src/utils/claudeOrch.js` — Claude 交互编排（气泡、面板、API 调用）

拆分后 App.svelte 的 onMount 简化为：
```js
onMount(() => {
  restoreState();
  setupKeyboardShortcuts({...});
  initAudio();
  startIdleTimer();
  startSceneRotation();
});
```

## 任务 4：README 更新

重写 `README.md`，包含：

```markdown
# LoFiClaude

一个沉浸式像素 lofi 氛围房间。

## 快速开始
npm install
npm run dev

## 快捷键
Space 播放/暂停 | ←→ 切歌 | ↑↓ 雨声 | M 静音
1/2/3 切换场景 | T 定时 | H 快捷键提示 | Esc 关闭面板

## 音频素材
雨声文件需要放在 public/ 目录：
- rain-light.mp3
- rain-medium.mp3
- rain-heavy.mp3

## ⚠️ API Key 安全警告
VITE_ANTHROPIC_API_KEY 会打包到前端代码中。
仅限本地开发使用，不要部署到公开站点。
无 API Key 时回退到本地预设句子。
```

## 验收标准
- [ ] 场景每隔 5 分钟自动轮换
- [ ] scene.locked 时停止自动轮换
- [ ] 播放器默认 collapsed 不高于 56px
- [ ] 点击展开完整控制 180-220px
- [ ] Esc / 点击外部收起
- [ ] App.svelte 拆分后主文件明显精简
- [ ] README 反映产品信息
- [ ] npm run build 通过
