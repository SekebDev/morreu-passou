// Bipes de 8 bits com WebAudio, sem arquivo de áudio.
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === 'undefined') return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function play(notes: [freq: number, ms: number][], type: OscillatorType = 'square') {
  const a = audio();
  if (!a) return;
  let t = a.currentTime;
  for (const [freq, ms] of notes) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.setValueAtTime(0, t + ms / 1000 - 0.01);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + ms / 1000);
    t += ms / 1000;
  }
}

/** Chama no primeiro toque do usuário pra liberar o áudio no iOS. */
export const unlockAudio = () => audio();

export const sfx = {
  yourTurn: () => play([[523, 90], [659, 90], [784, 90], [1047, 180]]),
  died: () => play([[392, 120], [311, 120], [262, 120], [196, 260]], 'triangle'),
  tick: () => play([[880, 40]]),
  timeUp: () => play([[1047, 100], [0, 60], [1047, 100], [0, 60], [1047, 220]]),
};

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sem vibração */
  }
}
