import type { FxConfig } from '@/hooks/useAudioRemix';

// Web Audio API based audio processor
export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private lowShelfFilter: BiquadFilterNode | null = null;
  private midPeakFilter: BiquadFilterNode | null = null;
  private highShelfFilter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  async loadAudioUrl(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    console.log('Loading audio from URL:', url);
    
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('Audio downloaded, size:', arrayBuffer.byteLength);
      
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('Audio decoded successfully, duration:', this.audioBuffer.duration);
      
      return this.audioBuffer;
    } catch (error) {
      console.error('Error loading audio URL:', error);
      throw error;
    }
  }

  private createDistortionCurve(amount: number): Float32Array | null {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount * 100) * x * 20 * deg) / (Math.PI + amount * 100 * Math.abs(x));
    }

    return curve as Float32Array;
  }

  private createReverbImpulse(duration: number, decay: number): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    return impulse;
  }

  applyFxConfig(fxConfig: FxConfig): void {
    if (!this.audioContext) return;

    // Create nodes
    this.gainNode = this.audioContext.createGain();
    this.convolverNode = this.audioContext.createConvolver();
    this.distortionNode = this.audioContext.createWaveShaper();
    this.lowShelfFilter = this.audioContext.createBiquadFilter();
    this.midPeakFilter = this.audioContext.createBiquadFilter();
    this.highShelfFilter = this.audioContext.createBiquadFilter();
    this.delayNode = this.audioContext.createDelay(1);
    this.delayFeedbackNode = this.audioContext.createGain();
    this.compressorNode = this.audioContext.createDynamicsCompressor();

    // Configure EQ
    this.lowShelfFilter.type = 'lowshelf';
    this.lowShelfFilter.frequency.value = 320;
    this.lowShelfFilter.gain.value = fxConfig.eq_low;

    this.midPeakFilter.type = 'peaking';
    this.midPeakFilter.frequency.value = 1000;
    this.midPeakFilter.Q.value = 0.5;
    this.midPeakFilter.gain.value = fxConfig.eq_mid;

    this.highShelfFilter.type = 'highshelf';
    this.highShelfFilter.frequency.value = 3200;
    this.highShelfFilter.gain.value = fxConfig.eq_high;

    // Configure distortion
    if (fxConfig.distortion_amount > 0) {
      const curve = this.createDistortionCurve(fxConfig.distortion_amount);
      if (curve) (this.distortionNode as any).curve = curve;
      this.distortionNode.oversample = '4x';
    }

    // Configure reverb
    if (fxConfig.reverb_amount > 0) {
      const reverbDuration = 1 + fxConfig.reverb_amount * 3;
      const reverbDecay = 2 + fxConfig.reverb_amount * 3;
      this.convolverNode.buffer = this.createReverbImpulse(reverbDuration, reverbDecay);
    }

    // Configure delay
    this.delayNode.delayTime.value = fxConfig.delay_time / 1000;
    this.delayFeedbackNode.gain.value = fxConfig.delay_feedback;

    // Configure compressor
    this.compressorNode.ratio.value = fxConfig.compression_ratio;
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;
  }

  async processAndExport(fxConfig: FxConfig): Promise<Blob | null> {
    if (!this.audioContext || !this.audioBuffer) {
      console.error('No audio loaded for processing');
      return null;
    }

    console.log('Processing audio with FX config:', fxConfig);

    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(
      this.audioBuffer.numberOfChannels,
      this.audioBuffer.length,
      this.audioBuffer.sampleRate
    );

    // Create source
    const source = offlineContext.createBufferSource();
    source.buffer = this.audioBuffer;

    // Apply tempo change
    if (fxConfig.tempo_change_percent !== 0) {
      source.playbackRate.value = 1 + (fxConfig.tempo_change_percent / 100);
    }

    // Create and configure nodes
    const gainNode = offlineContext.createGain();
    const lowShelf = offlineContext.createBiquadFilter();
    const midPeak = offlineContext.createBiquadFilter();
    const highShelf = offlineContext.createBiquadFilter();
    const compressor = offlineContext.createDynamicsCompressor();
    const distortion = offlineContext.createWaveShaper();

    // EQ
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 320;
    lowShelf.gain.value = fxConfig.eq_low;

    midPeak.type = 'peaking';
    midPeak.frequency.value = 1000;
    midPeak.Q.value = 0.5;
    midPeak.gain.value = fxConfig.eq_mid;

    highShelf.type = 'highshelf';
    highShelf.frequency.value = 3200;
    highShelf.gain.value = fxConfig.eq_high;

    // Distortion
    if (fxConfig.distortion_amount > 0) {
      const curve = this.createDistortionCurve(fxConfig.distortion_amount);
      if (curve) (distortion as any).curve = curve;
      distortion.oversample = '4x';
    }

    // Compressor
    compressor.ratio.value = fxConfig.compression_ratio;
    compressor.threshold.value = -24;

    // Connect nodes
    source.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    
    if (fxConfig.distortion_amount > 0) {
      highShelf.connect(distortion);
      distortion.connect(compressor);
    } else {
      highShelf.connect(compressor);
    }
    
    compressor.connect(gainNode);
    gainNode.connect(offlineContext.destination);

    // Start and render
    source.start(0);
    
    try {
      console.log('Rendering audio...');
      const renderedBuffer = await offlineContext.startRendering();
      console.log('Audio rendered, converting to WAV...');

      // Convert to WAV blob
      const wavBlob = this.audioBufferToWav(renderedBuffer);
      console.log('WAV blob created, size:', wavBlob.size);
      
      return wavBlob;
    } catch (err) {
      console.error('Error rendering audio:', err);
      return null;
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * numChannels * bytesPerSample;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const channelData = [];
    for (let i = 0; i < numChannels; i++) {
      channelData.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  play(fxConfig: FxConfig): void {
    if (!this.audioContext || !this.audioBuffer) return;

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Stop any existing playback
    this.stop();

    this.applyFxConfig(fxConfig);

    // Create source
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    // Apply tempo change
    if (fxConfig.tempo_change_percent !== 0) {
      this.sourceNode.playbackRate.value = 1 + (fxConfig.tempo_change_percent / 100);
    }

    // Connect chain
    let lastNode: AudioNode = this.sourceNode;

    if (this.lowShelfFilter) {
      lastNode.connect(this.lowShelfFilter);
      lastNode = this.lowShelfFilter;
    }

    if (this.midPeakFilter) {
      lastNode.connect(this.midPeakFilter);
      lastNode = this.midPeakFilter;
    }

    if (this.highShelfFilter) {
      lastNode.connect(this.highShelfFilter);
      lastNode = this.highShelfFilter;
    }

    if (this.distortionNode && fxConfig.distortion_amount > 0) {
      lastNode.connect(this.distortionNode);
      lastNode = this.distortionNode;
    }

    if (this.compressorNode) {
      lastNode.connect(this.compressorNode);
      lastNode = this.compressorNode;
    }

    if (this.gainNode) {
      lastNode.connect(this.gainNode);
      lastNode = this.gainNode;
    }

    lastNode.connect(this.audioContext.destination);

    // Play
    this.sourceNode.start(0);
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
      this.sourceNode = null;
    }
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}