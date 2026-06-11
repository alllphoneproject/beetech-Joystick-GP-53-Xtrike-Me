// Web Audio API Synthesizer for high-fidelity gamepad feedback and hums.

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Play a tactile click sound for standard buttons
export const playClickSound = (isRelease: boolean = false) => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isRelease ? 440 : 580, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isRelease ? 220 : 300, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // Audio synthesis not supported or blocked
  }
};

// Play a sliding clack sound for physical switches
export const playSlideSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const bpf = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);

    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(600, ctx.currentTime);
    bpf.Q.setValueAtTime(5, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(bpf);
    bpf.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Suppress error
  }
};

// Play a cool digital charge / power beep
export const playPowerBeep = (isOn: boolean) => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    if (isOn) {
      // Ascending bleeps
      const frequencies = [300, 450, 600];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (index + 1) * 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.08);
        osc.stop(now + (index + 1) * 0.08);
      });
    } else {
      // Descending beep
      const frequencies = [500, 350, 200];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (index + 1) * 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.08);
        osc.stop(now + (index + 1) * 0.08);
      });
    }
  } catch (e) {
    // Suppress error
  }
};

// Vibration motor active hum node holder
let vibrationInterval: any = null;
let vibrationOsc: OscillatorNode | null = null;
let vibrationGain: GainNode | null = null;

export const startVibrationHum = () => {
  try {
    stopVibrationHum();
    const ctx = getAudioContext();
    vibrationOsc = ctx.createOscillator();
    vibrationGain = ctx.createGain();

    vibrationOsc.type = 'sine';
    vibrationOsc.frequency.setValueAtTime(55, ctx.currentTime); // Low Rumble
    // frequency modulation
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(12, ctx.currentTime); // 12Hz wobble
    lfoGain.gain.setValueAtTime(10, ctx.currentTime); // frequency swing of 10Hz

    lfo.connect(lfoGain);
    lfoGain.connect(vibrationOsc.frequency);
    
    vibrationGain.gain.setValueAtTime(0.0, ctx.currentTime);
    vibrationGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);

    vibrationOsc.connect(vibrationGain);
    vibrationGain.connect(ctx.destination);

    lfo.start();
    vibrationOsc.start();

    // Pulse vibration rhythm
    let active = true;
    vibrationInterval = setInterval(() => {
      if (!vibrationGain || !ctx) return;
      active = !active;
      vibrationGain.gain.linearRampToValueAtTime(active ? 0.35 : 0.08, ctx.currentTime + 0.15);
    }, 350);
  } catch (e) {
    // Suppress error
  }
};

export const stopVibrationHum = () => {
  try {
    if (vibrationInterval) {
      clearInterval(vibrationInterval);
      vibrationInterval = null;
    }
    if (vibrationOsc) {
      vibrationOsc.stop();
      vibrationOsc.disconnect();
      vibrationOsc = null;
    }
    if (vibrationGain) {
      vibrationGain.disconnect();
      vibrationGain = null;
    }
  } catch (e) {
    // Suppress
  }
};
