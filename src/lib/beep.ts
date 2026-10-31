/** Short alert sound for new kitchen tickets and customer requests. */
export function beep(times = 1) {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      const start = ctx.currentTime + i * 0.45;
      osc.start(start);
      osc.stop(start + 0.3);
    }
  } catch {
    // sound is a nice-to-have
  }
}
