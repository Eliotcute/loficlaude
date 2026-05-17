# LoFiClaude v0.6 — 完整产品路线图

> 状态：Product Roadmap
> 合并：v0.4（ASCII 背景 + Claude Motion）+ v0.5（Local Bridge + 编码伴侣）
> 设计原则：**Less player, more place. Less chat app, more companion. Web is the stage, local Claude is the brain.**

---

## 1. 产品一句话

**一个在 ASCII 雨夜里陪你和本地 Claude 一起编码的 lofi 空间。**

---

## 2. 产品定位

| 维度 | 定义 |
|------|------|
| 产品类型 | Ambient coding companion / lofi room |
| 核心体验 | 打开页面 = 进入一个雨夜房间，有 lofi、雨声、ASCII 夜景、Claude 小人 |
| Claude 定位 | 本地 Claude 的可视化分身 — 你问它，它在终端工作，Web 小人同步状态 |
| 差异化 | 不是普通 lofi 播放器，不是普通 AI chat，是**有氛围的本地编码伴侣** |

---

## 3. 分层架构（6 层）

```
Layer 1: 背景层
  ASCII 程序化点阵场景（窗外夜景/城市/星球）
  Off-screen Canvas 缓存 → 零 CPU
  CSS 慢速平移视差效果

Layer 2: 环境层
  雨滴粒子（密度联动 rain volume）
  星星闪烁 / 流星
  暗角 overlay
  城市灯光微闪

Layer 3: Claude 角色层
  DOM Sprite（CSS transform GPU 加速）
  像素矩阵绘制（24×24 → 96×96）
  走动路径 + 边界避让
  状态：idle / walk / thinking / talking / working / blocked / sleep

Layer 4: 连接层（v0.5 新增）
  Local Bridge ← WebSocket → Web 页面
  事件协议（文本 + 状态 + 命令）
  连接/断连/重连状态管理

Layer 5: 对话层
  Claude 气泡（短反馈，跟随角色坐标）
  Chat Panel（长回答，流式文本）
  对话历史 localStorage

Layer 6: UI 层
  AmbientHeader（品牌 + 场景 + timer）
  PlayerDrawer（collapsed / expanded）
  Popovers（rain/timer/scene）
  Keyboard shortcuts
  Idle fade
```

---

## 4. 功能矩阵

### 4.1 v0.4 已完成功能（基线）

| 功能 | 状态 | 说明 |
|------|------|------|
| ASCII 程序化背景 | ✅ | 3 场景：lofi-night / soft-rain / star-drift |
| 点阵渲染器 | ✅ | asciiRenderer.js + off-screen cache |
| 环境粒子 | ✅ | 雨滴密度联动、星星闪烁、流星 |
| Claude DOM Sprite | ✅ | CSS transform 定位，GPU 加速 |
| Claude 走动动画 | ✅ | 随机路径 + 边界避让 |
| Claude 状态机 | ✅ | idle / walk / talk / sleep |
| 像素矩阵定义 | ✅ | spriteFrames.js |
| YouTube lofi 播放 | ✅ | 多流切换 + 错误跳过 |
| 雨声叠加 | ✅ | 3 种强度（MP3 文件就位） |
| 播放器 Drawer | ✅ | collapsed / expanded 两态 |
| 快捷键 | ✅ | 11 组快捷键 |
| localStorage 持久化 | ✅ | 场景/音量/歌曲/定时 |
| 场景切换 | ✅ | 3 场景 + lock 机制 |
| 气泡 + 聊天面板 | ✅ | Claude 交互 UI |

### 4.2 v0.5 待开发功能（连接层）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| Local Bridge 服务 | P0 | Node WebSocket 服务，连本地 Claude |
| 事件协议 | P0 | WebSocket JSON 协议（文本 + 状态事件） |
| 连接 UI | P0 | 连/断连按钮 + 状态指示 |
| Claude 工作状态同步 | P0 | thinking / working / talking / blocked / done |
| 流式文本 | P1 | Claude 输出逐字显示 |
| 连接安全 | P1 | local token + origin 校验 |
| 断连自动重连 | P1 | exponential backoff |
| multi-runtime 支持 | P2 | Claude Code / Codex CLI / generic PTY |

### 4.3 v0.6 新增优化（本轮）

| 优化 | 优先级 | 说明 |
|------|--------|------|
| CSS 视差平移 | P1 | 背景慢速左右移动，像 Claude FM |
| Claude 更多状态 | P1 | 新增 thinking / working / blocked / happy |
| 场景细节丰富 | P2 | 窗户框、桌面植物、海报框等 |
| 无操作空状态 | P1 | 未连接时 Claude 蜷缩 + "Connect" 提示 |
| 所有场景切换使用 crossfade | P1 | 统一动画 |
| 错误边界 | P2 | 全局 error boundary + 崩溃恢复 |
| 基础 CI | P2 | svelte-check + build 验证 |
| README 完整化 | P1 | 安装/运行/Bridge/快捷键/API 说明 |
| 日志系统 | P2 | 结构化日志便于调试 |

---

## 5. Local Bridge 协议

### 5.1 Web → Bridge（用户消息）

```json
{
  "type": "user_message",
  "text": "帮我分析这个构建失败"
}
```

### 5.2 Bridge → Web（Claude 输出 + 状态）

```json
{"type": "status", "value": "thinking"}
{"type": "assistant_delta", "text": "我先看一下错误信息..."}
{"type": "tool_running", "name": "npm run build"}
{"type": "status", "value": "working"}
{"type": "done"}
```

### 5.3 连接状态

| 状态 | Claude 表现 | 说明 |
|------|------------|------|
| disconnected | 睡觉 / 灰色 | 初始状态 |
| connected | idle / 看雨 | 已连接但未工作 |
| thinking | 低头 / 眨眼 | Claude 在思考 |
| working | 看终端方向 | 执行命令 |
| talking | 点头 / 说话 | 输出文本 |
| blocked | 停住 / 等待 | 需要用户确认 |
| done | 点头 + 暖光 | 任务完成 |
| error | 困惑表情 | 出错了 |

---

## 6. 实施路线图

### Phase 1：稳定 v0.4（1-2 天）

```
目标：修完已知 bug，提升细节完成度
```

- [ ] P0: Claude 压扁修复（已验证）
- [ ] P0: 雨声自动播放修复（已验证）
- [ ] P1: CSS 背景视差平移
- [ ] P1: 场景 crossfade 统一
- [ ] P1: 新增 thinking / working / blocked / happy 状态
- [ ] P1: 无连接时的空状态 UI
- [ ] P1: README 完整化

### Phase 2：Local Bridge（3-5 天）

```
目标：完成一次 Web → Bridge → Claude CLI 对话闭环
```

- [ ] 创建 `bridge/` 目录，Node WebSocket 服务
- [ ] 实现事件协议
- [ ] Claude Code 标准输入/输出适配
- [ ] Web 端连接 UI
- [ ] 状态同步
- [ ] 流式文本
- [ ] 安全：local token + origin 校验
- [ ] 断连重连

### Phase 3：润色 + 微交互（2-3 天）

```
目标：让 Claude 像"活着的伴侣"
```

- [ ] hover 反应（转头 / 眨眼）
- [ ] 点击动画
- [ ] 状态切换过渡
- [ ] 场景氛围联动（命令执行时灯光闪）
- [ ] 错误边界
- [ ] 基础 CI

### Phase 4：发布

```
目标：可用可分享
```

- [ ] README 完整
- [ ] 安装/运行文档
- [ ] Bridge 零配置启动
- [ ] 版本 tag

---

## 7. 不做的事情（Scope Guard）

- ❌ 不做双 Claude（Web 一个 API + 终端另一个）
- ❌ 不做完整 IDE 替代品
- ❌ 不做多人协作
- ❌ 不做公网部署（仅 localhost）
- ❌ 不做 3D / WebGL
- ❌ 不做移动端适配
- ❌ 不做游戏化养成
- ❌ 不做大聊天应用 UI

---

## 8. 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| Claude 渲染 | DOM sprite（不是 Canvas） | GPU 加速、交互免费、气泡跟随简单 |
| 背景生成 | 程序化 ASCII（不是图片/视频） | 零外部依赖、风格统一、性能好 |
| 连接方案 | WebSocket（不是 HTTP polling） | 双向实时、流式文本、状态推送 |
| Bridge 平台 | Node.js | 跨平台、npm 生态、CLI 友好 |
| 角色像素 | 程序绘制矩阵（不是 sprite sheet PNG） | 无素材管理、可动态修改 |
| 音频 | Howler.js（不是 Web Audio API 裸用） | 循环/淡出/多轨开箱即用 |
| 状态管理 | Svelte writable stores | 轻量无依赖 |
| 字体 | Press Start 2P + IBM Plex Mono | 像素感 + 可读性平衡 |

---

## 9. 质量目标

| 指标 | 目标 |
|------|------|
| Bundle size | < 150KB gzip |
| CPU 空闲占用 | < 2% |
| Claude 点击响应 | < 100ms |
| Bridge 连接 | < 2s |
| 场景切换 | < 500ms |
| 构建时间 | < 2s |
| 无测试脚本 | ❌ 待加 svelte-check |

---

## 10. 版本标签

```bash
v0.3  ← Phase 1-4 MVP（Canvas 5 层引擎 + 旧架构）
v0.4  ← ASCII 背景 + DOM Claude + 状态机 + 运动系统
v0.5  ← git tag 待创建（Phase 1 稳定后）
v0.6  ← Local Bridge + 编码伴侣
```
