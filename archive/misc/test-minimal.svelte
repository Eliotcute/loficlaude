<script>
  let count = 0;
</script>

<div class="test">
  <h1>LoFiClaude</h1>
  <p>Count: {count}</p>
  <button on:click={() => count++}>+1</button>
</div>

<style>
  .test {
    padding: 40px;
    color: #e8e0d8;
    background: #0b0d0e;
    min-height: 100vh;
  }
  h1 {
    font-family: 'Press Start 2P', monospace;
    font-size: 14px;
  }
  button {
    color: #d4a574;
    background: transparent;
    border: 1px solid rgba(212,165,116,0.3);
    padding: 8px 16px;
    cursor: pointer;
  }
</style>
