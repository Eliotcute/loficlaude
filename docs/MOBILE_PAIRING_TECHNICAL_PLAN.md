# LoFiClaude 本地手机配对技术方案

## 目标

手机通过扫描电脑端二维码，打开移动端网页并连接电脑上的 LoFiClaude Bridge。电脑继续负责 Claude session、网易云/YouTube/雨声播放和 Clawd 房间状态；手机只负责查看、对话和发送白名单控制命令。

## 产品边界

- 单用户、同一局域网、本地优先。
- 不做云端中继、账号系统、多人房间或社交功能。
- 手机不播放电脑音乐，不启动 Claude CLI，不保存网易云凭证。
- 电脑浏览器、手机浏览器和终端共享同一个 Claude session。

## 目标架构

```text
手机浏览器 ──局域网 WSS──┐
电脑浏览器 ──本机 WSS─────┼─ LoFiClaude Bridge ─ Claude session
终端 Claude CLI ─ Unix socket┘                    ├─ ncm-cli/mpv
                                                  ├─ YouTube
                                                  └─ RainPlayer
```

当前 Bridge 已有 WebSocket、事件历史、Unix socket、session 状态和音乐白名单。手机接入应复用这些边界，不新建第二个 Claude session。

## 配对流程

1. Bridge 默认只监听 `127.0.0.1`。
2. 用户在电脑端点击“连接手机”。
3. Bridge 生成一次性配对凭证，有效期 5 分钟，首次成功后立即失效。
4. Bridge 临时开启局域网监听，并生成二维码。
5. 二维码是 `http://{lan}:{pairingPort}/mobile.html?token={一次性凭证}`。token 放在 query，避免 iPhone 相机/Safari 丢掉 hash。配对成功后再从地址栏去掉 token。
6. 手机打开该 HTTP 页（不是 Vite `:5173/mobile.html`），用同源 `ws://{host}/ws` 发送现有 `{ type: "auth", token }`。iOS Safari 可能不带 Origin；升级校验以 Host 匹配 LAN 地址为准，拒绝外站 Origin。
7. Bridge 返回 `room_state`，随后重放未接收事件。
8. 用户可在电脑端点击“断开手机”，立即撤销该 pairing token 并关闭局域网监听。

二维码严禁包含 Claude key、网易云 AppID/PrivateKey、cookie、session secret 或完整对话内容。

## 网络与安全

首版使用局域网直连。局域网监听必须是显式开启的临时状态，不能启动时默认暴露。

- 绑定局域网接口时只允许 RFC1918 地址；拒绝公网地址。
- pairing token 使用高熵随机值，服务端只保存哈希或短期内存值。
- WebSocket 连接必须先 auth，未认证连接不能收到历史事件。
- 校验 Origin、token、payload 大小、消息长度和命令白名单。
- 手机命令只能是对话、场景、雨声和固定音乐控制；禁止任意 shell、路径或 CLI 参数透传。
- 配对结束、Bridge 退出或超时后撤销 token。
- 局域网连接仅用于当前本地网络，不承诺跨网络可用。

## 协议补充

客户端新增：

```json
{ "type": "auth", "token": "短期凭证", "instanceId": "可选", "cursor": 0 }
{ "type": "room_snapshot_request" }
{ "type": "music_command", "command": "pause|resume|...", "args": [] }
{ "type": "user_message", "text": "..." }
```

服务端新增：

```json
{ "type": "room_state", "value": {
  "scene": "night-street",
  "music": { "provider": "netease-local", "status": "playing", "title": "..." },
  "rain": { "type": "medium", "status": "playing", "volume": 42 },
  "claude": { "status": "talking", "sessionId": "opaque-id" },
  "companion": { "state": "speaking", "form": "..." }
} }
```

对话继续使用现有 `user_message`、`assistant_delta`、`status` 和事件 cursor。音乐和场景命令继续经过 Bridge 的固定白名单适配器。

## 多端同步规则

- Bridge 是唯一状态源，浏览器不以本地按钮状态覆盖真实状态。
- 所有状态事件带 `instanceId` 和递增 `eventId`。
- 新连接先收到完整 `room_state`，再收到 cursor 之后的事件。
- 手机断线不停止音乐；只有所有控制端断开且达到现有孤儿停止延迟，才停止由 Bridge 启动的播放器。
- Claude turn 使用单队列，电脑、手机和终端不能并行写入同一个 session。
- 回复 delta 广播给所有已认证客户端；完成、错误和中断必须有终态事件。

## 移动端体验

- 扫码后直接进入当前房间，不要求再次输入 token。
- 顶部显示电脑名称和连接状态。
- 中部显示最近对话和实时回复。
- 底部显示“电脑播放中”的来源、歌曲、播放状态、雨声和专注计时。
- 不在手机显示误导性的本地播放按钮；按钮文案使用“暂停电脑音乐”“切换到网易云”。
- 断线显示“等待电脑重新连接”，不清空本地已接收消息。

## 分阶段实施

### P0 配对闭环

- 局域网开关、二维码和一次性 token。
- 手机页面 auth、room snapshot、断开和撤销。
- 电脑浏览器继续正常使用。

### P1 实时同步

- room_state、cursor 重放和多端 Claude delta。
- 音乐、雨声、场景、Clawd 状态同步。
- 单 session 发送队列和断线恢复。

### P2 完整体验

- 移动端响应式布局。
- 配对状态、过期、撤销和错误恢复。
- 四档视口与真实手机验收。

## 验收标准

- 手机扫码后 10 秒内显示电脑当前房间状态。
- 手机发送消息，电脑和手机同时显示同一条 Claude 回复。
- 手机点击暂停，电脑实际播放器暂停且两端显示一致。
- 手机切换网易云/YouTube，不产生第二个播放器实例。
- 手机断开不会误停音乐；电脑和手机都关闭后播放器按生命周期规则停止。
- token 过期、重复使用、伪造 Origin 和超限 payload 均被拒绝。
- 不泄露任何 Claude 或网易云凭证。

