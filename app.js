const notes = [
  ['C4', 261.63, 'A'], ['C#4', 277.18, 'W'], ['D4', 293.66, 'S'], ['D#4', 311.13, 'E'],
  ['E4', 329.63, 'D'], ['F4', 349.23, 'F'], ['F#4', 369.99, 'T'], ['G4', 392.0, 'G'],
  ['G#4', 415.3, 'Y'], ['A4', 440.0, 'H'], ['A#4', 466.16, 'U'], ['B4', 493.88, 'J'], ['C5', 523.25, 'K']
];
const piano = document.querySelector('#piano');
const micButton = document.querySelector('#mic-button');
const buttonLabel = document.querySelector('#mic-button-label');
const currentNote = document.querySelector('#current-note');
const octave = document.querySelector('#octave');
const frequency = document.querySelector('#frequency');
const cents = document.querySelector('#cents');
const accuracy = document.querySelector('#accuracy');
const meterFill = document.querySelector('#meter-fill');
const statusDot = document.querySelector('#status-dot');
const statusText = document.querySelector('#status-text');
let audioContext, analyser, microphone, rafId, activeKey, detectedKey;

const whiteNotes = notes.filter(([name]) => !name.includes('#'));
whiteNotes.forEach(([name, hz, key]) => {
  const el = document.createElement('button'); el.className = 'key'; el.dataset.note = name; el.dataset.hz = hz; el.setAttribute('aria-label', `Patugtugin ang ${name}`); el.innerHTML = `<span class="key-label">${name}<br><small>${key}</small></span>`; el.addEventListener('pointerdown', () => playNote(hz, el)); piano.appendChild(el);
});
notes.filter(([name]) => name.includes('#')).forEach(([name, hz, key]) => {
  const whiteBefore = notes.slice(0, notes.findIndex(n => n[0] === name)).filter(n => !n[0].includes('#')).length;
  const el = document.createElement('button'); el.className = 'black-key'; el.style.left = `calc(${(whiteBefore / whiteNotes.length) * 100}% - 3.75%)`; el.dataset.note = name; el.dataset.hz = hz; el.setAttribute('aria-label', `Patugtugin ang ${name}`); el.innerHTML = `<span class="key-label">${key}</span>`; el.addEventListener('pointerdown', () => playNote(hz, el)); piano.appendChild(el);
});

function ensureAudio() { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); }
function playNote(hz, el) { ensureAudio(); const osc = audioContext.createOscillator(), gain = audioContext.createGain(); osc.type = 'triangle'; osc.frequency.value = hz; gain.gain.setValueAtTime(.0001, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.22, audioContext.currentTime + .015); gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + .65); osc.connect(gain).connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime + .7); if (activeKey) activeKey.classList.remove('played'); activeKey = el; el.classList.add('played'); setTimeout(() => el.classList.remove('played'), 700); }
document.addEventListener('keydown', event => { if (event.repeat || event.target.tagName === 'BUTTON') return; const match = notes.find(n => n[2].toLowerCase() === event.key.toLowerCase()); if (match) playNote(match[1], document.querySelector(`[data-note="${match[0]}"]`)); });

micButton.addEventListener('click', async () => { if (microphone) return stopListening(); if (!navigator.mediaDevices?.getUserMedia) return toast('Hindi suportado ng browser ang microphone access.'); try { ensureAudio(); const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); analyser = audioContext.createAnalyser(); analyser.fftSize = 2048; microphone = audioContext.createMediaStreamSource(stream); microphone.connect(analyser); micButton.classList.add('active'); buttonLabel.textContent = 'Itigil ang pakikinig'; statusDot.classList.add('active'); statusText.textContent = 'Nakikinig sa boses mo'; detectPitch(); } catch (error) { toast('Hindi mabuksan ang mikropono. Payagan ito at subukan muli.'); } });
function stopListening() { cancelAnimationFrame(rafId); microphone.mediaStream.getTracks().forEach(track => track.stop()); microphone.disconnect(); microphone = null; if (detectedKey) detectedKey.classList.remove('detected'); detectedKey = null; micButton.classList.remove('active'); buttonLabel.textContent = 'I-on ang mikropono'; statusDot.classList.remove('active'); statusText.textContent = 'Handa nang makinig'; resetReadout(); }
function detectPitch() { const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data); const hz = autoCorrelate(data, audioContext.sampleRate); if (hz > 70 && hz < 1000) showPitch(hz); else resetReadout(); rafId = requestAnimationFrame(detectPitch); }
function autoCorrelate(buffer, sampleRate) { let rms = Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length); if (rms < .012) return -1; let bestOffset = -1, bestCorrelation = 0; const minOffset = Math.floor(sampleRate / 1000), maxOffset = Math.floor(sampleRate / 70); for (let offset = minOffset; offset < maxOffset; offset++) { let correlation = 0; for (let i = 0; i < buffer.length - offset; i++) correlation += buffer[i] * buffer[i + offset]; correlation /= buffer.length - offset; if (correlation > bestCorrelation) { bestCorrelation = correlation; bestOffset = offset; } } return bestCorrelation > .45 ? sampleRate / bestOffset : -1; }
function showPitch(hz) { const midi = Math.round(69 + 12 * Math.log2(hz / 440)); const ideal = 440 * Math.pow(2, (midi - 69) / 12); const diff = Math.round(1200 * Math.log2(hz / ideal)); const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']; const name = names[(midi + 120) % 12], oct = Math.floor(midi / 12) - 1; currentNote.textContent = name; octave.textContent = oct; frequency.textContent = `${hz.toFixed(1)} Hz`; cents.textContent = diff === 0 ? 'Saktong tono' : `${diff > 0 ? '+' : ''}${diff} cents`; const confidence = Math.max(0, 100 - Math.abs(diff) * 1.3); accuracy.textContent = `${Math.round(confidence)}%`; meterFill.style.width = `${confidence}%`; if (detectedKey) detectedKey.classList.remove('detected'); detectedKey = document.querySelector(`[data-note="${name}${oct}"]`); if (detectedKey) detectedKey.classList.add('detected'); }
function resetReadout() { currentNote.textContent = '—'; octave.textContent = ''; frequency.textContent = '0.0 Hz'; cents.textContent = microphone ? 'Magpatuloy sa pag-awit' : 'Umawit para magsimula'; accuracy.textContent = '—'; meterFill.style.width = '0'; }
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 4000); }
