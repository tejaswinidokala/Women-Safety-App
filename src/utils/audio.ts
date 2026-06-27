/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SirenScreamPlayer {
  private audioCtx: AudioContext | null = null;
  private primaryOsc: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isSirenPlaying = false;
  private isScreamPlaying = false;
  private screamInterval: any = null;

  private init() {
    if (!this.audioCtx) {
      // Create audio context (supports standard browser Web Audio API)
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public playSiren() {
    this.stopAll();
    this.init();
    if (!this.audioCtx) return;

    this.isSirenPlaying = true;

    // Primary oscillating sound source (siren sound)
    const osc = this.audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);

    // LFO (Low Frequency Oscillator) to modulate the pitch up and down
    const lfo = this.audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1.5, this.audioCtx.currentTime); // 1.5 Hz modulation cycle

    // LFO Gain determines the depth of the siren's pitch sweep (e.g., +/- 300Hz)
    const lfoGain = this.audioCtx.createGain();
    lfoGain.gain.setValueAtTime(350, this.audioCtx.currentTime);

    // Master volume control
    const masterGain = this.audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.8, this.audioCtx.currentTime + 0.1); // subtle fade-in

    // Connections:
    // LFO -> LFO Gain -> Primary Oscillator Frequency (modulates the frequency)
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Primary Oscillator -> Master Gain -> Audio Output
    osc.connect(masterGain);
    masterGain.connect(this.audioCtx.destination);

    // Start oscillators
    osc.start();
    lfo.start();

    this.primaryOsc = osc;
    this.lfo = lfo;
    this.lfoGain = lfoGain;
    this.masterGain = masterGain;
  }

  public playScreamAlarm() {
    this.stopAll();
    this.init();
    if (!this.audioCtx) return;

    this.isScreamPlaying = true;

    const playBeep = () => {
      if (!this.audioCtx || !this.isScreamPlaying) return;

      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const alarmGain = this.audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';

      // Harsh, high frequency combinations
      osc1.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
      osc2.frequency.setValueAtTime(1250, this.audioCtx.currentTime);

      // Pitch sweep for urgency
      osc1.frequency.exponentialRampToValueAtTime(3000, this.audioCtx.currentTime + 0.3);
      osc2.frequency.exponentialRampToValueAtTime(3100, this.audioCtx.currentTime + 0.3);

      alarmGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      alarmGain.gain.linearRampToValueAtTime(1.0, this.audioCtx.currentTime + 0.05);
      alarmGain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);

      osc1.connect(alarmGain);
      osc2.connect(alarmGain);
      alarmGain.connect(this.audioCtx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(this.audioCtx.currentTime + 0.4);
      osc2.stop(this.audioCtx.currentTime + 0.4);
    };

    // Play repeating jarring alarms
    playBeep();
    this.screamInterval = setInterval(playBeep, 400);
  }

  public stopAll() {
    this.isSirenPlaying = false;
    this.isScreamPlaying = false;

    if (this.screamInterval) {
      clearInterval(this.screamInterval);
      this.screamInterval = null;
    }

    if (this.primaryOsc) {
      try {
        this.primaryOsc.stop();
      } catch (e) {}
      this.primaryOsc = null;
    }

    if (this.lfo) {
      try {
        this.lfo.stop();
      } catch (e) {}
      this.lfo = null;
    }

    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioCtx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.1);
      } catch (e) {}
      this.masterGain = null;
    }
  }

  public isPlaying() {
    return this.isSirenPlaying || this.isScreamPlaying;
  }

  public getActiveType(): 'siren' | 'scream' | null {
    if (this.isSirenPlaying) return 'siren';
    if (this.isScreamPlaying) return 'scream';
    return null;
  }
}

export const audioPlayer = new SirenScreamPlayer();
