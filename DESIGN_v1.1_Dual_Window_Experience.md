# LoFiClaude v1.1 - Dual Window Experience Design

> 设计目标：把 v1.0 的桥接能力做成可感知、可理解、可恢复的双窗协同体验  
> 设计原则：**quiet, legible, shared, low friction**

---

## 1. 设计主题

### 1.1 核心判断

这个版本的重点不是更炫，而是更清楚：

- 用户要知道 Claude 在哪
- 用户要知道现在能不能输
- 用户要知道消息从哪来、往哪去
- 用户要知道断了怎么回来

### 1.2 视觉方向

- 保持现有 lofi 夜景基调
- 保持像素、暗色、低对比的整体气质
- 增强状态可读性，而不是增加装饰
- 让浏览器像环境，终端像工作口

---

## 2. 信息层级

### 2.1 浏览器

浏览器负责：

- 房间氛围
- Claude 状态展示
- 聊天面板
- 重连入口
- 流式回复可视化

### 2.2 终端

终端负责：

- 快速输入
- Claude 输出流
- 状态行
- 轻量来源提示

---

## 3. 关键界面

### 3.1 Browser Room

首屏保持现有房间结构，但要强化以下信息：

- bridge 未连接时，Claude 处于睡眠或离线状态
- bridge 连接成功时，状态应立即从 disconnected 切到 connected
- 当 Claude 正在工作时，sprite / bubble / panel 同步变化

### 3.2 Chat Panel

面板的职责变成“工作记录器”，而不是纯聊天框：

- 用户消息和 Claude 回复分层明显
- streaming text 在进行时要有清晰视觉标记
- tool 状态单独一行，不和正文混在一起
- 断连时给出明确恢复动作

### 3.3 Terminal Companion

终端输出建议保持非常轻：

- 状态行用短文本
- tool 事件用前缀标记
- assistant 输出尽量不加噪声
- 只在必要处标记来源或连接状态

---

## 4. 状态设计

### 4.1 状态映射

| 状态 | 浏览器表现 | 终端表现 |
|---|---|---|
| disconnected | 灰化、提示重连 | 连接失败提示 |
| connecting | 轻量 loading | `[Connecting...]` |
| connected | 可输入 | `[Connected]` |
| working | Claude 醒着、动画更活跃 | `[Working...]` |
| blocked | 警示状态 | `[Blocked]` |
| done | 回到 ambient | `[Done]` |

### 4.2 交互原则

- 状态变化必须比普通文案更快被感知
- 不要让长说明遮住房间氛围
- 不把错误变成工程日志

---

## 5. 组件建议

### 5.1 现有组件保留

- `AmbientHeader`
- `ClaudeChatPanel`
- `ClaudeBubble`
- `ConnectionStatus`
- `MiniPlayer`

### 5.2 需要增强的点

- `ConnectionStatus` 更明确地表达 session 状态
- `ClaudeChatPanel` 增强消息来源感
- 终端输出格式需要统一短前缀

---

## 6. 设计结论

v1.1 的设计不是“更多 UI”，而是“更少歧义”。

浏览器负责让人愿意停留，终端负责让人愿意继续输入。两个窗口都在看同一个 Claude，但各自承担不同密度的表达。

