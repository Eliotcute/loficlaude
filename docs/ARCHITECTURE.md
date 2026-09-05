# LoFiClaude 产品架构

```mermaid
flowchart TB
    User["用户"] --> Room["Svelte 房间界面"]
    Terminal["终端用户"] --> Socket["Unix Socket CLI"]

    subgraph Browser["浏览器应用"]
        Room --> View["氛围与交互层<br/>ASCII 场景 / Claw / Header / Player / Chat"]
        Room --> Orch["编排层<br/>claudeOrch / session / audioInit"]
        Orch <--> Stores["Svelte Stores<br/>房间 / 音频 / Bridge / 专注状态"]
        Stores <--> Persist["浏览器存储<br/>LocalStorage / SessionStorage"]

        Orch --> Music["YouTubePlayer"]
        Orch --> LocalMusic["Bridge Music State"]
        Orch --> Rain["RainPlayer"]
        Rain --> LocalRain["Web Audio 本地雨声<br/>失败 fallback"]
        Rain --> RemoteRain["Rainy Mood 真实雨声音源"]
        RemoteRain -. "失败时" .-> Fallback["本地 Web Audio fallback"]

        Orch --> Companion["ClaudeChat<br/>本地陪伴文案"]
        Orch <--> Client["Bridge Client"]
    end

    Music --> YouTube["YouTube iframe API"]
    LocalMusic <-->|"music_command / music_state"| Bridge
    Client <-->|"ws://localhost:9120<br/>token 认证"| Bridge["本机 Bridge"]

    subgraph LocalRuntime["本机运行时"]
        Bridge --> ClaudeSession["Claude CLI 会话"]
        Bridge --> Netease["ncm-cli / mpv"]
        Bridge <--> SessionState["私有状态文件<br/>仅 Claude session id"]
        Socket <--> Bridge
    end

    Persist --> LocalData["房间偏好 / 专注记录 / 7 天聊天历史"]
    Persist --> SessionToken["当前会话 Bridge token"]
```

## 边界

- 浏览器负责呈现、状态编排、音频控制和本地持久化。
- Bridge 只在本机监听，验证 token 后转发浏览器或 Unix Socket 消息。
- Claude CLI 是实际的流式文本对话会话；Bridge 固定禁用 Claude 内置工具，不读取或修改项目文件，也不运行命令。Bridge 离线时房间和本地陪伴仍可使用。
- V1.1 默认使用 Rainy Mood 真实雨声；远端失败时切换本地 Web Audio fallback，公开发布前确认音频授权。
- Bridge token 每个服务进程轮换，只在当前浏览器 SessionStorage 保存；聊天历史只存入 LocalStorage，不进入第三方请求参数。
