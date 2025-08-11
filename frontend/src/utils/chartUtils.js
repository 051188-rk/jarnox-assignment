// src/utils/chartUtils.js
export function sma(values = [], window) {
    const res = [];
    for (let i = 0; i < values.length; i++) {
      if (i < window - 1) {
        res.push(null);
        continue;
      }
      const slice = values.slice(i - window + 1, i + 1);
      const avg = slice.reduce((a,b)=>a+b,0) / window;
      res.push(+avg.toFixed(4));
    }
    return res;
  }
  
  // RSI: classic 14 period
  export function rsi(values = [], period = 14) {
    if (values.length < period + 1) return values.map(_=>null);
    const deltas = [];
    for (let i=1;i<values.length;i++) deltas.push(values[i] - values[i-1]);
    let gains = 0, losses = 0;
    for (let i=0;i<period;i++) {
      const d = deltas[i];
      if (d > 0) gains += d;
      else losses += Math.abs(d);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    const res = Array(period).fill(null);
    for (let i = period; i < deltas.length; i++) {
      const d = deltas[i];
      if (d > 0) {
        avgGain = (avgGain * (period - 1) + d) / period;
        avgLoss = (avgLoss * (period - 1) + 0) / period;
      } else {
        avgGain = (avgGain * (period - 1) + 0) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(d)) / period;
      }
      const rs = avgLoss === 0 ? 100 : (avgGain / avgLoss);
      const rsiVal = avgLoss === 0 ? 100 : (100 - (100 / (1 + rs)));
      // we push rsi aligned to the close corresponding to deltas[i]
      res.push(+rsiVal.toFixed(2));
    }
    // align to original values length
    return [null, ...res]; // because deltas length = values.length -1
  }
  