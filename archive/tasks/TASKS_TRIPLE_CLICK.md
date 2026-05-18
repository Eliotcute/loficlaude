# 功能：三次点击 Claude 切换形态

## 需求
快速点击 Claude 小人 3 次（类似三击），切换到下一个 claudepix 预设形态。循环切换 13 个预设。

## 形态循环
```
1. idle_breathe    (默认呼吸)
2. idle_blink      (眨眼)
3. idle_look_around(环顾四周)
4. work_coding     (编码)
5. work_think      (思考)
6. dance_bounce    (弹跳)
7. dance_sway      (摇摆)
8. dance_bounce_dj (DJ弹跳)
9. dance_sway_dj   (DJ摇摆)
10. dance_djmix    (打碟)
11. expression_wink(眨眼)
12. expression_surprise(惊讶)
13. expression_sleep(睡觉)
```

## 实现

### 1. src/stores/appState.js
新增 store：
```js
export const claudeForm = writable(0); // 0-12，对应13个预设索引
```

### 2. src/components/ClaudeSprite.svelte
- 追踪点击时间戳，记录连续点击次数
- 3 次点击间隔在 800ms 以内 → claudeForm + 1
- claudeForm 达到 12 后回到 0
- claudeForm 变化时，显示短气泡提示当前预设名
- 气泡 2 秒后消失

### 3. src/canvas/spriteFrames.js
- 增加 getFormName(index) 函数返回预设名称
- 保持现有 16 帧不变，形态切换只改变 base 造型

## 验收
- [ ] 快速点 Claude 3 次，切换到下一个形态
- [ ] 第 13 次回到第 1 个
- [ ] 切换时 Claude 冒泡提示名称
- [ ] 形态名称显示中文
- [ ] npm run build 通过
