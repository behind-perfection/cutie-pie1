/* Step detector v2: peak/valley detection on the acceleration magnitude.
   A step is counted only when
     - the swing from the previous valley to this peak is big enough (prominence),
     - it is not a violent shake,
     - it comes at a walking pace (0.3 s - 1.4 s after the last step),
     - the rhythm is steady, and
     - a walking "bout" of several steps in a row has been confirmed (those steps are then added in one go).
   Works in the browser (window.StepDetector) and in Node (module.exports) for testing. */
(function (root) {
  function StepDetector(opts) {
    const o = Object.assign({ threshold: 1.2, minGap: 300, maxGap: 1400, confirm: 6, maxProm: 22, maxRaw: 14 }, opts || {});
    const promMin = o.threshold * 1.5;       // smallest peak-to-valley swing that can be a step (m/s^2)
    const delta = promMin * 0.4;              // how far the signal must turn around to confirm a peak/valley

    let base, lp1, lp2, tPrev;
    let dir, ext, extT, lastValley;
    let lastT, streak, pending, intervals, avgProm, shake, blockUntil;
    function reset() {
      base = null; lp1 = 0; lp2 = 0; tPrev = null;
      dir = 1; ext = 0; extT = 0; lastValley = null;
      lastT = 0; streak = 0; pending = 0; intervals = []; avgProm = 0; shake = 0; blockUntil = 0;
    }
    reset();

    const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

    function onPeak(peak, t) {
      if (lastValley === null) return 0;
      const prom = peak - lastValley;
      const minNow = streak >= o.confirm && avgProm ? Math.max(promMin, avgProm * 0.45) : promMin;
      if (prom < minNow) return 0;                                  // too small: a wobble, not a step
      if (prom > o.maxProm) { streak = 0; pending = 0; intervals = []; lastT = 0; return 0; } // violent shake
      const gap = t - lastT;
      if (lastT && gap < o.minGap) return 0;                        // second bump of the same step
      let counted = 0;
      let regular = true;
      if (lastT && gap <= o.maxGap && intervals.length >= 2) {
        const med = median(intervals.slice(-5));
        regular = gap >= med * 0.5 && gap <= med * 2;
      }
      if (!lastT || gap > o.maxGap || !regular) {                   // start a new candidate bout
        streak = 1; pending = 1; intervals = [];
      } else {
        intervals.push(gap); streak++;
        if (streak < o.confirm) pending++;
        else if (streak === o.confirm) { pending++; counted = pending; pending = 0; }
        else counted = 1;
      }
      avgProm = avgProm ? avgProm * 0.8 + prom * 0.2 : prom;
      lastT = t;
      return counted;
    }

    function push(ax, ay, az, t) {
      const m = Math.sqrt(ax * ax + ay * ay + az * az);
      if (base === null) { base = m; tPrev = t; ext = 0; extT = t; return 0; }
      const dt = Math.min(0.2, Math.max(0.005, (t - tPrev) / 1000));
      tPrev = t;
      base += (m - base) * (1 - Math.exp(-dt / 1.0));            // slow estimate of gravity
      const k = 1 - Math.exp(-dt / 0.06);                         // two-stage smoothing, keeps ~0.7-3 Hz
      // sustained violent movement (shaking the phone) is not walking: ignore it and drop any bout in progress
      if (Math.abs(m - base) > o.maxRaw) shake += dt * 60;
      shake *= Math.exp(-dt / 0.5);
      if (shake > 10) { blockUntil = t + 1500; streak = 0; pending = 0; intervals = []; lastT = 0; shake = 0; }
      lp1 += ((m - base) - lp1) * k;
      lp2 += (lp1 - lp2) * k;
      const v = lp2;
      let counted = 0;
      const blocked = t < blockUntil;
      if (dir === 1) {                                            // rising: looking for a peak
        if (v > ext) { ext = v; extT = t; }
        else if (ext - v > delta) { counted = blocked ? 0 : onPeak(ext, extT); dir = -1; ext = v; extT = t; }
      } else {                                                    // falling: looking for a valley
        if (v < ext) { ext = v; extT = t; }
        else if (v - ext > delta) { lastValley = ext; dir = 1; ext = v; extT = t; }
      }
      // a pause longer than the walking pace ends the bout
      if (lastT && t - lastT > o.maxGap * 1.5) { streak = 0; pending = 0; intervals = []; lastT = 0; }
      return counted;
    }
    return { push, reset, get signal() { return lp2; } };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { StepDetector };
  else root.StepDetector = StepDetector;
})(typeof window !== 'undefined' ? window : globalThis);
