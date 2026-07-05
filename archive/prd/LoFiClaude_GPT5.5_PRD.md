# LoFiClaude GPT-5.5 PRD

> 状态：Draft
> 产品定位：lofi 音乐 + 氛围感陪伴
> 版本目标：把 LoFiClaude 作为一个可长期停留的房间，而不是一个重操作的 agent 工具箱

## 1. Summary

LoFiClaude 是一个以 lofi 音乐、雨声、像素房间和 Claude 陪伴为核心的本地氛围产品。它的价值不是“更像聊天框”，而是“更像一个会陪你专注、休息、发呆的房间”。

本 PRD 定义的优化方向是：优先强化陪伴感、稳定性、低打扰、情绪节奏和启动顺滑；Claude 的本地能力、skills、bridge 只作为增强层存在，不应破坏主体验。

## 2. Contacts

| Name | Role | Comment |
|---|---|---|
| Eliot | Product Owner | 定义产品方向、优先级和取舍 |
| Codex | PM / UX / Engineering | 输出 PRD、拆分需求、辅助实现 |
| Future implementation agent | Engineer | 按 PRD 实现和验证 |

## 3. Background

### 3.1 产品现状

现有 LoFiClaude 已具备以下能力：

- Svelte 5 + Vite 单页房间
- Canvas 氛围背景和像素 Claude
- lofi 播放、雨声、计时器、场景切换
- 本地 bridge 连接 Claude CLI
- 聊天泡泡和聊天面板
- 一些角色状态和短反馈

但产品当前容易被用户理解成“一个带 Claude 的工具页面”，而不是“一个可以长时间待着的 lofi 陪伴空间”。

### 3.2 核心问题

当前体验还没有完全围绕“氛围感”组织起来，主要问题是：

- 主体验和辅助体验的权重不够清晰
- 连接本地 Claude 的流程偏工程化
- 聊天和房间感还没有形成统一节奏
- 状态反馈够用，但情绪层次还不够细
- skills / hooks / bridge 这类能力更像隐藏功能，而不是用户可感知的产品价值

### 3.3 Why Now

这个产品最有潜力的方向不是继续变成重型 agent 控制台，而是把“陪伴”做成一种可持续的使用习惯。现在正适合把技术层重新收束到体验层，让用户先感受到放松、专注和陪伴，再逐步感知 Claude 的本地能力。

## 4. Objective

### 4.1 Product Objective

让用户一打开 LoFiClaude，就能快速进入一个稳定、安静、可停留的 lofi 房间，并在需要时自然感知 Claude 的陪伴状态。

### 4.2 Product Goals

1. 降低进入门槛，让用户快速开始播放和停留。
2. 让 Claude 成为氛围的一部分，而不是突兀的工作面板。
3. 让状态、音乐、雨声、时间和角色动作形成一致节奏。
4. 保持低打扰，避免把产品做成复杂控制台。
5. 保留本地 Claude、skills、bridge 作为增强能力，但不抢主体验。

### 4.3 Key Results

| KR | Target |
|---|---|
| KR1 | 用户首次进入后能在 10 秒内开始使用主体验 |
| KR2 | 用户不连接 bridge 也能完整使用 lofi 房间 |
| KR3 | Claude 状态能稳定表达 sleeping / idle / thinking / working / happy / blocked |
| KR4 | 用户能在不被打断的前提下完成一次轻量互动 |
| KR5 | 音频启动、场景切换、雨声控制在长时间使用中保持稳定 |
| KR6 | bridge 和 skills 作为增强层时，不破坏默认陪伴体验 |

## 5. Market Segments

### 5.1 Primary Segment: lofi 专注用户

这类用户的目标不是“和 AI 反复对话”，而是创建一个能长期陪伴自己的空间。他们可能在编码、写作、整理笔记、学习或简单放松。

他们重视：

- 安静
- 稳定
- 低干扰
- 可长期运行
- 不需要太多解释就能上手

### 5.2 Secondary Segment: 本地 Claude 用户

这类用户已经在本地使用 Claude CLI 或类似工具，希望有一个更有人味的状态层来承接工作节奏，但不想被繁重的 agent 控制界面占满。

他们重视：

- 任务状态清晰
- 陪伴感
- 本地运行
- 隐私感

### 5.3 Non-Targets

- 不做完整 IDE
- 不做复杂多人协作面板
- 不做重工作流编排平台
- 不做强运营信息流产品
- 不以 skills 市场为核心

## 6. Value Propositions

### 6.1 Core Value

LoFiClaude 提供的是“可以停留的 Claude 陪伴房间”。用户听音乐、看房间、感受状态、偶尔和 Claude 说话，而不是不断切换到工具界面。

### 6.2 User Gains

- 更容易进入专注状态
- 更少的切换成本
- 更柔和的 AI 存在感
- 更自然的情绪反馈
- 更舒适的本地使用体验

### 6.3 Pain Relief

| Pain | Product Response |
|---|---|
| 普通 AI 工具太吵 | 默认低打扰，短反馈优先 |
| 终端状态不可感知 | 用 sprite、气泡、音效和场景变化表达 |
| lofi 播放器缺少存在感 | Claude 角色成为氛围核心 |
| 本地 Claude 难以感知 | bridge 只做增强，不主导体验 |
| skills 太多太杂 | 先隐藏复杂性，只在需要时出现 |

## 7. Solution

### 7.1 UX Principles

1. 房间先于工具。
2. 氛围先于信息。
3. 陪伴先于效率。
4. 默认低打扰，必要时再展开。
5. 让用户一直知道“现在发生了什么”，但不要把技术细节硬塞给他。

### 7.2 Main User Flow

```text
打开页面
→ 进入房间
→ 听音乐 / 雨声
→ 看到 Claude 的状态
→ 需要时轻量互动
→ Claude 给出短回复或执行本地能力
→ 回到安静陪伴状态
```

### 7.3 Feature Set

#### A. Ambient Room

- lofi 播放
- 雨声控制
- 场景切换
- 计时器
- 长时间停留时的视觉节奏变化

#### B. Claude Companion

- Claude sprite 状态表达
- 气泡短句
- 轻量聊天面板
- 情绪状态和房间节奏联动
- 在空闲、思考、工作、完成时有不同反馈

#### C. Local Bridge as Enhancement

- 本地 Claude CLI 连接
- 聊天消息流式展示
- 简单工具状态提示
- 连接失败可恢复
- bridge 不连接时，主体验仍完整可用

#### D. Skills as Optional Power Layer

- skills 不作为主导航
- 只在上下文合适时推荐
- 默认只读展示
- 高风险操作必须确认
- 不把 skill 列表变成“功能海洋”

### 7.4 Interaction Rules

- 默认显示短句，不显示长说明
- 连接失败时给出下一步，不给工程噪音
- Chat 是辅助，不是首页中心
- Claude 的动作节奏要慢、柔、稳
- 用户可以不懂 bridge，也能完整使用产品

### 7.5 Technical Direction

#### Current Stack

- Svelte 5
- Vite
- Canvas 2D
- WebSocket bridge
- Node child_process
- Claude CLI

#### Recommended Optimization Focus

1. 稳定音频和场景切换。
2. 增强角色状态机。
3. 优化 bridge 的容错和恢复。
4. 让 skills 作为增强层而不是主入口。
5. 保持依赖轻量，避免引入不必要的复杂度。

### 7.6 Assumptions

- 用户愿意把 LoFiClaude 当成一个长期打开的房间。
- 用户更在意氛围和稳定，而不是重功能密度。
- 本地 Claude 能作为增强能力发挥价值，但不需要每次都显性出现。
- skills 的价值在于“适时增强”，不是“到处暴露”。

## 8. Release

### 8.1 V1 Scope

V1 应该只做三件事：

1. 把房间体验做稳。
2. 把陪伴感做清楚。
3. 把本地 Claude 作为增强层接入得更自然。

### 8.2 Later Scope

- skills 发现与推荐
- 更完整的权限与审计
- 多会话恢复
- 更丰富的情绪状态
- 更细的环境节奏控制

### 8.3 Out of Scope

- 复杂工作流编排
- 多人协作
- IDE 替代
- skills 市场
- 重型任务看板

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| 产品过度工具化 | 失去 lofi 氛围定位 | 明确房间优先，工具后置 |
| skills 暴露过多 | 体验变复杂 | 默认隐藏，只做推荐 |
| bridge 不稳定 | 陪伴感断裂 | 提升错误恢复和重连 |
| 音频体验不稳定 | 核心价值受损 | 优先处理播放和淡入淡出 |
| 状态过多 | UI 变吵 | 保持短句和低打扰 |

## 10. Success Criteria

- 用户能自然把它当作一个可长期打开的 lofi 房间。
- Claude 的存在感是陪伴型，不是压迫型。
- 不连接 bridge 时，产品仍完整可用。
- 连接 bridge 后，只增加能力，不破坏氛围。
- 用户能清楚感知“在陪伴、在思考、在工作、已完成”。

