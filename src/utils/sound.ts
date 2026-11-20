class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playFlap() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Soft bass thump for big elephant ear flap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.09);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    // Subtle air puff noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);
  }

  public playScore() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [659.25, 987.77]; // E5 -> B5

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const startTime = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.19);
    });
  }

  public playPeanut() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [783.99, 987.77, 1174.66]; // G5 -> B5 -> D6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startTime = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.17);
    });
  }

  public playCrateUnlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const startTime = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  public playRouletteTick() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.025);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playCrash() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Impact thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(150, now);
    thudOsc.frequency.exponentialRampToValueAtTime(42, now + 0.18);
    thudGain.gain.setValueAtTime(0.28, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.21);

    // Elephant trumpet ("Pawooo!")
    const trumpOsc1 = ctx.createOscillator();
    const trumpOsc2 = ctx.createOscillator();
    const trumpFilter = ctx.createBiquadFilter();
    const trumpGain = ctx.createGain();

    trumpOsc1.type = 'sawtooth';
    trumpOsc2.type = 'sawtooth';

    trumpOsc1.frequency.setValueAtTime(340, now + 0.04);
    trumpOsc1.frequency.linearRampToValueAtTime(520, now + 0.12);
    trumpOsc1.frequency.exponentialRampToValueAtTime(260, now + 0.42);

    trumpOsc2.frequency.setValueAtTime(345, now + 0.04);
    trumpOsc2.frequency.linearRampToValueAtTime(528, now + 0.12);
    trumpOsc2.frequency.exponentialRampToValueAtTime(264, now + 0.42);

    trumpFilter.type = 'bandpass';
    trumpFilter.frequency.setValueAtTime(950, now + 0.04);
    trumpFilter.Q.setValueAtTime(2.5, now + 0.04);

    trumpGain.gain.setValueAtTime(0.001, now + 0.04);
    trumpGain.gain.linearRampToValueAtTime(0.18, now + 0.09);
    trumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    trumpOsc1.connect(trumpFilter);
    trumpOsc2.connect(trumpFilter);
    trumpFilter.connect(trumpGain);
    trumpGain.connect(ctx.destination);

    trumpOsc1.start(now + 0.04);
    trumpOsc2.start(now + 0.04);
    trumpOsc1.stop(now + 0.45);
    trumpOsc2.stop(now + 0.45);
  }

  public playRareDropCelebration() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. CS:GO-style sub-bass explosion + metallic shatter
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(160, now);
    boomOsc.frequency.exponentialRampToValueAtTime(36, now + 0.48);
    boomGain.gain.setValueAtTime(0.42, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    boomOsc.connect(boomGain);
    boomGain.connect(ctx.destination);
    boomOsc.start(now);
    boomOsc.stop(now + 0.55);

    // Filtered explosion burst noise
    const noiseLen = Math.floor(ctx.sampleRate * 0.45);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 1.8);
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(280, now + 0.44);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSrc.start(now);

    // 2. Majestic Golden Pad Chords underneath (C major -> G major -> Am -> C major triumph)
    const chords: { freqs: number[]; start: number; dur: number }[] = [
      { freqs: [261.63, 329.63, 392.0], start: 0.08, dur: 0.72 }, // C4-E4-G4
      { freqs: [293.66, 369.99, 440.0], start: 0.75, dur: 0.65 }, // D4-F#4-A4 lift
      { freqs: [392.0, 493.88, 587.33], start: 1.35, dur: 0.65 }, // G4-B4-D5
      { freqs: [523.25, 659.25, 783.99], start: 1.95, dur: 1.35 }, // C5-E5-G5 climax
    ];
    chords.forEach((chord) => {
      chord.freqs.forEach((f) => {
        const pad = ctx.createOscillator();
        const padFilter = ctx.createBiquadFilter();
        const padGain = ctx.createGain();
        pad.type = 'sawtooth';
        pad.frequency.setValueAtTime(f, now + chord.start);
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(1400, now + chord.start);

        padGain.gain.setValueAtTime(0.001, now + chord.start);
        padGain.gain.linearRampToValueAtTime(0.055, now + chord.start + 0.08);
        padGain.gain.exponentialRampToValueAtTime(0.001, now + chord.start + chord.dur);

        pad.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(ctx.destination);
        pad.start(now + chord.start);
        pad.stop(now + chord.start + chord.dur + 0.03);
      });
    });

    // 3. Victorious Heroic Fanfare Melody + Shimmering Chimes
    const melody: { freq: number; time: number; dur: number; type: OscillatorType; vol: number }[] = [
      { freq: 523.25, time: 0.08, dur: 0.18, type: 'triangle', vol: 0.2 }, // C5
      { freq: 659.25, time: 0.22, dur: 0.18, type: 'triangle', vol: 0.2 }, // E5
      { freq: 783.99, time: 0.36, dur: 0.22, type: 'triangle', vol: 0.22 }, // G5
      { freq: 1046.5, time: 0.56, dur: 0.36, type: 'triangle', vol: 0.25 }, // C6!
      { freq: 987.77, time: 0.92, dur: 0.16, type: 'triangle', vol: 0.2 }, // B5
      { freq: 1174.66, time: 1.08, dur: 0.22, type: 'triangle', vol: 0.22 }, // D6
      { freq: 1318.51, time: 1.35, dur: 0.26, type: 'triangle', vol: 0.24 }, // E6
      { freq: 1567.98, time: 1.62, dur: 0.3, type: 'triangle', vol: 0.24 }, // G6
      { freq: 2093.0, time: 1.95, dur: 1.15, type: 'sine', vol: 0.22 }, // C7 sparkle hold!
      { freq: 1046.5, time: 1.95, dur: 1.15, type: 'triangle', vol: 0.18 }, // C6 octave reinforcement
    ];

    melody.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, now + n.time);

      gain.gain.setValueAtTime(0.001, now + n.time);
      gain.gain.linearRampToValueAtTime(n.vol, now + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur + 0.03);
    });
  }
}

export const soundEngine = new SoundEngine();
