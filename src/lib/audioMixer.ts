const DEFAULT_VOCAL_GAIN = 1.08;
const DEFAULT_INSTRUMENTAL_GAIN = 0.7;

export interface RenderMixedSongOptions {
  vocalUrl: string;
  instrumentalUrl: string;
  vocalGain?: number;
  instrumentalGain?: number;
}

const getAudioContext = () => {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('This browser does not support audio rendering.');
  }

  return new AudioContextClass();
};

const writeString = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

const audioBufferToWav = (buffer: AudioBuffer) => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = Array.from({ length: numberOfChannels }, (_, index) => buffer.getChannelData(index));
  let offset = 44;

  for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channelIndex][sampleIndex] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

const decodeAudio = async (context: AudioContext, url: string) => {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });

  if (!response.ok) {
    throw new Error(`Failed to load audio: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return await context.decodeAudioData(arrayBuffer.slice(0));
};

export const renderMixedSong = async ({
  vocalUrl,
  instrumentalUrl,
  vocalGain = DEFAULT_VOCAL_GAIN,
  instrumentalGain = DEFAULT_INSTRUMENTAL_GAIN,
}: RenderMixedSongOptions) => {
  const decodeContext = getAudioContext();

  try {
    const [vocalBuffer, instrumentalBuffer] = await Promise.all([
      decodeAudio(decodeContext, vocalUrl),
      decodeAudio(decodeContext, instrumentalUrl),
    ]);

    const sampleRate = Math.max(vocalBuffer.sampleRate, instrumentalBuffer.sampleRate, 44100);
    const duration = Math.max(vocalBuffer.duration, instrumentalBuffer.duration);
    const length = Math.ceil(duration * sampleRate);
    const offlineContext = new OfflineAudioContext(2, length, sampleRate);

    const vocalSource = offlineContext.createBufferSource();
    vocalSource.buffer = vocalBuffer;

    const instrumentalSource = offlineContext.createBufferSource();
    instrumentalSource.buffer = instrumentalBuffer;
    instrumentalSource.loop = instrumentalBuffer.duration < duration - 0.25;

    const vocalHighPass = offlineContext.createBiquadFilter();
    vocalHighPass.type = 'highpass';
    vocalHighPass.frequency.value = 90;

    const vocalPresence = offlineContext.createBiquadFilter();
    vocalPresence.type = 'peaking';
    vocalPresence.frequency.value = 3200;
    vocalPresence.Q.value = 0.9;
    vocalPresence.gain.value = 2.5;

    const vocalCompressor = offlineContext.createDynamicsCompressor();
    vocalCompressor.threshold.value = -18;
    vocalCompressor.knee.value = 18;
    vocalCompressor.ratio.value = 3.2;
    vocalCompressor.attack.value = 0.004;
    vocalCompressor.release.value = 0.14;

    const instrumentalLowShelf = offlineContext.createBiquadFilter();
    instrumentalLowShelf.type = 'lowshelf';
    instrumentalLowShelf.frequency.value = 180;
    instrumentalLowShelf.gain.value = -1.5;

    const instrumentalHighShelf = offlineContext.createBiquadFilter();
    instrumentalHighShelf.type = 'highshelf';
    instrumentalHighShelf.frequency.value = 5600;
    instrumentalHighShelf.gain.value = -0.8;

    const vocalGainNode = offlineContext.createGain();
    vocalGainNode.gain.value = vocalGain;

    const instrumentalGainNode = offlineContext.createGain();
    instrumentalGainNode.gain.value = instrumentalGain;

    const masterCompressor = offlineContext.createDynamicsCompressor();
    masterCompressor.threshold.value = -13;
    masterCompressor.knee.value = 12;
    masterCompressor.ratio.value = 2.4;
    masterCompressor.attack.value = 0.003;
    masterCompressor.release.value = 0.18;

    const limiter = offlineContext.createDynamicsCompressor();
    limiter.threshold.value = -2.5;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;

    const outputGain = offlineContext.createGain();
    outputGain.gain.value = 0.96;

    vocalSource.connect(vocalHighPass);
    vocalHighPass.connect(vocalPresence);
    vocalPresence.connect(vocalCompressor);
    vocalCompressor.connect(vocalGainNode);
    vocalGainNode.connect(masterCompressor);

    instrumentalSource.connect(instrumentalLowShelf);
    instrumentalLowShelf.connect(instrumentalHighShelf);
    instrumentalHighShelf.connect(instrumentalGainNode);
    instrumentalGainNode.connect(masterCompressor);

    masterCompressor.connect(limiter);
    limiter.connect(outputGain);
    outputGain.connect(offlineContext.destination);

    vocalSource.start(0);
    instrumentalSource.start(0);

    const rendered = await offlineContext.startRendering();
    return audioBufferToWav(rendered);
  } finally {
    await decodeContext.close();
  }
};