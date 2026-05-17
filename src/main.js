import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

let app;

try {
  app = mount(App, {
    target: document.getElementById('app'),
  });
  console.log('LoFiClaude mounted successfully');
} catch (e) {
  console.error('LoFiClaude mount error:', e);
  document.getElementById('app').innerHTML = '<p style="color:#d4a574;padding:40px;font-family:monospace">Error: ' + e.message + '</p>';
}

export default app;
