# LoFiClaude v0.3 — 完整优化 PRD & 设计方案

> 产品版本：v0.3  
> 状态：Design + Implementation Revision  
> 核心升级：**沉浸式 lofi 视频背景 + 可上拉播放器抽屉 + Claude 角色陪伴层**  
> 设计原则：**Less player, more place. Less chat app, more companion. Low-interruption as a hard rule.**

---

## 1. 产品一句话

**一个会陪你听雨和 lofi 的沉浸式像素小空间。**

用户打开页面后，进入一个安静的 lofi 夜晚场景。背景可以是沉浸式循环视频，也可以 fallback 到 Canvas 动画。Claude 戴着耳机待在画面角落，偶尔冒泡。底部默认只有一条低干扰 mini player，需要操作时可以上拉展开。

---

## 2. 本次优化目标

### 2.1 当前版本问题

当前编码完成的界面已经实现了低干扰方向，但还存在：

| 问题 | 表现 |
|---|---|
| 背景氛围不足 | 黑色雨幕太空，缺少 lofi 房间感 / 城市感 / 空间感 |
| 画面层次单薄 | 背景、Claude、UI 三层关系还不够丰富 |
| 播放器太小 | 默认态低干扰，但实际操作时按钮偏小 |
| Claude 角色孤立 | 小人缺少场景落点，和背景的融合度不足 |
| 控件可用性弱 | mini player 适合显示状态，但不适合承载完整控制 |
| 沉浸感还不稳定 | UI 没有 idle fade，背景不够“可以久待” |

### 2.2 v0.3 优化方向

| 方向 | 说明 |
|---|---|
| 背景视频化 | 支持沉浸式 lofi video loop，提高氛围完成度 |
| Canvas 辅助化 | Canvas 不再必须承担全部背景，只负责 overlay 粒子、雨、星星等 |
| 播放器抽屉化 | 底部默认 mini bar，点击 / 上拉后展开完整控制 |
| Claude 角色强化 | Claude 保持独立 sprite 层，作为 AI 入口和情绪角色 |
| UI 低干扰硬规则 | 所有控件默认轻量显示，交互时才展开 |
| 设计系统约束 | 通过尺寸、透明度、显隐规则防止 UI 变重 |

---

## 3. Design North Star

LoFiClaude 的默认界面应该像一个正在播放音乐的夜晚屏保。

用户不操作时，它应该几乎不提醒自己是一个 App。  
用户需要时，控件才轻轻浮现。  
Claude 不是一个功能按钮，而是这个空间里的住客。

最终体验应该是：

```text
打开页面
↓
进入一个安静的 lofi 夜晚
↓
音乐和雨声开始播放
↓
Claude 戴着耳机安静陪着你
↓
你需要操作时，底部播放器轻轻上拉
↓
你需要聊天时，点击 Claude
```

---

## 4. 产品定位

### 4.1 产品类型

| 维度 | 定义 |
|---|---|
| 产品形态 | Ambient lofi room / digital companion |
| 核心体验 | 听 lofi、听雨、发呆、轻陪伴 |
| 核心交互 | 点击 Claude、上拉播放器、低频 popover |
| 视觉重心 | 背景氛围 > Claude > 播放状态 > 控件 |
| 用户心智 | 不是播放器，是一个可以久待的安静空间 |

### 4.2 产品不是什么

LoFiClaude 不应该像：

- Spotify
- Calm
- YouTube 播放器
- 完整聊天 App
- Dashboard
- 工具型控制台
- 菜单很多的设置 App

---

## 5. 低干扰硬规则

这不是审美建议，而是实现约束。

### 5.1 默认界面硬约束

默认状态下，用户 3 秒内只能看到：

1. 背景
2. Claude 小人
3. 当前播放信息
4. 雨声 / timer 状态
5. 必要的顶部品牌信息

其他所有功能必须隐藏在：

- 点击
- hover
- 上拉
- 快捷键
- Claude 气泡
- popover

之后。

### 5.2 UI 数量限制

| 规则 | 约束 |
|---|---|
| 默认可见按钮数量 | 不超过 6 个 |
| 默认底部 UI 高度 | 不超过画面高度的 8% |
| 默认浅色区域 | 仅允许 Claude 气泡 |
| 默认 popover | 不显示 |
| 默认聊天面板 | 不显示 |
| 底部 tab bar | 禁止 |
| 大面积白色播放器卡片 | 禁止 |
| 完整导航菜单 | 禁止 |

### 5.3 视觉优先级

```text
P0 背景氛围，占据 70% 以上注意力
P1 Claude 小人，唯一高饱和角色
P2 当前播放 / timer / rain 状态
P3 可操作控件
P4 说明文字 / 快捷键
```

如果某个 UI 元素抢过 Claude 或背景，必须降权。

---

## 6. 整体架构

v0.3 页面由 4 层组成：

```text
Layer 1: Background Video / Canvas Background
Layer 2: Canvas Overlay: rain / stars / particles / dim filter
Layer 3: Claude Sprite + Speech Bubble
Layer 4: HUD UI: header / player drawer / popovers
```

示意：

```text
┌────────────────────────────────────┐
│ video background loop               │
│ ────────────────────────────────── │
│ canvas overlay: rain / stars        │
│ ────────────────────────────────── │
│ Claude sprite + speech bubble       │
│ ────────────────────────────────── │
│ mini player / drawer / popovers     │
└────────────────────────────────────┘
```

---

## 7. 背景策略

### 7.1 两种背景模式

LoFiClaude v0.3 支持两种背景模式。

#### A. Video Loop Mode

默认优先模式。

| 项目 | 说明 |
|---|---|
| 类型 | WebM / MP4 循环视频 |
| 用途 | 快速获得高质量 lofi 氛围 |
| 播放方式 | muted + loop + autoplay + playsinline |
| 适合 | lofi 房间、雨夜城市、点阵宇宙 |
| 优点 | 氛围强、实现快、完成度高 |
| 缺点 | 文件体积、素材版权、性能 |

#### B. Canvas Generated Mode

fallback 和轻量模式。

| 项目 | 说明 |
|---|---|
| 类型 | Canvas 生成背景 |
| 用途 | 视频加载失败、低性能设备、无素材时 |
| 元素 | 雨、云、星星、城市剪影、点阵星球 |
| 优点 | 可控、轻量、无素材依赖 |
| 缺点 | 氛围细节需要手工实现 |

### 7.2 背景优先级

```text
1. 用户选择的视频背景
2. 默认视频背景
3. Canvas 生成背景
4. 静态深色渐变背景
```

### 7.3 推荐背景素材方向

#### Scene 1：Lofi Room

默认推荐。

关键词：

```text
lofi room night window loop
cozy lofi room animated background
rainy window lofi loop
pixel lofi room rain loop
```

画面要求：

- 室内窗框
- 夜晚城市
- 台灯 / 桌面
- 暖橙光
- 小雨或窗外雨
- 适合 Claude 站在右下角

#### Scene 2：Rain City

适合雨声主场景。

关键词：

```text
pixel rain city loop
lofi rainy city night loop
night city rain animated background
rainy city pixel background
```

画面要求：

- 城市剪影
- 雨
- 水面或街道反光
- 少量暖橙窗光
- 低饱和深蓝黑

#### Scene 3：Dotted Space

参考 lofi.cafe / Claude FM 风格。

关键词：

```text
pixel space lofi loop
dithered planet pixel background loop
retro pixel night sky loop
lofi cafe pixel background
```

画面要求：

- 黑底
- 点阵星球
- 点阵云
- 小星星
- 大面积留白
- Claude 在画面中显眼

### 7.4 素材格式规范

| 项目 | 建议 |
|---|---|
| 优先格式 | `.webm` |
| fallback | `.mp4` |
| 分辨率 | 1920×1080 起步 |
| 帧率 | 24fps 或 30fps |
| 时长 | 8–20 秒 |
| 音频 | 无音轨或 muted |
| 文件大小 | 最好 < 5MB，最多 < 10MB |
| 循环 | 首尾无明显跳帧 |
| 色彩 | 低饱和，深色，少量暖光 |

### 7.5 背景视频处理

视频上方必须叠加暗色遮罩，保证 UI 清晰。

```css
.background-video {
  object-fit: cover;
  filter: brightness(0.55) contrast(0.95) saturate(0.8);
}

.background-dim {
  background:
    radial-gradient(circle at center, rgba(0,0,0,0.06), rgba(0,0,0,0.45)),
    rgba(0, 0, 0, 0.22);
}
```

---

## 8. Canvas Overlay 设计

即使用视频背景，也保留 Canvas overlay。

### 8.1 Canvas Overlay 负责

| 元素 | 说明 |
|---|---|
| 雨滴增强 | 根据雨声音量调整密度 |
| 星星微闪 | 在 Dotted Space 场景中使用 |
| 粒子 | 少量空气尘埃 / 光点 |
| 水波 | Rain City 可选 |
| 暗角 | 增强中心沉浸感 |
| 场景切换淡入淡出 | 1 秒 crossfade |

### 8.2 Canvas 分层

```text
1. base overlay：暗角、色调
2. weather：雨滴 / 雪 / 星星
3. particles：轻粒子
4. foreground effects：水花 / 光点
```

### 8.3 雨滴规范

| 项目 | 规范 |
|---|---|
| 风格 | 像素线段，不是写实雨 |
| 长度 | 8–18px |
| 粗细 | 1px |
| 角度 | 统一斜向，少量变化 |
| 透明度 | 3 档：0.2 / 0.35 / 0.5 |
| 密度 | 跟 rain volume 轻微联动 |
| 水花 | 可选，1–2 帧短动画 |

---

## 9. Claude 角色设计

### 9.1 角色定位

Claude 是这个空间里的住客，不是普通按钮。

它负责：

- 陪伴
- 轻提示
- AI 对话入口
- 状态反馈
- 情绪表达

### 9.2 造型规范

Claude 小人参考用户提供的 Claude FM 像素形象。

必须具备：

```text
橙色像素身体
黑色头发 / 顶部块面
白色耳机弧线
两个黑色方块眼睛
一只手举起
右侧黄色小星星
短脚 / 像素块身体
```

禁止：

- 做成章鱼
- 做成 3D
- 做成圆润卡通宠物
- 做成写实人物
- 做成过度复杂的吉祥物

### 9.3 Sprite 尺寸

| 项目 | 数值 |
|---|---|
| 基础 sprite | 24×24 px |
| 放大倍率 | 4× |
| 默认显示 | 96×96 px |
| hover | 104×104 px |
| speaking | 104×104 px |
| sleeping | 80×80 px |
| 缩略图 | 32×32 px |

### 9.4 色板

| 用途 | 色值 |
|---|---|
| 身体主色 | `#df805f` |
| 阴影橙 | `#b85f48` |
| 高光橙 | `#f09a72` |
| 头发黑 | `#141414` |
| 眼睛黑 | `#050505` |
| 耳机白 | `#e8e0d8` |
| 小星黄 | `#f1d478` |

### 9.5 Claude 动画状态

| 状态 | 动画 | 触发 |
|---|---|---|
| idle | 轻微上下浮动 | 默认 |
| blink | 眨眼 1 次 | 随机 5–12 秒 |
| playing | 轻微点头 | 音乐播放中 |
| speaking | 身体轻微晃动，小星闪烁 | 气泡出现 / AI 回复 |
| click | 小跳一下 | 点击 Claude |
| sleep | 蜷缩 / 低头，Zzz | timer 结束 |
| focus | 安静不动，只眨眼 | 用户长时间无操作 |

动画帧建议：

```text
idle：2 帧
blink：2 帧
talk：2 帧
sleep：2 帧
jump：3 帧
```

### 9.6 Claude 站位

Claude 不应漂浮在画面中，必须有场景归属感。

建议：

```css
.claude {
  right: 8%;
  bottom: 14%;
}
```

同时加入：

- 1px 暗影
- 小平台或地面接触点
- 与视频背景保持不重叠播放器
- 避免遮挡重要背景主体

---

## 10. Claude 气泡与 AI 交互

### 10.1 被动气泡

事件触发时，Claude 冒出一句轻提示。

```text
┌───────────────┐
│ 雨声刚刚好 🌧 │
└──────▲────────┘
```

规则：

| 项目 | 规范 |
|---|---|
| 行数 | 1–2 行 |
| 最大宽度 | 220–280px |
| 停留时间 | 8 秒 |
| 出现频率 | 低频，不打扰 |
| 关闭 | 自动淡出 |
| 背景 | 浅米色，仅气泡允许浅色 |

### 10.2 点击 Claude：输入气泡

点击 Claude 后，出现轻量输入气泡。

```text
┌──────────────────────┐
│ LoFiClaude        ×  │
│ 今天想做点什么呢？    │
│ ask something...  →  │
└──────────▲───────────┘
```

规则：

- 不默认打开完整聊天面板
- 不展示长历史
- 输入框轻量
- 点击外部 / Esc 关闭
- 发送按钮只用箭头

### 10.3 多轮对话：小面板

超过 2 轮对话后，扩展为小面板。

```text
┌────────────────────────┐
│ LoFiClaude          ×  │
│ scene: rain · rain 60% │
│                        │
│ Claude: 还在呢 🎵      │
│ You: 帮我专注 25 分钟   │
│ Claude: 好，我陪你。    │
│                        │
│ ask something...    →  │
└────────────────────────┘
```

规范：

| 项目 | 规范 |
|---|---|
| 宽度 | 280–340px |
| 高度 | 260–360px |
| 背景 | 深色半透明 |
| 边框 | 暖橙细线 |
| 位置 | Claude 附近或右侧 |
| 默认 | 不显示 |
| 关闭 | Esc / x / 点击外部 |

---

## 11. 播放器设计：Mini Bar + 上拉 Drawer

### 11.1 设计目标

默认低干扰，操作时足够可用。

因此播放器分为两态：

1. Collapsed Mini Bar
2. Expanded Player Drawer

### 11.2 默认态：Mini Bar

默认高度 48–56px。

```text
┌────────────────────────────────────┐
│ Claude FM                 ❚❚  🌧60 │
└────────────────────────────────────┘
```

展示：

- 当前播放名称
- 播放 / 暂停
- 雨声音量
- timer 简短状态

不展示：

- 大进度条
- 专辑封面
- 完整歌单
- 大型控制组
- tab bar

### 11.3 展开态：Player Drawer

用户点击 / hover / 上拉后，展开为 180–220px。

```text
┌────────────────────────────────────┐
│ NOW PLAYING                        │
│ Claude FM 克劳德调频               │
│                                    │
│        ◀      ❚❚      ▶            │
│                                    │
│ RAIN     light medium heavy        │
│          ─────────●──── 60%        │
│                                    │
│ TIMER    25  45  60  off           │
└────────────────────────────────────┘
```

展示：

- 当前播放完整名称
- 上一首 / 播放暂停 / 下一首
- 随机 / 循环可选
- 雨声音量滑块
- 雨声类型
- timer 快捷选项
- 收起按钮

### 11.4 播放器触发方式

| 操作 | 行为 |
|---|---|
| 点击 mini bar | 展开 / 收起 |
| hover 底部 0.5 秒 | mini bar 轻微上浮 |
| 向上拖拽 | 展开 drawer |
| Esc | 收起 |
| 点击背景 | 收起 |
| 5 秒无操作 | 收起到 mini bar 并降低透明度 |

### 11.5 播放器尺寸

| 状态 | 高度 |
|---|---:|
| Collapsed | 48–56px |
| Expanded | 180–220px |
| 最大宽度 | 90% viewport |
| 距底 | 20–24px |
| 圆角 | 10–14px |

### 11.6 播放器样式

```css
.player-drawer {
  background: rgba(8, 10, 12, 0.72);
  border: 1px solid rgba(212, 165, 116, 0.28);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.35);
  color: #e8e0d8;
}
```

---

## 12. 顶部 HUD

### 12.1 左上角品牌

```text
+ LoFiClaude
```

规范：

- `+` 使用暖橙
- `LoFiClaude` 使用像素字体
- 位置：左上 24px
- 不做厚按钮

### 12.2 右上状态

默认轻量显示：

```text
🌧 45:00
```

规则：

- 默认不显示明显按钮框
- hover 时出现细线框
- 点击 scene icon 展开场景选择
- 点击 timer 展开 timer popover

---

## 13. Popover 设计

控制项默认不展开，仅在点击后出现。

### 13.1 Rain Popover

```text
┌────────────────────┐
│ RAIN               │
│ light medium heavy │
│ ───────●──── 60%   │
└────────────────────┘
```

### 13.2 Timer Popover

```text
┌─────────┐
│ TIMER   │
│ 25 min  │
│ 45 min  │
│ 60 min  │
│ Off     │
└─────────┘
```

### 13.3 Scene Popover

```text
┌────────────┐
│ SCENE      │
│ Lofi Room  │
│ Rain City  │
│ Space      │
│ Lock scene │
└────────────┘
```

### 13.4 Popover 显隐规则

| 组件 | 默认 | 展开 | 关闭 |
|---|---|---|---|
| Rain Popover | 隐藏 | 点击 `🌧60` | 点击外部 / Esc / 5 秒无操作 |
| Timer Popover | 隐藏 | 点击 `45:00` | 点击外部 / Esc |
| Scene Popover | 隐藏 | 点击左上 `+` 或 scene icon | 点击外部 / Esc |
| Shortcuts | 隐藏 | 按 `H` | 再按 H / Esc |

---

## 14. 状态系统

### 14.1 页面状态

| 状态 | 触发 | UI 表现 |
|---|---|---|
| Start | 首次进入 | 静态背景 + Click to start |
| Default | 刚进入 / 鼠标移动 | HUD 正常显示 |
| Focus | 5 秒无操作 | HUD 透明度降低 |
| Interactive | hover / click | HUD 提亮，可展开 |
| Chat | 点击 Claude | Claude 气泡或小面板 |
| Drawer | 上拉播放器 | 播放器完整展开 |
| Sleep | timer 结束 | 音乐淡出，Claude 睡觉 |

### 14.2 Idle Fade

5 秒无操作后：

```css
.hud-idle {
  opacity: 0.35;
}
```

鼠标移动、hover、键盘输入后恢复：

```css
.hud-active {
  opacity: 0.85;
}
```

气泡、popover、drawer 出现时，相关 UI 保持 active。

---

## 15. 声音与视觉联动

### 15.1 联动规则

| 声音状态 | 视觉反馈 |
|---|---|
| lofi 播放中 | Claude 轻微点头 |
| 暂停 | Claude 停止点头，只眨眼 |
| rain volume > 60 | 雨滴密度略增 |
| rain volume < 20 | 雨滴变稀 |
| 切歌 | Claude 偶尔评论一句 |
| timer 剩 5 分钟 | 背景亮度轻微降低，Claude 困倦 |
| timer 结束 | 音乐和雨声淡出，Claude 睡觉 |

### 15.2 AI 触发

| 事件 | Claude 话术方向 | 频率限制 |
|---|---|---|
| 首次打开 | 打招呼 | 每 session 1 次 |
| 切歌 | 评论节奏 | 至少间隔 60 秒 |
| 雨声变大 | 提醒雨声增强 | 至少间隔 90 秒 |
| 雨声变小 | 提醒雨声变小 | 至少间隔 90 秒 |
| 场景切换 | 评论新场景 | 每次可触发 |
| timer 剩 5 分钟 | 收尾提醒 | 必触发 |
| 10 分钟无操作 | 安静问候 | 每 10 分钟最多 1 次 |

---

## 16. 视觉规范

### 16.1 色彩

| 用途 | 色值 |
|---|---|
| 页面背景 | `#0b0d0e` |
| 深夜蓝 | `#111820` |
| 面板底色 | `rgba(8, 10, 12, 0.72)` |
| 线框 | `rgba(212, 165, 116, 0.28)` |
| 主文字 | `#e8e0d8` |
| 次文字 | `#8a8278` |
| 强调橙 | `#d4a574` |
| Claude 橙 | `#df805f` |
| 耳机白 | `#e8e0d8` |
| 小星黄 | `#f1d478` |
| 气泡背景 | `rgba(241, 234, 223, 0.95)` |
| 气泡文字 | `#111111` |

### 16.2 色彩比例

```text
黑色 / 深蓝黑：80%
暖白文字：8%
暖橙线框与状态：7%
Claude 橙色：4%
其他颜色：1%
```

### 16.3 字体

| 用途 | 字体 |
|---|---|
| Logo | `Press Start 2P` |
| 小标签 | `Press Start 2P` |
| 播放信息 | `IBM Plex Mono` / `JetBrains Mono` |
| 对话内容 | `IBM Plex Mono` / `JetBrains Mono` |
| 中文 | 像素字体优先，否则清晰等宽字体 |

### 16.4 字号

| 元素 | 字号 |
|---|---:|
| Logo | 14–18px |
| 顶部状态 | 12–14px |
| Mini bar | 12–14px |
| Drawer 标题 | 10–12px |
| 气泡正文 | 13–15px |
| Popover | 11–13px |
| 快捷键说明 | 10–12px |

---

## 17. 交互流程

### 17.1 首次进入

```text
打开页面
↓
显示背景视频静态首帧 / Canvas 静态背景
↓
中央显示 Claude + Click to start
↓
用户点击任意区域
↓
初始化音频、视频、Canvas、Claude 动画
↓
开始播放 lofi / 雨声
↓
Claude 冒泡：雨声刚刚好 🌧
```

### 17.2 操作播放器

```text
默认 mini bar
↓
点击 / 上拉
↓
Player Drawer 展开
↓
调节播放、雨声、timer
↓
Esc / 点击背景 / 5 秒无操作
↓
收起为 mini bar
```

### 17.3 点击 Claude

```text
点击 Claude
↓
Claude 小跳一下
↓
出现输入气泡
↓
用户输入消息
↓
Claude 回复
↓
超过 2 轮后，扩展为小面板
```

### 17.4 切换背景

```text
点击右上 scene icon 或左上 +
↓
打开 Scene Popover
↓
选择 Lofi Room / Rain City / Space
↓
背景视频 crossfade
↓
Canvas overlay 切换对应粒子
↓
Claude 冒泡评论新场景
```

---

## 18. 快捷键

| 快捷键 | 操作 |
|---|---|
| `Space` | 播放 / 暂停 |
| `←` | 上一首 |
| `→` | 下一首 |
| `↑` | 雨声 +10% |
| `↓` | 雨声 -10% |
| `M` | 雨声静音 / 恢复 |
| `1` | Lofi Room |
| `2` | Rain City |
| `3` | Space |
| `T` | 打开 / 关闭 timer |
| `H` | 显示 / 隐藏快捷键 |
| `Esc` | 关闭气泡 / 面板 / popover / drawer |

---

## 19. 文件结构建议

```text
loficlaude/
├── public/
│   ├── backgrounds/
│   │   ├── lofi-room.webm
│   │   ├── lofi-room.mp4
│   │   ├── rain-city.webm
│   │   ├── rain-city.mp4
│   │   ├── dotted-space.webm
│   │   └── dotted-space.mp4
│   ├── rain/
│   │   ├── rain-light.mp3
│   │   ├── rain-medium.mp3
│   │   └── rain-heavy.mp3
│   └── sprites/
│       └── claude-sprite.png
├── src/
│   ├── App.svelte
│   ├── components/
│   │   ├── BackgroundVideo.svelte
│   │   ├── CanvasOverlay.svelte
│   │   ├── AmbientHeader.svelte
│   │   ├── ClaudeSprite.svelte
│   │   ├── ClaudeBubble.svelte
│   │   ├── ClaudeChatPanel.svelte
│   │   ├── PlayerDrawer.svelte
│   │   ├── RainPopover.svelte
│   │   ├── TimerPopover.svelte
│   │   ├── ScenePopover.svelte
│   │   └── KeyboardHint.svelte
│   ├── audio/
│   │   ├── YouTubePlayer.js
│   │   └── RainPlayer.js
│   ├── ai/
│   │   └── ClaudeChat.js
│   ├── stores/
│   │   └── appState.js
│   └── utils/
│       ├── idle.js
│       └── localStorage.js
```

---

## 20. 状态结构建议

```js
const appState = {
  hasStarted: false,

  background: {
    mode: "video", // video | canvas
    currentScene: "lofi-room",
    locked: false,
    isLoading: false,
    fallbackToCanvas: false
  },

  player: {
    isPlaying: false,
    currentTrackIndex: 0,
    currentTrackTitle: "Claude FM 克劳德调频",
    isLoading: false,
    error: null
  },

  rain: {
    volume: 60,
    type: "medium",
    muted: false
  },

  timer: {
    active: true,
    minutes: 45,
    remainingSeconds: 2700
  },

  claude: {
    mood: "idle",
    bubbleVisible: false,
    bubbleText: "",
    chatOpen: false,
    speaking: false,
    conversationTurns: 0
  },

  ui: {
    idle: false,
    playerExpanded: false,
    rainPopoverOpen: false,
    timerPopoverOpen: false,
    scenePopoverOpen: false,
    shortcutVisible: false
  }
};
```

---

## 21. localStorage 持久化

| Key | 说明 | 默认 |
|---|---|---|
| `lastTrack` | 最后播放歌曲 | 0 |
| `backgroundScene` | 背景场景 | `lofi-room` |
| `backgroundMode` | 背景模式 | `video` |
| `rainVolume` | 雨声音量 | 60 |
| `rainType` | 雨声类型 | `medium` |
| `timerMinutes` | 定时分钟数 | 45 |
| `sceneLocked` | 是否锁定背景 | false |
| `playerExpanded` | 是否记住播放器展开 | false，不建议默认恢复 |
| `chatHistory` | Claude 对话历史 | 最近 20 条 |

---

## 22. 实施计划

### Phase 1：播放器抽屉

目标：解决底部播放器太小的问题。

任务：

- [ ] 创建 `PlayerDrawer.svelte`
- [ ] 实现 collapsed / expanded 两态
- [ ] 点击 mini bar 展开
- [ ] Esc / 点击背景收起
- [ ] 展开态加入播放控制
- [ ] 展开态加入 rain 控制
- [ ] 展开态加入 timer 快捷项
- [ ] 增加 idle fade

验收：

- 默认播放器高度不超过 56px
- 展开后高度 180–220px
- 不出现大白卡
- 不出现 tab bar
- 展开态按钮可点击区域明显变大

### Phase 2：背景视频支持

目标：提升沉浸式 lofi 氛围。

任务：

- [ ] 创建 `BackgroundVideo.svelte`
- [ ] 支持 `.webm` + `.mp4` fallback
- [ ] muted / loop / autoplay / playsinline
- [ ] 加 dark overlay
- [ ] 加加载失败 fallback 到 Canvas
- [ ] 支持 scene 切换
- [ ] 支持 crossfade

验收：

- 背景有明显空间感
- UI 文本仍然清晰
- 视频加载失败时页面不白屏
- 切换场景无明显闪烁

### Phase 3：Canvas Overlay 重构

目标：让 Canvas 成为增强层，不再承担全部背景。

任务：

- [ ] 保留 rain overlay
- [ ] 雨滴改为 pixel segment
- [ ] 雨量与 rain volume 联动
- [ ] 增加星星 / 粒子 overlay
- [ ] 增加暗角
- [ ] 场景切换时 overlay 跟随变化

验收：

- 雨滴更像像素风
- 画面不再空
- overlay 不抢视频主体
- rain volume 调整有轻微视觉反馈

### Phase 4：Claude Sprite 优化

目标：更接近参考形象。

任务：

- [ ] 使用 24×24 sprite
- [ ] 加白色耳机弧线
- [ ] 加黑色头发块
- [ ] 加黄色小星星
- [ ] 调整比例更横向
- [ ] 加 idle / blink / speaking / sleep 动画
- [ ] 加脚下暗影或接触点

验收：

- 明显像 Claude FM 参考小人
- 不是章鱼
- 不是普通人形
- Claude 是画面中最醒目的色块
- 点击区域清晰

### Phase 5：Claude 气泡与对话

目标：让 Claude 成为 AI 入口。

任务：

- [ ] 点击 Claude 出气泡
- [ ] 被动事件触发气泡
- [ ] 输入气泡支持发送
- [ ] 超过 2 轮扩展小面板
- [ ] 无 API Key fallback
- [ ] 关闭规则：Esc / 点击外部

验收：

- 默认不显示聊天面板
- 点击 Claude 才进入对话
- 气泡不超过 2 行
- 被动提示 8 秒后消失

---

## 23. Design QA Checklist

实现完成后逐项检查。

### 23.1 低干扰检查

- [ ] 默认界面无大面积白色卡片
- [ ] 无底部 tab bar
- [ ] 默认可见按钮不超过 6 个
- [ ] 默认播放器高度不超过 56px
- [ ] 5 秒无操作后 HUD 降低透明度
- [ ] popover 默认全部隐藏
- [ ] 聊天面板默认隐藏

### 23.2 氛围检查

- [ ] 背景有空间感，不只是纯黑雨幕
- [ ] 画面中有少量暖色灯光或点状亮点
- [ ] Claude 不漂浮，有接触点或阴影
- [ ] 背景不抢 UI 可读性
- [ ] 视频或 Canvas 循环无明显跳帧

### 23.3 Claude 检查

- [ ] 橙色主体明显
- [ ] 白色耳机弧线明显
- [ ] 黑色头发块存在
- [ ] 黄色小星星存在
- [ ] 不是章鱼
- [ ] 点击 Claude 有反馈
- [ ] Claude 有 idle 动画

### 23.4 播放器检查

- [ ] 默认播放器轻
- [ ] 可点击 / 上拉展开
- [ ] 展开后控件足够大
- [ ] 播放按钮状态清晰
- [ ] 雨声控制可用
- [ ] timer 控制可用
- [ ] Esc 可收起

---

## 24. 最终结论

v0.3 的核心变化是：

```text
从：纯 Canvas 雨幕 + 迷你播放器 demo
到：沉浸式 lofi 背景 + 可展开控制抽屉 + Claude 角色陪伴空间
```

最终界面应该满足：

- 背景像 lofi.cafe / lofi room，而不是空黑雨幕
- 播放器默认很轻，但可以上拉完整操作
- Claude 是独立角色层，可点击、可冒泡、可陪伴
- UI 是 HUD，不是传统 App
- 低干扰是硬规则，而不是风格建议

这会让 LoFiClaude 更像一个真正可以久待的 ambient companion，而不只是一个极简音乐播放器。

---

## 25. GPT-5.5 审查结论与优先级排期

> 审查日期：2026-05-17 | 审查方：GPT-5.5（Codex） | 当前代码状态：Phase 1-4 已完成

### 25.1 审查发现

当前项目已完成 Svelte 5 + Vite 骨架、Canvas 三场景、YouTube iframe、Howler 雨声、Claude 气泡/面板、快捷键、localStorage。方向符合 v0.3 设计但存在 6 个关键问题。

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| 1 | 雨声 MP3 文件缺失：`public/rain-*.mp3` 不存在 | **P0** | 核心"雨声叠加"功能不可用 |
| 2 | Claude API Key 暴露在前端：`VITE_ANTHROPIC_API_KEY` 会打包进浏览器 | **P0** | 部署后 Key 泄露；当前只能 fallback |
| 3 | 场景自动轮播未实现：每 5 分钟轮换 + scene.locked 未实现 | **P1** | PRD 功能缺失 |
| 4 | App.svelte 570 行超过 500 行建议阈值 | **P1** | 继续开发会进一步膨胀 |
| 5 | README 仍是 Vite 模板内容 | **P1** | 新用户/开发者无法快速上手 |
| 6 | 无测试脚本：package.json 只有 dev/build/preview | **P2** | 无法自动验证质量 |

### 25.2 当前代码基线 vs v0.3 PRD 差距

| v0.3 功能 | 代码状态 | 差距 |
|-----------|----------|------|
| Canvas 背景生成 | ✅ 已实现（3 场景） | 需补充自动轮播 |
| 雨声叠加 | ⚠️ 代码就绪但缺 MP3 资源 | P0：补齐雨声文件 |
| Claude 角色动画 | ✅ 已实现（6 状态） | 需优化参考形象 |
| Claude 气泡/面板 | ✅ 已实现 | 气泡 UI 可改进（像素硬角） |
| 快捷键 | ✅ 已实现 | — |
| localStorage | ✅ 已实现 | — |
| Mini Player | ✅ 已实现 | 需改为 drawer 两态 |
| 背景视频支持 | ❌ 未开发 | P2：需收集素材后实施 |
| Canvas Overlay | ⚠️ 现有 Canvas 可复用 | 需重构为 overlay 层 |
| Player Drawer | ❌ 未开发 | P1：当前只有 ExpandedPlayer |
| Claude FM 像素形象 | ⚠️ 基础形态存在 | 需优化配色和比例 |

### 25.3 推荐实施顺序

#### 第一梯队：P0（阻塞性，立即修复）

**1. 雨声 MP3 资源**
目标：解决 `public/rain-light.mp3`、`rain-medium.mp3`、`rain-heavy.mp3` 缺失。
方案：下载 CC0 雨声音频或程序生成白噪音。`RainPlayer.js` 已就绪，只需文件落地。

**2. Claude API 安全策略**
目标：避免 `VITE_ANTHROPIC_API_KEY` 暴露到浏览器包。
方案：保留 fallback 模式为默认。需远程访问 API 时加后端代理（可推迟到部署前）。本地开发保持现状并写入 README 警告。

#### 第二梯队：P1（高优先级，下一轮编码）

**3. 场景自动轮播 + scene.locked**
目标：每 5 分钟自动切换场景，locked 时停止。
影响文件：`App.svelte`（在 idleInterval 中添加轮播逻辑）+ `scene.locked` store。

**4. 播放器 Drawer 两态重构**
目标：当前 `ExpandedPlayer.svelte` 改为 drawer 形态。
规范：
- 默认 collapsed：48-56px，仅显示歌名 + 播放状态 + 雨声 + timer
- 点击/上拉展开：180-220px，显示完整控制 + 雨声 + timer 快捷项
- Esc / 点击背景 / 5 秒无操作收起
- idle fade 跟随全局

**5. App.svelte 拆分**
目标：570 行 → 拆为 3-4 个独立模块。
建议：`keyboard.js`（快捷键）、`session.js`（timer + idle）、`audioInit.js`（YouTube + Rain 初始化）、`claudeOrch.js`（Claude 交互编排）

**6. README 更新**
目标：反映 LoFiClaude 项目信息，包含运行方式、快捷键、音频素材要求和 API Key 安全警告。

#### 第三梯队：P2（质量提升）

**7. 基础测试脚本**
目标：加 `svelte-check` 或最小单元测试。

**8. 背景视频支持**
目标：创建 `BackgroundVideo.svelte`，支持 WebM/MP4 循环。
条件：需要先收集/制作背景素材。

**9. Canvas Overlay 重构**
目标：当前 Canvas 改为轻量 overlay 层（rain/stars/particles + 暗角）。
位置：置于视频/Canvas 之上，独立于背景。

### 25.4 关键设计决策

| 决策 | 建议 | 理由 |
|------|------|------|
| Claude API 未来发展 | 本地阶段保留 fallback 优先；需远程时加 Cloudflare Worker 代理 | 前端直连 API 无论如何都不安全 |
| 气泡像素风格 | 圆角 → 改为硬角 + 像素边框 | 更符合 v0.3"像素房间"定位 |
| 字体像素统一度 | Label 多用 Press Start 2P，正文保持 Plex Mono | 标题/标签像素化，正文保持可读性 |
| 素材来源 | 优先收集 CC0 lofi room 循环视频 | 降低素材依赖风险 |
