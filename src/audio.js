// ============================================================================
// Audio System — Procedural Web Audio API Synthesis
// ============================================================================

export class AudioSystem {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    this.isPlaying = false;
    this.masterGain = null;
    this.oscillators = [];
    this.analyser = null;
    this.fftSize = 8192;
    this.dataArray = null;
    this.callback = null;
    this.synthNodes = {};
    this.particles = [];
    this.time = 0;
  }

  async init(callback) {
    if (this.isInitialized) {
      if (callback) callback(true);
      return true;
    }

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);

      // Create analyser for FFT
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.masterGain);

      // Create data array for frequency analysis
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Create synthesis chains
      this.createSynthesisChains();

      this.isInitialized = true;
      this.isPlaying = true;

      if (callback) callback(true);

      return true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
      if (callback) callback(false);
      return false;
    }
  }

  createSynthesisChains() {
    // Ambient drone oscillator
    this.synthNodes.drone = {
      osc: this.audioContext.createOscillator(),
      gain: this.audioContext.createGain(),
      filter: this.audioContext.createBiquadFilter()
    };

    this.synthNodes.drone.osc.type = 'sawtooth';
    this.synthNodes.drone.osc.frequency.value = 55; // A1
    this.synthNodes.drone.gain.gain.value = 0.05;

    this.synthNodes.drone.filter.type = 'lowpass';
    this.synthNodes.drone.filter.frequency.value = 200;
    this.synthNodes.drone.filter.Q.value = 1;

    this.synthNodes.drone.osc.connect(this.synthNodes.drone.filter);
    this.synthNodes.drone.filter.connect(this.synthNodes.drone.gain);
    this.synthNodes.drone.gain.connect(this.masterGain);

    // High-frequency shimmer
    this.synthNodes.shimmer = {
      osc: this.audioContext.createOscillator(),
      gain: this.audioContext.createGain(),
      filter: this.audioContext.createBiquadFilter()
    };

    this.synthNodes.shimmer.osc.type = 'sine';
    this.synthNodes.shimmer.osc.frequency.value = 880; // A5
    this.synthNodes.shimmer.gain.gain.value = 0.02;

    this.synthNodes.shimmer.filter.type = 'highpass';
    this.synthNodes.shimmer.filter.frequency.value = 500;
    this.synthNodes.shimmer.filter.Q.value = 0.5;

    this.synthNodes.shimmer.osc.connect(this.synthNodes.shimmer.filter);
    this.synthNodes.shimmer.filter.connect(this.synthNodes.shimmer.gain);
    this.synthNodes.shimmer.gain.connect(this.masterGain);

    // Noise generator for texture
    this.synthNodes.noise = {
      buffer: this.createNoiseBuffer(2),
      source: null,
      gain: this.audioContext.createGain()
    };

    this.synthNodes.noise.gain.gain.value = 0.01;
    this.synthNodes.noise.gain.connect(this.masterGain);

    // Start oscillators
    this.synthNodes.drone.osc.start();
    this.synthNodes.shimmer.osc.start();

    // Start noise loop
    this.startNoiseLoop();
  }

  createNoiseBuffer(duration) {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  startNoiseLoop() {
    const playNoise = () => {
      if (!this.isPlaying) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = this.synthNodes.noise.buffer;
      source.connect(this.synthNodes.noise.gain);
      source.start();
      source.stop(this.audioContext.currentTime + 2);

      // Schedule next loop
      setTimeout(playNoise, 1900);
    };

    playNoise();
  }

  update(deltaTime) {
    if (!this.isInitialized || !this.isPlaying) return;

    this.time += deltaTime;

    // Update frequency analysis
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
    }

    // Modulate drones based on time
    if (this.synthNodes.drone) {
      const modFreq = 55 + Math.sin(this.time * 0.3) * 2 + Math.sin(this.time * 0.7) * 1;
      this.synthNodes.drone.osc.frequency.setValueAtTime(modFreq, this.audioContext.currentTime);
    }

    // Modulate shimmer
    if (this.synthNodes.shimmer) {
      const modFreq = 880 + Math.sin(this.time * 1.1) * 10 + Math.sin(this.time * 2.3) * 5;
      this.synthNodes.shimmer.osc.frequency.setValueAtTime(modFreq, this.audioContext.currentTime);
    }

    // Update particles based on audio
    this.updateParticles(deltaTime);
  }

  updateParticles(deltaTime) {
    if (!this.dataArray) return;

    // Calculate average volume
    const avgVolume = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
    const normVolume = avgVolume / 255;

    // Add new particles based on volume
    if (normVolume > 0.1) {
      const count = Math.floor(normVolume * 10);
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1.0,
          decay: 0.005 + Math.random() * 0.01,
          color: [
            0.5 + Math.random() * 0.5,
            0.0 + Math.random() * 0.5,
            0.5 + Math.random() * 0.5,
            1.0
          ]
        });
      }
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getFrequencyData() {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  getAverageVolume() {
    if (!this.dataArray) return 0;
    return this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length / 255;
  }

  getFrequencyRange(minFreq, maxFreq) {
    if (!this.dataArray) return 0;

    const nyquist = this.audioContext.sampleRate / 2;
    const binWidth = nyquist / this.analyser.frequencyBinCount;
    const minBin = Math.floor(minFreq / binWidth);
    const maxBin = Math.floor(maxFreq / binWidth);

    let sum = 0;
    for (let i = minBin; i <= maxBin && i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }

    return sum / (maxBin - minBin + 1) / 255;
  }

  getBass() {
    return this.getFrequencyRange(20, 250);
  }

  getMid() {
    return this.getFrequencyRange(250, 4000);
  }

  getTreble() {
    return this.getFrequencyRange(4000, 16000);
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
  }

  pause() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
    this.isPlaying = false;
  }

  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
    }
  }

  playSignalTone(frequency = 440, duration = 0.5, type = 'sine') {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0.2;

    osc.connect(gain);
    gain.connect(this.masterGain);

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  destroy() {
    this.isPlaying = false;

    // Stop all oscillators
    Object.values(this.synthNodes).forEach(node => {
      if (node.osc && node.osc.stop) {
        node.osc.stop();
      }
    });

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
  }
}

// Factory function for easier use
export function createAudioSystem() {
  return new AudioSystem();
}