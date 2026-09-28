const notes = [
  ['C4', 261.63, 'A'], ['C#4', 277.18, 'W'], ['D4', 293.66, 'S'], ['D#4', 311.13, 'E'],
  ['E4', 329.63, 'D'], ['F4', 349.23, 'F'], ['F#4', 369.99, 'T'], ['G4', 392, 'G'],
  ['G#4', 415.3, 'Y'], ['A4', 440, 'H'], ['A#4', 466.16, 'U'], ['B4', 493.88, 'J'], ['C5', 523.25, 'K'],
];
const pitchHistory = [];
const piano = document.querySelector('#piano');
const micButton = document.querySelector('#mic-button');
const buttonLabel = document.querySelector('#mic-button-label');
const currentNote = document.querySelector('#current-note');
const octave = document.querySelector('#octave');
const frequencyLabel = document.querySelector('#frequency');
const cents = document.querySelector('#cents');
const accuracy = document.querySelector('#accuracy');
const meterFill = document.querySelector('#meter-fill');
const statusDot = document.querySelector('#status-dot');
const statusText = document.querySelector('#status-text');
let audioContext;
let analyser;
let microphone;
let stream;
let detectTimer;
let activeKey;
let detectedKey;
let lastVoicedAt = 0;

function renderPiano() {
  const whiteNotes = notes.filter(([name]) => !name.includes('#'));
  whiteNotes.forEach(([name, hz, key]) => {
    const element = document.createElement('button');
    element.className = 'key'; element.dataset.note = name;
    element.setAttribute('aria-label', `Patugtugin ang ${name}`);
    element.innerHTML = `<span class="key-label">${name}<br><small>${key}</small></span>`;
    element.addEventListener('pointerdown', () => playNote(hz, element));
    piano.appendChild(element);
  });
  notes.filter(([name]) => name.includes('#')).forEach(([name, hz, key]) => {
    const whiteBefore = notes.slice(0, notes.findIndex((note) => note[0] === name)).filter((note) => !note[0].includes('#')).length;
    const element = document.createElement('button');
    element.className = 'black-key'; element.dataset.note = name;
    element.style.left = `calc(${(whiteBefore / whiteNotes.length) * 100}% - 3.75%)`;
    element.setAttribute('aria-label', `Patugtugin ang ${name}`);
    element.innerHTML = `<span class="key-label">${key}</span>`;
    element.addEventListener('pointerdown', () => playNote(hz, element));
    piano.appendChild(element);
  });
}

function ensureAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') return audioContext.resume();
  return Promise.resolve();
}

function playNote(hz, element) {
  ensureAudio();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle'; oscillator.frequency.value = hz;
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.65);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime + 0.7);
  if (activeKey) activeKey.classList.remove('played');
  activeKey = element; element.classList.add('played');
  setTimeout(() => element.classList.remove('played'), 700);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function readMic() {
  const samples = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(samples);
  const result = HuniPitchDetector.detectPitch(samples, audioContext.sampleRate);
  if (result.frequency && result.confidence > 0.72) {
    pitchHistory.push(result.frequency);
    if (pitchHistory.length > 5) pitchHistory.shift();
    lastVoicedAt = Date.now();
    showPitch(median(pitchHistory), result.confidence);
  } else if (Date.now() - lastVoicedAt > 450) {
    pitchHistory.length = 0;
    resetReadout(true);
  }
}

async function startListening() {
  if (!window.isSecureContext && location.hostname !== 'localhost') {
    toast('Kailangan ng HTTPS para makagamit ng mikropono sa device na ito.');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('Hindi suportado ng browser ang microphone access. Subukan ang Chrome o Safari.');
    return;
  }
  try {
    await ensureAudio();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    micButton.classList.add('active'); buttonLabel.textContent = 'Itigil ang pakikinig';
    statusDot.classList.add('active'); statusText.textContent = 'Nakikinig — kumanta ng isang nota';
    lastVoicedAt = Date.now();
    detectTimer = window.setInterval(readMic, 70);
  } catch (error) {
    const message = error.name === 'NotAllowedError'
      ? 'Hindi pinayagan ang mikropono. Pindutin ang lock icon sa browser at i-Allow ang Microphone.'
      : 'Hindi mabuksan ang mikropono. Siguraduhing walang ibang app na gumagamit nito.';
    toast(message);
  }
}

function stopListening() {
  window.clearInterval(detectTimer);
  if (stream) stream.getTracks().forEach((track) => track.stop());
  if (microphone) microphone.disconnect();
  analyser = null; microphone = null; stream = null; pitchHistory.length = 0;
  if (detectedKey) detectedKey.classList.remove('detected');
  detectedKey = null; micButton.classList.remove('active'); buttonLabel.textContent = 'I-on ang mikropono';
  statusDot.classList.remove('active'); statusText.textContent = 'Handa nang makinig';
  resetReadout(false);
}

function showPitch(hz, confidence) {
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  const targetHz = 440 * Math.pow(2, (midi - 69) / 12);
  const difference = Math.round(1200 * Math.log2(hz / targetHz));
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = names[(midi + 120) % 12];
  const noteOctave = Math.floor(midi / 12) - 1;
  const tuneAccuracy = Math.max(0, Math.round((1 - Math.min(Math.abs(difference), 50) / 50) * 100));
  currentNote.textContent = noteName; octave.textContent = noteOctave; frequencyLabel.textContent = `${hz.toFixed(1)} Hz`;
  cents.textContent = difference === 0 ? 'Saktong tono' : `${difference > 0 ? '+' : ''}${difference} cents`;
  accuracy.textContent = `${tuneAccuracy}%`; meterFill.style.width = `${Math.max(tuneAccuracy, confidence * 40)}%`;
  if (detectedKey) detectedKey.classList.remove('detected');
  detectedKey = document.querySelector(`[data-note="${noteName}${noteOctave}"]`);
  if (detectedKey) detectedKey.classList.add('detected');
}

function resetReadout(listening) {
  currentNote.textContent = '—'; octave.textContent = ''; frequencyLabel.textContent = '0.0 Hz';
  cents.textContent = listening ? 'Kumanta ng isang malinaw na nota' : 'Umawit para magsimula';
  accuracy.textContent = '—'; meterFill.style.width = '0';
  if (detectedKey) detectedKey.classList.remove('detected');
  detectedKey = null;
}

function toast(message) {
  const element = document.querySelector('#toast'); element.textContent = message; element.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('show'), 5500);
}

renderPiano();
micButton.addEventListener('click', () => (stream ? stopListening() : startListening()));
document.addEventListener('keydown', (event) => {
  if (event.repeat || ['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)) return;
  const match = notes.find((note) => note[2].toLowerCase() === event.key.toLowerCase());
  if (match) playNote(match[1], document.querySelector(`[data-note="${match[0]}"]`));
});
