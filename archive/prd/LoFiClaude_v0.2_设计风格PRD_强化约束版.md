# LoFiClaude v0.2 — 设计风格 PRD（强化约束版）

> 版本：v0.2  
> 类型：Design Style PRD / Visual System / Interaction Spec  
> 核心目标：把 LoFiClaude 从“音乐播放器 UI”收敛成“低干扰的 lofi ambient room”  
> 设计原则：**Less player, more place. Less menu, more mood. Less chat app, more companion.**

---

## 0. Design North Star

LoFiClaude 的默认界面应该像一个正在播放音乐的夜晚屏保。

用户不操作时，它应该几乎不提醒自己是一个 app。  
用户需要时，控件才轻轻浮现。  
Claude 不是功能按钮，而是这个空间里的住客。

最终体验应该是：

> **一个黑夜里安静播放 lofi 的像素小空间，Claude 戴着耳机陪你待着。**

---

## 1. 低干扰硬规则

低干扰不是审美建议，而是产品规则。任何 UI 设计、组件新增、交互修改，都必须满足以下约束。

### 1.1 默认态可见信息限制

默认状态下，用户 3 秒内只能看到以下内容：

1. 背景氛围
2. Claude 小人
3. 当前播放信息
4. 雨声状态
5. Timer 状态

其他所有功能必须隐藏在以下入口之后：

- 点击
- hover
- 快捷键
- Claude 气泡
- popover

禁止在默认态展示完整设置菜单、底部 tab bar、大型播放器卡片或大面积说明文字。

---

### 1.2 默认态按钮数量限制

默认界面中同时可见的可点击按钮不超过 **6 个**。

推荐默认可见交互点：

| 交互点 | 说明 |
|---|---|
| Claude 小人 | 对话入口 |
| 播放 / 暂停 | mini player 中心 |
| 上一首 | 可选，低亮显示 |
| 下一首 | 可选，低亮显示 |
| 雨声状态 | 点击展开 rain popover |
| Timer 状态 | 点击展开 timer popover |

如按钮数量超过 6 个，必须折叠到 popover 或快捷键中。

---

### 1.3 面积占比限制

| 元素 | 最大占屏比例 |
|---|---:|
| 背景 Canvas | 至少 80% |
| 底部 mini player | 不超过高度 10% |
| popover | 不超过宽度 320px |
| Claude 气泡 | 不超过 280px 宽，2 行文字以内 |
| 对话面板 | 不超过 340px × 360px |
| 常驻 UI 总面积 | 不超过屏幕面积 15% |

任何常驻 UI 如果超过这些限制，都需要改成临时展开态。

---

### 1.4 禁止项

以下设计在 v0.2 中禁止出现：

- 大面积白色播放器卡片
- 底部 tab bar
- 完整底部导航菜单
- 厚重按钮组
- 大面积专辑封面
- 默认展开的聊天面板
- 默认展开的设置面板
- 高饱和渐变
- 复杂图标组
- 类 Spotify / Calm / 冥想 App 的播放器 UI
- 需要用户持续管理的 dashboard 式布局

---

## 2. 信息层级优先级

LoFiClaude 的视觉层级必须按以下顺序排列：

```text
P0 背景氛围：占据 70% 以上注意力
P1 Claude 小人：唯一高饱和角色
P2 当前播放 / timer / rain 状态
P3 可操作控件
P4 说明文字 / 快捷键 / 辅助信息
```

### 2.1 设计含义

- 背景永远是主角，不允许被 UI 遮挡过多。
- Claude 是唯一明显的高饱和角色色块。
- 播放、雨声、timer 只是状态，不应该像主要功能模块。
- 控件默认低亮，hover 或点击后才变清楚。
- 说明文字只出现在原型图、首次引导或快捷键面板中。

---

## 3. 产品体验边界

### 3.1 它不是播放器

LoFiClaude 有播放能力，但界面不应该像播放器。

播放器能力必须被压缩到 mini player 中：

- 当前歌名
- 播放 / 暂停
- 上一首 / 下一首
- 雨声状态
- Timer 状态

不展示：

- 大进度条
- 大播放卡片
- 专辑封面
- 播放列表面板
- 歌词区
- 复杂循环 / 随机状态

---

### 3.2 它不是聊天软件

Claude 有 AI 对话能力，但默认不显示完整聊天窗口。

Claude 的交互路径必须是：

```text
Claude 小人
↓
轻量气泡
↓
输入一句话
↓
多轮后才扩展为小面板
```

不允许默认显示：

- 聊天侧边栏
- 对话历史列表
- 全屏聊天窗口
- 类 IM 的消息流

---

### 3.3 它是 ambient room

LoFiClaude 的默认状态应该像：

- 夜晚屏保
- lofi.cafe 风格 ambient canvas
- 像素空间
- 低频互动玩具
- digital companion

用户不操作时，产品应该主动“变安静”。

---

## 4. 页面状态系统

LoFiClaude 至少包含 5 种核心状态。

### 4.1 默认态 Default

触发：

- 用户刚进入主界面
- 鼠标刚移动
- 用户刚完成一次操作

表现：

- 顶部 HUD 正常显示
- 底部 mini player 正常显示
- Claude 正常 idle
- 背景正常动画

透明度建议：

| 元素 | opacity |
|---|---:|
| 顶部 HUD | 0.8 |
| mini player | 0.8 |
| Claude | 1 |
| 背景 | 1 |

---

### 4.2 专注态 Focus / Idle Fade

触发：

- 用户 5 秒无操作

表现：

- 顶部 HUD 透明度降低
- mini player 透明度降低
- Claude 继续轻微动画
- 背景保持主视觉

透明度建议：

| 元素 | opacity |
|---|---:|
| 顶部 HUD | 0.25–0.35 |
| mini player | 0.25–0.35 |
| Claude | 0.95–1 |
| 气泡 | 无则不显示 |

退出条件：

- 鼠标移动
- 点击
- 按快捷键
- Claude 被动冒泡

---

### 4.3 交互态 Interactive

触发：

- hover mini player
- 点击 rain / timer / scene
- 点击底部控制区域
- 按快捷键打开面板

表现：

- 被交互组件 opacity 提升至 1
- popover 以轻量动画出现
- 背景不变暗，避免打断沉浸

---

### 4.4 对话态 Companion

触发：

- 点击 Claude
- 用户输入消息
- Claude 事件触发主动冒泡

表现：

- Claude 小跳一下
- 气泡从 Claude 头顶出现
- 主动点击时显示输入框
- 被动冒泡时 8 秒后淡出
- 多轮后扩展为小对话面板

限制：

- 气泡最多 2 行
- 气泡不遮挡 mini player 主信息
- 对话面板不超过 340px × 360px

---

### 4.5 睡眠态 Sleep

触发：

- timer 到时
- 用户长时间无操作并且播放停止

表现：

- 音乐与雨声淡出
- 背景亮度略微降低
- Claude 进入睡觉动画
- 出现 Zzz
- mini player 置为低亮状态

---

## 5. 背景 Canvas 系统

背景不是静态插画，而是可循环的 Canvas 系统。

### 5.1 背景分层

Canvas 背景由 5 层组成：

| 层级 | 名称 | 内容 | 动效 |
|---|---|---|---|
| 1 | base | 纯黑 / 深蓝黑渐变 | 静态 |
| 2 | far sky | 点阵星球、点阵云 | 极慢漂移 |
| 3 | skyline | 城市剪影、少量灯光 | 静态 / 灯光闪烁 |
| 4 | particles | 星星、雨滴、流星 | 轻微动态 |
| 5 | foreground | 左侧灯、窗台、桌面剪影 | 静态 |

### 5.2 推荐移动速度

| 元素 | 速度 |
|---|---:|
| base | 0 |
| far sky | 0.02px / frame |
| dotted clouds | 0.05px / frame |
| small stars | twinkle only |
| rain | 0.6–1.4px / frame |
| meteor | 仅偶发，0.4–0.6 秒 |
| foreground | 0 |

### 5.3 背景风格约束

背景应参考 lofi.cafe 的黑底点阵空间感：

- 大面积黑色或深蓝黑
- 点阵星球
- 点阵云
- 少量星星
- 城市剪影
- 稀疏暖色灯光
- 轻量雨线

避免：

- 过度写实雨夜
- 高密度细节
- 复杂透视房间
- 高亮大面积灯光
- 太厚重的像素插画

---

## 6. 背景场景规范

### 6.1 Scene 1 — Lofi Night

默认场景。

视觉元素：

- 黑蓝夜空
- 点阵星球
- 点阵云
- 城市天际线
- 少量暖橙灯光
- Claude 在右下角

用途：

- 默认打开
- 最符合 lofi.cafe 风格
- 适合长期停留

---

### 6.2 Scene 2 — Soft Rain

雨声场景。

视觉元素：

- 深黑雨夜
- 细线雨滴
- 水面少量反光
- 城市剪影
- 稀疏窗光

规则：

- 雨不能太密
- 不要让雨线遮住 Claude
- rain volume 可轻微影响雨滴密度

---

### 6.3 Scene 3 — Star Drift

星空场景。

视觉元素：

- 大面积留白
- 点阵星星
- 点阵星球
- 偶尔流星
- Claude 保持漂浮感或安静站立

---

## 7. Claude Sprite 规范

Claude 是产品核心记忆点，必须严格符合用户提供的参考风格。

### 7.1 造型硬规则

Claude 必须包含：

```text
橙色像素身体
黑色头发 / 顶部块面
白色耳机弧线
黑色方块眼睛
一只手举起
旁边一个黄色小星
```

禁止做成：

- 章鱼形象
- 3D 吉祥物
- 圆润宠物
- 复杂表情包
- 过度拟人化角色

---

### 7.2 像素规格

| 项目 | 规格 |
|---|---|
| 基础 sprite | 24 × 24 px |
| 屏幕放大倍数 | 4x |
| 默认显示尺寸 | 96 × 96 px |
| hover 尺寸 | 104 × 104 px |
| speaking 尺寸 | 104 × 104 px |
| sleeping 尺寸 | 80 × 80 px |
| 缩略图尺寸 | 32 × 32 px |

---

### 7.3 Claude 色板

| 用途 | 色值 |
|---|---|
| 身体主色 | `#df805f` |
| 身体阴影 | `#b85f48` |
| 身体高光 | `#f09a72` |
| 头发黑 | `#141414` |
| 耳机白 | `#e8e0d8` |
| 眼睛黑 | `#050505` |
| 星星黄 | `#f1d478` |

---

### 7.4 动画帧

| 动画 | 帧数 | 触发 |
|---|---:|---|
| idle | 2 帧 | 默认 |
| blink | 2 帧 | 每 4–8 秒随机 |
| talk | 2 帧 | Claude 回复 / 冒泡 |
| sleep | 2 帧 | timer 到时 |
| jump | 3 帧 | 点击 Claude |
| nod | 2 帧 | 音乐播放中 |

动画必须低频，不能像游戏角色一样高强度循环。

---

## 8. UI 视觉系统

### 8.1 UI 语言

UI 应该像轻量 HUD，而不是 App 卡片。

原则：

- 少填充
- 多 1px 线框
- 半透明背景
- 暖橙细线
- 默认低亮
- hover / active 才增强

---

### 8.2 色彩规范

| 用途 | 色值 | 说明 |
|---|---|---|
| 页面背景 | `#0b0d0e` | 接近黑色 |
| 深夜蓝 | `#111820` | 背景层次 |
| 面板底色 | `rgba(10, 12, 14, 0.55)` | 半透明 |
| 面板增强 | `rgba(10, 12, 14, 0.72)` | popover |
| 线框 | `rgba(212, 165, 116, 0.35)` | 暖橙细线 |
| 主文字 | `#e8e0d8` | 暖白 |
| 次文字 | `#8a8278` | 低亮灰 |
| 强调橙 | `#d4a574` | 品牌 / active |
| Claude 橙 | `#df805f` | 角色主体 |
| 小星星黄 | `#f1d478` | Claude 旁小星 |

### 8.3 色彩比例

```text
黑色 / 深蓝黑：80%
暖白文字：8%
暖橙线框与状态：7%
Claude 橙色：4%
其他颜色：1%
```

Claude 的橙色应该是画面中最醒目的非文字色块。

---

## 9. 字体规范

| 用途 | 字体 |
|---|---|
| Logo | `Press Start 2P` |
| 小标签 | `Press Start 2P` |
| 播放信息 | `IBM Plex Mono`, `JetBrains Mono`, `ui-monospace` |
| 对话内容 | `IBM Plex Mono`, `JetBrains Mono`, `ui-monospace` |
| 中文 | 像素中文优先，否则使用清晰等宽字体 |

### 9.1 字号建议

| 元素 | 字号 |
|---|---:|
| Logo | 14–18px |
| 顶部状态 | 12–14px |
| mini player | 12–14px |
| popover 标题 | 11–12px |
| 气泡正文 | 13–15px |
| 快捷键说明 | 10–12px |

---

## 10. 核心组件规范

### 10.1 Mini Player

默认状态：

```text
┌────────────────────────────────────────────┐
│ ▥ lofi hip hop radio - beats to relax  ◀ ❚❚ ▶  🌧60 45:00 │
└────────────────────────────────────────────┘
```

样式建议：

```css
.mini-player {
  height: 48px;
  background: rgba(8, 10, 12, 0.45);
  border: 1px solid rgba(212, 165, 116, 0.28);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  color: #e8e0d8;
}
```

硬约束：

- 高度不超过屏幕高度 10%
- 不出现大进度条
- 不出现专辑封面
- 不出现大白卡片
- 默认不展示完整播放列表

---

### 10.2 Claude Bubble

普通气泡：

```text
┌───────────────┐
│ 雨声刚刚好 🌧 │
└──────▲────────┘
```

输入气泡：

```text
┌──────────────────────┐
│ LoFiClaude        ×  │
│ 今天想做点什么呢？    │
│ ask something...  →  │
└──────────▲───────────┘
```

约束：

- 最大宽度 280px
- 默认 1–2 行文字
- 被动气泡 8 秒后淡出
- 主动气泡点击外部或 Esc 关闭
- 不默认显示历史消息

---

### 10.3 Popover

Rain popover：

```text
┌────────────────────┐
│ RAIN               │
│ light medium heavy │
│ ───────●──── 60%   │
└────────────────────┘
```

Timer popover：

```text
┌─────────┐
│ TIMER   │
│ 25 min  │
│ 45 min  │
│ 60 min  │
│ Off     │
└─────────┘
```

Scene popover：

```text
┌────────────┐
│ SCENE      │
│ Rain       │
│ Cloud      │
│ Stars      │
│ Lock scene │
└────────────┘
```

样式建议：

```css
.popover {
  background: rgba(8, 10, 12, 0.72);
  border: 1px solid rgba(212, 165, 116, 0.3);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}
```

---

## 11. 组件显隐规则

| 组件 | 默认显示 | 展开触发 | 关闭方式 |
|---|---:|---|---|
| 顶部 HUD | 是 | 无 | idle fade 降低透明度 |
| Mini player | 是 | hover / click | 鼠标离开 3 秒后收起 |
| Expanded player | 否 | 点击 mini player 播放区 | 点击外部 / Esc |
| Rain popover | 否 | 点击 `🌧60` | 点击外部 / Esc / 5 秒无操作 |
| Timer popover | 否 | 点击 `45:00` | 点击外部 / Esc |
| Scene popover | 否 | 点击左上 `+` 或场景图标 | 点击外部 / Esc |
| Claude bubble | 否 | 事件触发 / 点击 Claude | 被动 8 秒；主动点击外部关闭 |
| Chat panel | 否 | 对话超过 2 轮 | Esc / x / 点击外部 |
| Shortcut panel | 否 | 按 H | 再按 H / Esc |

---

## 12. 声音与视觉联动

为了让 LoFiClaude 像一个“活的空间”，声音状态应轻量影响视觉。

| 声音 / 状态 | 视觉反馈 |
|---|---|
| lofi 播放中 | Claude 轻微点头 |
| lofi 暂停 | Claude 停止点头，只眨眼 |
| rain volume > 60 | 雨滴密度略微增加 |
| rain volume < 20 | 雨滴变稀，Claude 可提示“雨声快停了” |
| 切歌 | Claude 偶尔评论一句 |
| 场景切换 | Claude 看向天空或冒泡一句 |
| timer 剩 5 分钟 | 背景亮度轻微降低，Claude 困倦 |
| timer 到时 | 音乐和雨声淡出，Claude 睡觉 |

约束：

- 联动必须轻，不允许出现强动效。
- 视觉变化不能影响阅读或操作。
- Claude 提示必须有频率限制，不能打扰用户。

---

## 13. 交互流程

### 13.1 首次进入

```text
打开页面
↓
看到静态黑底点阵 lofi 场景
↓
显示 LoFiClaude 与 Click anywhere to start
↓
用户点击任意区域
↓
启动音频、Canvas、Claude idle 动画
↓
进入默认态
```

---

### 13.2 点击 Claude

```text
点击 Claude
↓
Claude 小跳一下
↓
弹出浅色气泡
↓
显示一句话 + 输入框
↓
用户可输入
↓
Claude 回复
```

---

### 13.3 多轮对话

```text
用户与 Claude 连续对话超过 2 轮
↓
气泡扩展为小型对话面板
↓
显示最近 3–5 条消息
↓
可继续输入
```

限制：

- 不做完整聊天应用
- 不显示长历史列表
- 不支持复杂 Markdown

---

### 13.4 控件展开

```text
点击 bottom mini player
↓
展开播放控制
```

```text
点击 🌧60
↓
展开 rain popover
```

```text
点击 45:00
↓
展开 timer popover
```

```text
点击左上 +
↓
展开 scene popover / settings entry
```

---

## 14. 动效规范

### 14.1 背景动效

| 元素 | 动效 |
|---|---|
| 星星 | 轻微闪烁 |
| 点阵云 | 极慢移动 |
| 雨 | 细线缓慢下落 |
| 城市灯光 | 偶尔闪烁 |
| 星球 | 静态或极慢漂移 |

### 14.2 UI 动效

| 元素 | 动效 |
|---|---|
| mini player | hover 轻微变亮 |
| popover | 120ms fade + slight move |
| 气泡 | scale 0.96 → 1 |
| Claude | click 小跳 |
| timer ending | UI 逐渐变暗 |

硬约束：

- UI 动画时长控制在 120–200ms。
- 背景动效不能超过用户注意阈值。
- 不使用弹跳过强、卡通感过重的动效。

---

## 15. 版式规范

| 项目 | 数值 |
|---|---:|
| 外边距 | 24px |
| 主画面圆角 | 12px |
| 主画面边框 | 1px |
| mini player 高度 | 48px |
| mini player 距底 | 20px |
| Claude 距右 | 48px |
| Claude 距底 | 80–120px |
| 顶部状态距边 | 24px |
| popover 最大宽度 | 320px |
| chat panel 最大尺寸 | 340px × 360px |

---

## 16. 状态管理建议

```js
const appState = {
  hasStarted: false,
  mode: "default", // default | focus | interactive | companion | sleep

  player: {
    isPlaying: false,
    currentTrackIndex: 0,
    currentTrackTitle: "",
    isLoading: false,
    error: null
  },

  rain: {
    volume: 60,
    type: "medium",
    muted: false
  },

  scene: {
    current: "lofiNight", // lofiNight | softRain | starDrift
    locked: false,
    transitionProgress: 0
  },

  timer: {
    active: false,
    minutes: 45,
    remainingSeconds: 2700
  },

  claude: {
    mood: "idle", // idle | nod | talk | sleep | jump
    bubbleVisible: false,
    bubbleText: "",
    chatOpen: false,
    speaking: false
  },

  ui: {
    idleSince: null,
    miniPlayerExpanded: false,
    rainPopoverOpen: false,
    timerPopoverOpen: false,
    scenePopoverOpen: false,
    shortcutVisible: false
  }
};
```

---

## 17. Design QA Checklist

实现或出图前必须检查以下标准。

### 17.1 低干扰检查

- [ ] 默认界面无大面积浅色卡片
- [ ] 无底部 tab bar
- [ ] 无完整导航菜单
- [ ] 默认态可见按钮不超过 6 个
- [ ] 底部 UI 高度不超过主画面高度 10%
- [ ] 常驻 UI 面积不超过屏幕面积 15%
- [ ] 5 秒无操作后 UI 透明度降低

### 17.2 视觉风格检查

- [ ] 背景是黑底 / 深蓝黑点阵 lofi 风格
- [ ] 存在点阵星球 / 点阵云 / 城市剪影等元素
- [ ] Claude 是画面中最醒目的非文字色块
- [ ] 线框使用暖橙细线
- [ ] 无高饱和大面积渐变
- [ ] 无厚重播放器 UI

### 17.3 Claude 检查

- [ ] Claude 为橙色像素小人
- [ ] 有黑色头发 / 顶部块面
- [ ] 有白色耳机弧线
- [ ] 有黑色方块眼睛
- [ ] 有一只手举起
- [ ] 旁边有黄色小星
- [ ] 不是章鱼，不是 3D，不是圆润吉祥物

### 17.4 交互检查

- [ ] 点击 Claude 先出现轻量气泡
- [ ] 不默认展示完整聊天窗口
- [ ] popover 可点击外部或 Esc 关闭
- [ ] 被动气泡 8 秒后消失
- [ ] 多轮对话后才扩展为小面板
- [ ] rain / timer / scene 都是按需展开

---

## 18. 原型图输出规范

后续输出原型图时，建议保持：

| 项目 | 规范 |
|---|---|
| 画布比例 | 16:9 或 4K 横版 |
| 主界面 | 占画布左上最大区域 |
| 操作流程 | 右侧 / 下方小卡片 |
| 背景 | 黑底，不要大面积白色 |
| 说明文字 | 中文为主，少量英文标签 |
| 卡片边框 | 暖橙细线 |
| Claude | 必须使用耳机橙色像素小人形态 |

---

## 19. 推荐生成 Prompt

```text
LoFiClaude v0.2 product design mockup, dark lofi.cafe inspired pixel art interface, black background, dotted pixel planet, dotted clouds, tiny stars, city silhouette with sparse warm orange lights, minimal wireframe HUD UI, no white music card, no bottom tab bar, no heavy panels.

Main screen shows a quiet lofi night scene. Top-left has "+ LoFiClaude" in pixel font. Top-right shows small rain icon and 45:00 timer. Bottom has a thin transparent black wireframe mini player with lofi hip hop radio text, prev, pause, next icons, rain 60%, timer 45:00.

Claude character must match the provided reference: small orange pixel humanoid creature, black hair top, white headphone arc, square black eyes, one arm raised, small yellow star beside it. Not octopus. Not 3D. Pixel art only.

Claude stands on the right side with a small light speech bubble saying "雨声刚刚好 🌧".

UI style: very lightweight, thin amber borders, low contrast, transparent panels, pixel font, warm white text, amber accent. Immersive ambient room, not a music player app.

Also include interaction flow thumbnails: click Claude to show bubble, input message, expanded small chat panel, rain popover, timer popover, scene popover, shortcuts, timer ending. All thumbnails use same dark lofi background and thin line UI.
```

---

## 20. 最终设计判断

这一版设计方向的核心是：

> **黑底点阵 lofi 背景 + 极轻线框 UI + 戴耳机的 Claude 像素小人。**

它必须持续避免回到传统音乐播放器：

- 不做大卡片
- 不做底部导航
- 不做默认聊天窗口
- 不做过重控件

默认界面越像一个安静的夜晚屏保，LoFiClaude 就越成立。

