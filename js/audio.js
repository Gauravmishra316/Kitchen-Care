/**
 * KitchenCare Audio Synthesizer & Sound FX
 * Pure Web Audio API tone generator without external audio files.
 */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.2, gainVal = 0.15) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.debug('Audio suppressed:', e);
  }
}

function playBellSound() {
  playTone(880, 'sine', 0.35, 0.2);
  setTimeout(() => playTone(1320, 'sine', 0.5, 0.18), 90);
}

function playAlertSound() {
  playTone(440, 'triangle', 0.25, 0.2);
  setTimeout(() => playTone(330, 'triangle', 0.35, 0.2), 150);
}

function playClickSound() {
  playTone(600, 'sine', 0.05, 0.08);
}

const AudioEngine = {
  playChime(type) {
    if (type === 'bell' || type === 'success') playBellSound();
    else if (type === 'alert' || type === 'error') playAlertSound();
    else playClickSound();
  }
};
