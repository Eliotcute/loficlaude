# 任务：Claude 走动动画

Claude 现在只原地浮动/眨眼，需要加走动行为。

## 实现

### 1. 在 ClaudeSprite.js 中新增 "walk" 动画状态

**走路帧**（2 帧交替）：
```
Frame 0 (左脚在前):
   ....@@@@....
   ...@@@@@@...
   ..@@@@@@@@..
   .@@.@@@@.@@.
   .@@......@@.
   ..@@....@@..
   ...@....@...
   ....@..@....
   ...@@..@@...
   ..@@....@@..
   ..@@....@@..
   ..@@    @@..

Frame 1 (右脚在前):
   ....@@@@....
   ...@@@@@@...
   ..@@@@@@@@..
   .@@.@@@@.@@.
   .@@......@@.
   ..@@....@@..
   ...@....@...
   ....@..@....
   ....@@@@....
   ...@@..@@...
   ..@@....@@..
   ..@@    @@..
```

（Codex 请用更精致的像素矩阵，上述只是示意）

### 2. 路径移动逻辑

```javascript
class ClaudeSprite {
  constructor() {
    // 默认站立位置（右下角）
    this.homeX = width * 0.85;
    this.homeY = height * 0.75;
    this.x = this.homeX;
    this.y = this.homeY;
    
    // 走动参数
    this.isWalking = false;
    this.walkTarget = null;
    this.walkSpeed = 0.3; // px per frame
    this.walkFrame = 0;
    this.walkFrameTimer = 0;
    
    // 行为调度
    this.idleTimer = 0;
    this.nextActionTime = 30 + Math.random() * 30; // 30-60秒
  }
  
  update(dt) {
    this.floatTime += dt;
    
    if (this.isWalking) {
      this.updateWalking(dt);
    } else {
      this.idleTimer += dt;
      // 到达随机时间后开始走动
      if (this.idleTimer > this.nextActionTime) {
        this.startWalking();
      }
    }
  }
  
  startWalking() {
    // 在画面水平范围内随机选一个目标位置
    const margin = width * 0.1;
    const targetX = margin + Math.random() * (width - margin * 2);
    const targetY = this.homeY + (Math.random() - 0.5) * height * 0.05;
    
    this.walkTarget = { x: targetX, y: targetY };
    this.isWalking = true;
    this.state = 'walk';
  }
  
  updateWalking(dt) {
    // 向目标插值移动
    const dx = this.walkTarget.x - this.x;
    const dy = this.walkTarget.y - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist < 2) {
      // 到达目标
      this.x = this.walkTarget.x;
      this.y = this.walkTarget.y;
      this.isWalking = false;
      this.state = 'idle';
      this.idleTimer = 0;
      this.nextActionTime = 20 + Math.random() * 40; // 停20-60秒再走
    } else {
      // 继续移动
      const speed = this.walkSpeed * dt * 60;
      this.x += (dx / dist) * speed;
      this.y += (dy / dist) * speed;
      
      // 走路帧切换
      this.walkFrameTimer += dt;
      if (this.walkFrameTimer > 0.3) {
        this.walkFrame = 1 - this.walkFrame;
        this.walkFrameTimer = 0;
      }
    }
  }
}
```

### 3. 碰撞检测

- Claude 走路时不超出 Canvas 边界
- 走动时如果被点击，停止走路进入 jump 状态
- 不遮挡底部 mini player（y 坐标不超过某个阈值）

### 4. 偶尔"看向画面外"

每 3-4 次走动后，Claude 走到画面边缘"看风景"，停 5-8 秒再走回来。

## 验收标准

- [ ] Claude 每 30-60 秒在画面中走一次
- [ ] 走路时有帧动画（左右脚交替）
- [ ] 走到位后站住 idle
- [ ] 点击 Claude 打断走路，触发 jump
- [ ] 不走出画面边界
- [ ] npm run build 通过
