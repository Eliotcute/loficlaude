<script>
  export let visible = false;
</script>

{#if visible}
  <aside class="keyboard-hint" role="note" aria-label="Keyboard shortcuts">
    <div>Space 播放</div>
    <div>←→ 切歌</div>
    <div>↑↓ 雨声</div>
    <div>M 静音</div>
    <div>1-3 场景</div>
    <div>T 定时</div>
    <div>Esc 关面板</div>
    <div>H 隐藏</div>
  </aside>
{/if}

<style>
  .keyboard-hint {
    position: absolute;
    left: 20px;
    bottom: 88px;
    z-index: 7;
    border: 1px solid rgba(212, 165, 116, 0.3);
    border-radius: 8px;
    background: rgba(8, 10, 12, 0.92);
    color: #e8e0d8;
    padding: 10px 12px;
    display: grid;
    gap: 5px;
    font-size: 12px;
    line-height: 1.2;
    animation: fade-in 120ms ease;
    max-width: 160px;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 860px) {
    .keyboard-hint {
      left: 12px;
      bottom: 84px;
      font-size: 11px;
    }
  }
</style>
