import { writable, derived } from 'svelte/store';

export const hasStarted = writable(false);
export const uiMode = writable('default'); // default | focus | interactive | companion | sleep

export const player = {
  isPlaying: writable(false),
  currentTrackIndex: writable(0),
  currentTrackTitle: writable('lofi hip hop radio - beats'),
  isLoading: writable(false),
  error: writable(null)
};

export const rain = {
  volume: writable(60), // 0-100
  type: writable('medium'), // light | medium | heavy
  muted: writable(false)
};

export const scene = {
  current: writable('lofiNight'), // lofiNight | softRain | starDrift
  locked: writable(false),
  transitionProgress: writable(0)
};

export const timer = {
  active: writable(false),
  minutes: writable(45),
  remainingSeconds: writable(2700)
};

export const claude = {
  mood: writable('idle'), // idle | nod | talk | sleep | jump
  bubbleVisible: writable(false),
  bubbleText: writable(''),
  chatOpen: writable(false),
  speaking: writable(false),
  x: writable(0),
  y: writable(0),
  targetX: writable(0),
  targetY: writable(0),
  direction: writable('left'),
  mode: writable('idle'),
  idleTime: writable(7000),
  frameTime: writable(0),
  frameIndex: writable(0),
  bubbleAnchor: writable({ x: 0, y: 0 })
};

export const ui = {
  idleSince: writable(null),
  miniPlayerExpanded: writable(false),
  rainPopoverOpen: writable(false),
  timerPopoverOpen: writable(false),
  scenePopoverOpen: writable(false),
  shortcutVisible: writable(false)
};

export const uiChromeOpacity = derived(uiMode, ($uiMode) => ($uiMode === 'focus' ? 0.25 : 0.8));

export const timerLabel = derived(timer.remainingSeconds, ($remainingSeconds) => {
  const safe = Math.max(0, $remainingSeconds);
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const seconds = String(safe % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
});
