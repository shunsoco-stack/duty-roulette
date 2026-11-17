export function playSpinSound(duration: number) {
  if (typeof AudioContext === "undefined") return () => {};
  let context: AudioContext;
  try {
    context = new AudioContext();
  } catch {
    return () => {};
  }
  void context.resume().catch(() => {});
  const tone = (at: number, frequency: number, length: number, volume: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + length);
  };
  for (let t = 0; t < duration / 1000; t += 0.07 + t * 0.06)
    tone(context.currentTime + t, 750, 0.025, 0.06);
  [523, 659, 784].forEach((frequency, i) =>
    tone(context.currentTime + duration / 1000 + i * 0.09, frequency, 0.3, 0.08),
  );
  const timer = setTimeout(() => {
    void context.close().catch(() => {});
  }, duration + 1000);
  return () => {
    clearTimeout(timer);
    if (context.state !== "closed") void context.close().catch(() => {});
  };
}
