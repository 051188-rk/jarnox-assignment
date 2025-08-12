import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  TimeScale // <-- this is the missing one
} from 'chart.js';

import 'chartjs-adapter-date-fns'; // Needed for time parsing/formatting

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale, // <-- register it here
  Title,
  Tooltip,
  Legend
);

import { Chart } from 'react-chartjs-2';
import { sma, rsi } from './utils/chartUtils';


ChartJS.register(
  TimeScale, LinearScale, CategoryScale,
  PointElement, LineElement, BarElement,
  Tooltip, Legend, Filler
);

export default function StockChart({ data }) {
  // data: array of { date, open, high, low, close, volume }
  const prepared = useMemo(() => {
    if (!data || data.length === 0) return null;
    const labels = data.map(d => new Date(d.date));
    const closes = data.map(d => Number(d.close));
    const opens = data.map(d => Number(d.open || d.close));
    const highs = data.map(d => Number(d.high || d.close));
    const lows = data.map(d => Number(d.low || d.close));
    const volumes = data.map(d => Number(d.volume || 0));

    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const rsiVals = rsi(closes, 14);

    // 52-week high/low (last 252 trading days ~ 1 year)
    const lastYear = data.slice(-252);
    const high52 = Math.max(...lastYear.map(d => Number(d.high || d.close)));
    const low52 = Math.min(...lastYear.map(d => Number(d.low || d.close)));
    const avgVol = Math.round(lastYear.reduce((a,b)=>a + Number(b.volume||0),0) / lastYear.length);

    return { labels, closes, opens, highs, lows, volumes, sma20, sma50, rsiVals, high52, low52, avgVol };
  }, [data]);

  if (!prepared) return <p>No data</p>;

  const { labels, closes, volumes, sma20, sma50, rsiVals, high52, low52, avgVol } = prepared;

  const chartData = {
    labels,
    datasets: [
      // price line
      {
        type: 'line',
        label: 'Close',
        data: closes,
        yAxisID: 'y',
        borderColor: '#4dff29',
        backgroundColor: 'rgba(77,255,41,0.08)',
        tension: 0.2,
        pointRadius: 0,
        fill: true,
      },
      // SMA20
      {
        type: 'line',
        label: 'SMA 20',
        data: sma20,
        yAxisID: 'y',
        borderColor: '#ffd166',
        borderDash: [5,5],
        pointRadius: 0,
        tension: 0.2,
      },
      // SMA50
      {
        type: 'line',
        label: 'SMA 50',
        data: sma50,
        yAxisID: 'y',
        borderColor: '#74c0fc',
        borderDash: [8,4],
        pointRadius: 0,
        tension: 0.2,
      },
      // volume as bars
      {
        type: 'bar',
        label: 'Volume',
        data: volumes,
        yAxisID: 'yVolume',
        backgroundColor: volumes.map((v, i) => (closes[i] >= (closes[i-1]||closes[i]) ? 'rgba(77,255,41,0.25)' : 'rgba(255,77,77,0.25)')),
      }
    ]
  };

  const options = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    stacked: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            if (context.dataset.type === 'bar') {
              return `${label}: ${context.parsed.y?.toLocaleString()}`;
            }
            return `${label}: ${context.parsed.y !== null ? context.parsed.y.toFixed(2) : 'N/A'}`;
          }
        }
      },
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'day', tooltipFormat: 'PP' },
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#aaa' }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Price (USD)' },
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#ccc' }
      },
      yVolume: {
        type: 'linear',
        position: 'right',
        grid: { display: false },
        ticks: { color: '#ccc', callback: val => (val >= 1e9 ? (val/1e9)+'B' : val >= 1e6 ? (val/1e6)+'M' : val >= 1e3 ? (val/1e3)+'K' : val) }
      }
    },
    // draw horizontal lines for 52-week high/low using afterDraw
    maintainAspectRatio: false,
  };

  // plugin to draw 52-week lines and avg volume badge
  const drawPlugin = {
    id: 'draw52',
    afterDraw: (chart) => {
      const yScale = chart.scales.y;
      const ctx = chart.ctx;
      // 52-week high line
      const yHigh = yScale.getPixelForValue(high52);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([6,6]);
      ctx.beginPath();
      ctx.moveTo(chart.chartArea.left, yHigh);
      ctx.lineTo(chart.chartArea.right, yHigh);
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.fillText(`52w High: ${high52.toFixed(2)}`, chart.chartArea.right - 120, yHigh - 6);

      // 52-week low line
      const yLow = yScale.getPixelForValue(low52);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(chart.chartArea.left, yLow);
      ctx.lineTo(chart.chartArea.right, yLow);
      ctx.stroke();
      ctx.fillStyle = '#74c0fc';
      ctx.fillText(`52w Low: ${low52.toFixed(2)}`, chart.chartArea.right - 120, yLow - 6);

      // avg volume badge top-left
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(chart.chartArea.left + 8, chart.chartArea.top + 8, 160, 28);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Space Grotesk, sans-serif';
      ctx.fillText(`Avg Vol (1y): ${avgVol?.toLocaleString()}`, chart.chartArea.left + 14, chart.chartArea.top + 26);
      ctx.restore();
    }
  };

  // Compute RSI dataset as separate chart below — but simplest approach: render 2 charts stacked
  // We'll show RSI embedded by returning separate components in parent if needed.
  // For now, attach plugin and render the primary chart
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Price Chart */}
      <div className="chart-container" style={{ height: 300 }}>
        <Chart
          type="bar"
          data={chartData}
          options={options}
          plugins={[drawPlugin]}
        />
      </div>
  
      {/* RSI Chart */}
      <div className="chart-container" style={{ height: 300, padding: 8 }}>
        <Chart
          type="line"
          data={{
            labels,
            datasets: [
              {
                label: 'RSI (14)',
                data: rsiVals,
                borderColor: '#ffa94d',
                pointRadius: 0,
                tension: 0.2,
              }
            ]
          }}
          options={{
            interaction: { intersect: false, mode: 'index' },
            scales: {
              x: {
                type: 'time',
                time: { unit: 'day' },
                ticks: { color: '#aaa' }
              },
              y: {
                min: 0,
                max: 100,
                ticks: { color: '#ccc' }
              }
            },
            plugins: { legend: { display: true } },
            maintainAspectRatio: false
          }}
        />
      </div>
    </div>
  );
  
  
}  
