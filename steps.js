/* Step detector: peak detection on acceleration magnitude.
   Works in the browser (window.StepDetector) and in Node (module.exports) for testing. */
(function (root) {
  function StepDetector(opts) {
    const o = Object.assign(
      { threshold: 1.2, minGap: 280, maxGap: 1000, confirm: 4 },
      opts || {}
    );
    let base = null, lp = 0, above = false, last = 0, streak = 0, pending = 0, tPrev = null;

    function push(ax, ay, az, t) {
      const m = Math.sqrt(ax * ax + ay * ay + az * az);
      if (base === null) { base = m; tPrev = t; return 0; }
      const dt = Math.min(0.2, Math.max(0.005, (t - tPrev) / 1000));
      tPrev = t;
      base += (m - base) * (1 - Math.exp(-dt / 1.0));   // slow estimate of gravity
      lp += ((m - base) - lp) * (1 - Math.exp(-dt / 0.05)); // light smoothing
      let counted = 0;
      if (!above && lp > o.threshold) {
        above = true;
        const gap = t - last;
        if (gap >= o.minGap) {
          if (last === 0 || gap > o.maxGap * 1.5) { streak = 1; pending = 1; }
          else {
            streak++;
            if (streak < o.confirm) pending++;
            else if (streak === o.confirm) { pending++; counted = pending; pending = 0; }
            else counted = 1;
          }
          last = t;
        }
      } else if (above && lp < o.threshold * 0.4) {
        above = false;
      }
      return counted;
    }
    function reset() { base = null; lp = 0; above = false; last = 0; streak = 0; pending = 0; tPrev = null; }
    return { push, reset };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { StepDetector };
  else root.StepDetector = StepDetector;
})(typeof window !== 'undefined' ? window : globalThis);
