# LoFiClaude v1.0 — 测试与 Bug 检测 PRD

> 状态：Ready
> 目标：全量回归测试 + bug 检测 + 性能基准
> 当前基线：11/11 tests pass, build clean

---

## 1. 测试矩阵

### Layer 1: 单元测试（`npm test`）

| # | 测试 | 预期 | 当前 |
|---|------|------|------|
| 1 | bridge client auth + forward + callbacks | pass | ✅ |
| 2 | resetBridgeState 重置 stores | pass | ✅ |
| 3 | 8 个 preset forms 正确导出 | pass | ✅ |
| 4 | nap + journal 有独特 baseRows | pass | ✅ |
| 5 | form/frame lookup 归一化 | pass | ✅ |
| 6 | socket server 创建启动 | pass | ✅ |
| 7 | socket 客户端连接 | pass | ✅ |
| 8 | broadcast 发送数据到客户端 | pass | ✅ |
| 9 | 行缓冲输入 onClientData | pass | ✅ |
| 10 | 多客户端 broadcast | pass | ✅ |
| 11 | close 清理 socket 文件 | pass | ✅ |

### Layer 2: 功能回归测试

| # | 功能 | 验证方式 |
|---|------|---------|
| 12 | Start room → 音乐播放 | 浏览器：点击 Start room → iframe 加载 YouTube |
| 13 | Bridge 连接 | 浏览器：填 token → Connect → 状态变 "bridge connected" |
| 14 | Claude 气泡出现 | 浏览器：点击 Claude sprite → 气泡显示 |
| 15 | 首轮对话（气泡模式） | 发消息 → 气泡保留，显示双边对话 |
| 16 | 打字机效果 | Claude 回复时末尾显示琥珀色像素块闪烁 |
| 17 | 第二轮对话（面板模式） | 发第二条 → 面板打开，全量历史可见 |
| 18 | 8 个音乐频道切换 | 点 Next track ×8 → 每个播放 |
| 19 | 播放失败 auto-failover | 篡改 YouTube ID → 自动 skip |
| 20 | 自定义 URL | + 按钮 → 输入 URL → 添加到 playlist |
| 21 | Claude 走动暂停 | 对话中 Claude sprite 静止；完成后 15s 恢复 |
| 22 | 三击形态切换 | 800ms 内 3 次点击 → 切换 form，气泡显示名称 |
| 23 | 断连红色脉冲 | 不启 Bridge → 发送消息 → 红色抖动 + 提示 |
| 24 | 对话持久化 | 对话 → F5 → 历史恢复 |
| 25 | z-index 层级 | 面板不被 MiniPlayer 遮挡 |

### Layer 3: Unix Socket 端到端

| # | 测试 | 验证方式 |
|---|------|---------|
| 26 | socket 文件存在 | `node bridge/index.js` → `ls /tmp/loficlaude-claude.sock` |
| 27 | 终端连接 | `socat - UNIX-CONNECT:/tmp/loficlaude-claude.sock` 成功 |
| 28 | 终端看到 Claude 回复 | 浏览器发消息 → socat 终端看到纯文本输出 |
| 29 | 终端输入 | socat 打字 → 浏览器看到 Claude 回复 |
| 30 | 双向同时 | 浏览器 + 终端同时发消息 → 不冲突 |

### Layer 4: 边界情况

| # | 场景 | 预期行为 |
|---|------|---------|
| 31 | 空消息发送 | 不发送，input 保留 |
| 32 | 超长消息（2000+ 字符） | 正常发送，不截断 |
| 33 | 快速连发 5 条 | loading 锁阻止，第 2-5 条被忽略 |
| 34 | Bridge 中途断连 | 消息标记 interrupted，显示 reconnect 按钮 |
| 35 | localStorage 满 | 静默降级，不崩溃 |
| 36 | YouTube 视频死链 | auto skip 到下一个 |
| 37 | 未 Start room 直接 Connect | Connect 正常，音乐未启动 |
| 38 | 切换场景 | 场景动画 crossfade，不卡顿 |
| 39 | 雨声音量 0→100→0 | 滑动正常，不爆音 |
| 40 | Timer 到 0 | 音乐暂停 + 雨声 fadeout + Claude 进入 sleep |

### Layer 5: 控制台检查

| # | 检查项 | 标准 |
|---|--------|------|
| 41 | 0 LoFiClaude JS errors | 除 YouTube DoubleClick CORS 外无 error |
| 42 | AudioContext 不早于用户手势 | 首次 load 不创建 AudioContext |
| 43 | WebSocket 无重连风暴 | 断连后不疯狂重连 |

---

## 2. Bug 检测流程

### 疑似 Bug 分类

| 严重度 | 标准 | 示例 |
|--------|------|------|
| P0 | 用户无法完成核心流程 | 发送消息后无回复 |
| P1 | 功能可用但体验显著受损 | 面板被遮挡 |
| P2 | 边缘场景异常 | 场景切换抖动 |
| P3 | 美化/优化 | 动画不够流畅 |

### 检测命令

```bash
# 1. 单元测试
npm test

# 2. 构建验证
npm run build

# 3. Bridge 启动
node bridge/index.js
# → 检查：token 打印、socket 路径、端口监听

# 4. 前端 dev server
npm run dev
# → 浏览器 :5173，DevTools console 检查

# 5. 代码质量
npx eslint src/ bridge/ --ext .js,.svelte 2>/dev/null || echo "no eslint config"
```

### 浏览器手动测试路径

```
1. 打开 :5173
2. F12 → Console → 清空
3. Start room → 确认音乐播放
4. 填 token → Connect → 确认 "bridge connected"
5. 点 Claude → 气泡出现 → 输入 "你好"
6. 等待回复 → 检查打字机效果
7. 输入第二条消息 → 确认面板打开
8. 切 8 个音乐频道
9. 三击 Claude → 确认形态切换
10. 断开 Bridge → 发送消息 → 红色脉冲
```

---

## 3. 性能基准

| 指标 | 当前 | 警戒值 |
|------|------|--------|
| 首屏加载 | ~280ms (Vite build) | >500ms |
| JS bundle | 125 KB gzipped 42 KB | >200 KB |
| CSS bundle | 17 KB gzipped 4 KB | >30 KB |
| 测试耗时 | ~240ms (11 tests) | >1000ms |
| Bridge 启动 | <1s | >3s |
| WebSocket 消息延迟 | <100ms (localhost) | >500ms |

---

## 4. 执行计划

1. `npm test` — 确认 11/11
2. `npm run build` — 确认 clean
3. 启动 Bridge + Dev server
4. 逐项跑 Layer 2 功能回归（#12-25）
5. Layer 3 socket 测试（#26-30，需要真实 macOS 环境）
6. Layer 4 边界情况（#31-40，自动化 + 手动）
7. Layer 5 控制台检查（#41-43）
8. 汇总 bug 清单 + 修复建议
