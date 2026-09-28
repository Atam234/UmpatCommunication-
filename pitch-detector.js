/* Pitch detection based on the YIN difference function. Kept independent so it
   can be tested without a browser or microphone. */
(function (root, factory) {
  const detector = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = detector;
  root.HuniPitchDetector = detector;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function detectPitch(samples, sampleRate, options = {}) {
    const minFrequency = options.minFrequency || 80;
    const maxFrequency = options.maxFrequency || 1000;
    const threshold = options.threshold || 0.12;
    const size = samples.length;
    let mean = 0;

    for (let index = 0; index < size; index += 1) mean += samples[index];
    mean /= size;
    let energy = 0;
    for (let index = 0; index < size; index += 1) {
      const value = samples[index] - mean;
      energy += value * value;
    }
    const rms = Math.sqrt(energy / size);
    if (rms < 0.008) return { frequency: null, confidence: 0, rms };

    const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency));
    const maxTau = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(size / 2));
    const difference = new Float32Array(maxTau + 1);
    const cmnd = new Float32Array(maxTau + 1);
    let runningSum = 0;

    for (let tau = 1; tau <= maxTau; tau += 1) {
      let sum = 0;
      for (let index = 0; index < size - tau; index += 1) {
        const delta = samples[index] - samples[index + tau];
        sum += delta * delta;
      }
      difference[tau] = sum;
      runningSum += sum;
      cmnd[tau] = runningSum ? (sum * tau) / runningSum : 1;
    }

    let tauEstimate = -1;
    for (let tau = minTau; tau <= maxTau; tau += 1) {
      if (cmnd[tau] < threshold) {
        while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) tau += 1;
        tauEstimate = tau;
        break;
      }
    }
    if (tauEstimate === -1) return { frequency: null, confidence: 0, rms };

    const left = cmnd[Math.max(minTau, tauEstimate - 1)];
    const center = cmnd[tauEstimate];
    const right = cmnd[Math.min(maxTau, tauEstimate + 1)];
    const denominator = 2 * (2 * center - left - right);
    const betterTau = denominator ? tauEstimate + (right - left) / denominator : tauEstimate;
    const frequency = sampleRate / betterTau;
    const confidence = Math.max(0, Math.min(1, 1 - center));
    return { frequency, confidence, rms };
  }

  return { detectPitch };
});
