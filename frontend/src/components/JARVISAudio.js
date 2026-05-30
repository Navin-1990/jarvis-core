/**
 * JARVIS Audio System
 * 
 * Provides cinematic sound effects and voice announcements
 * for a premium JARVIS experience.
 */

class JARVISAudio {
  constructor() {
    this.audioContext = null;
    this.masterVolume = 0.7;
    this.voiceVolume = 1.0;
    this.soundVolume = 0.5;
    this.enabled = true;
    this.initialized = false;
    
    // Sound definitions using Web Audio API oscillators
    this.sounds = {
      terminalOpen: { type: 'sweep', duration: 0.3, freq: { start: 200, end: 800 } },
      terminalClose: { type: 'sweep', duration: 0.2, freq: { start: 800, end: 200 } },
      notification: { type: 'notification', duration: 0.5 },
      agentActivation: { type: 'activation', duration: 0.4, freq: { start: 400, end: 600 } },
      agentComplete: { type: 'complete', duration: 0.3, freq: { start: 600, end: 800 } },
      voiceStart: { type: 'blip', duration: 0.1, freq: 1000 },
      voiceEnd: { type: 'blip', duration: 0.1, freq: 800 },
      error: { type: 'error', duration: 0.4 },
      alert: { type: 'alert', duration: 0.6 },
      confirm: { type: 'confirm', duration: 0.2, freq: 1200 },
    };
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  init() {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.masterVolume;
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  /**
   * Resume audio context if suspended (required after user interaction)
   */
  async resume() {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Create an oscillator with envelope
   */
  createOscillator(type, frequency) {
    if (!this.audioContext) return null;
    
    const osc = this.audioContext.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    return osc;
  }

  /**
   * Create a gain node with envelope
   */
  createEnvelope(attack, decay, sustain, release, duration) {
    if (!this.audioContext) return null;
    
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.setValueAtTime(sustain, now + duration - release);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    
    return gain;
  }

  /**
   * Play a sweep sound
   */
  playSweep(startFreq, endFreq, duration) {
    if (!this.enabled || !this.audioContext) return;
    
    const osc = this.createOscillator('sine', startFreq);
    const gain = this.audioContext.createGain();
    
    const now = this.audioContext.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    
    gain.gain.setValueAtTime(this.soundVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Play a notification sound
   */
  playNotification() {
    if (!this.enabled || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Two-tone notification
    const osc1 = this.createOscillator('sine', 800);
    const osc2 = this.createOscillator('sine', 1000);
    const gain = this.audioContext.createGain();
    
    gain.gain.setValueAtTime(this.soundVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start(now);
    osc1.stop(now + 0.15);
    
    osc2.start(now + 0.15);
    osc2.stop(now + 0.3);
  }

  /**
   * Play activation sound
   */
  playActivation() {
    if (!this.enabled || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const duration = 0.4;
    
    // Rising tone with harmonics
    const osc1 = this.createOscillator('sine', 300);
    const osc2 = this.createOscillator('sine', 450);
    const osc3 = this.createOscillator('triangle', 600);
    const gain = this.audioContext.createGain();
    
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + duration);
    
    osc2.frequency.setValueAtTime(450, now);
    osc2.frequency.exponentialRampToValueAtTime(900, now + duration);
    
    osc3.frequency.setValueAtTime(600, now);
    osc3.frequency.exponentialRampToValueAtTime(1200, now + duration);
    
    gain.gain.setValueAtTime(this.soundVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start(now);
    osc1.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
    osc3.start(now);
    osc3.stop(now + duration);
  }

  /**
   * Play completion sound
   */
  playComplete() {
    if (!this.enabled || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const duration = 0.3;
    
    // Bright ascending chime
    const osc = this.createOscillator('sine', 523); // C5
    const osc2 = this.createOscillator('sine', 659); // E5
    const gain = this.audioContext.createGain();
    
    gain.gain.setValueAtTime(this.soundVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + duration);
    
    // Delayed second note
    osc2.start(now + 0.1);
    osc2.stop(now + 0.1 + duration);
  }

  /**
   * Play error sound
   */
  playError() {
    if (!this.enabled || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const duration = 0.4;
    
    // Descending dissonant tones
    const osc1 = this.createOscillator('sawtooth', 200);
    const osc2 = this.createOscillator('square', 207); // Slightly detuned for dissonance
    const gain = this.audioContext.createGain();
    
    gain.gain.setValueAtTime(this.soundVolume * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start(now);
    osc1.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
  }

  /**
   * Play alert sound
   */
  playAlert() {
    if (!this.enabled || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Three-tone alert sequence
    [0, 0.15, 0.3].forEach((delay, i) => {
      const osc = this.createOscillator('square', 800 + i * 100);
      const gain = this.audioContext.createGain();
      
      gain.gain.setValueAtTime(this.soundVolume * 0.15, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.12);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
  }

  /**
   * Play confirm sound (short positive feedback)
   */
  playConfirm() {
    if (!this.enabled || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // Quick high blip
    const osc = this.createOscillator('sine', 1200);
    const gain = this.audioContext.createGain();
    
    gain.gain.setValueAtTime(this.soundVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Play blip sound
   */
  playBlip(frequency = 1000) {
    if (!this.enabled || !this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const osc = this.createOscillator('sine', frequency);
    const gain = this.audioContext.createGain();
    
    gain.gain.setValueAtTime(this.soundVolume * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Play sound by name
   */
  play(soundName) {
    if (!this.enabled) return;
    
    // Initialize on first interaction
    if (!this.initialized) {
      this.init();
    }
    
    this.resume();
    
    const sound = this.sounds[soundName];
    if (!sound) {
      console.warn(`Unknown sound: ${soundName}`);
      return;
    }
    
    switch (sound.type) {
      case 'sweep':
        this.playSweep(sound.freq.start, sound.freq.end, sound.duration);
        break;
      case 'notification':
        this.playNotification();
        break;
      case 'activation':
        this.playActivation();
        break;
      case 'complete':
        this.playComplete();
        break;
      case 'error':
        this.playError();
        break;
      case 'alert':
        this.playAlert();
        break;
      case 'confirm':
        this.playConfirm();
        break;
      case 'blip':
        this.playBlip(sound.freq);
        break;
    }
  }

  /**
   * Text-to-Speech using Web Speech API
   */
  speak(text, options = {}) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure utterance
    utterance.rate = options.rate || 0.95;
    utterance.pitch = options.pitch || 0.95;
    utterance.volume = this.voiceVolume;
    
    // Find suitable voice (prefer British/English male voices)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = 
      voices.find(v => v.name.includes('Daniel')) ||
      voices.find(v => v.name.includes('Google UK')) ||
      voices.find(v => v.name.includes('British')) ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    return new Promise((resolve, reject) => {
      utterance.onend = resolve;
      utterance.onerror = reject;
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Queue speech for when current speech finishes
   */
  queueSpeech(text) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.95;
    utterance.volume = this.voiceVolume;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = 
      voices.find(v => v.name.includes('Daniel')) ||
      voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Stop all speech
   */
  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Set master volume
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  /**
   * Set voice volume
   */
  setVoiceVolume(volume) {
    this.voiceVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set sound effects volume
   */
  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopSpeaking();
    }
  }
}

// Create singleton instance
const jarvisAudio = new JARVISAudio();

// Export for use
export default jarvisAudio;
export { JARVISAudio };
