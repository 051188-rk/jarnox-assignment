import React, { useEffect, useState } from 'react';
import './app.css';
import StockChart from './StockChart';

import image from './assets/image1.png';
import image2 from './assets/image2.png';


export default function App() {
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [searchTicker, setSearchTicker] = useState('');
  const [stats, setStats] = useState(null);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light');
    }
  }, []);

  async function loadCompanies() {
    try {
      const url = `${process.env.REACT_APP_API_BASE}/companies`;
      console.log("Fetching companies from:", url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("Companies loaded:", data);
      setCompanies(data);
    } catch (err) {
      console.error(err);
      setError(`Error loading companies: ${err.message}`);
    }
  }

  async function addCompany() {
    if (!searchTicker) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE}/add-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: searchTicker })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setSearchTicker('');
      await loadCompanies();
    } catch (err) {
      console.error(err);
      setError('Failed to add company');
    }
  }

  async function fetchStats(ticker) {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE}/company-info/${ticker}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
    } catch (err) {
      console.error(err);
      setStats(null);
    }
  }

  async function selectTicker(ticker) {
    setSelected(ticker);
    setSeries([]);
    setPrediction(null);
    setError(null);
    setLoading(true);

    await fetchStats(ticker);

    const end = new Date().toISOString().slice(0, 10);
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1); // 1 year data
    const start = startDate.toISOString().slice(0, 10);

    try {
      const url = `${process.env.REACT_APP_API_BASE}/historical/${ticker}?start=${start}&end=${end}`;
      console.log("Fetching historical data from:", url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        // Include open, high, low, volume for technical indicators
        setSeries(data.data.map(x => ({
          date: x.date,
          open: parseFloat(x.open),
          high: parseFloat(x.high),
          low: parseFloat(x.low),
          close: parseFloat(x.close),
          volume: parseFloat(x.volume)
        })));
      } else {
        setError('No data found for this ticker.');
      }
    } catch (e) {
      console.error(e);
      setError('Error fetching historical data: ' + e.message);
    }

    setLoading(false);
  }

  async function getPrediction() {
    if (!selected) return;
    setPrediction(null);
    setError(null);
    setLoading(true);

    try {
      const url = `${process.env.REACT_APP_API_BASE}/predict/${selected}`;
      console.log("Fetching prediction from:", url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.prediction) {
        setPrediction(data.prediction);
      } else {
        setError('Prediction failed.');
      }
    } catch (e) {
      console.error(e);
      setError('Error fetching prediction: ' + e.message);
    }

    setLoading(false);
  }

  function toggleTheme(checked) {
    if (checked) {
      document.body.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h2>Companies</h2>
          <label className="switch">
            <input
              type="checkbox"
              onChange={(e) => toggleTheme(e.target.checked)}
              defaultChecked={localStorage.getItem('theme') === 'light'}
            />
            <span className="slider">
              <svg className="slider-icon" viewBox="0 0 32 32">
                <path fill="none" d="m4 16.5 8 8 16-16"></path>
              </svg>
            </span>
          </label>
        </div>

        <div className="search-box">
          <input
            type="text"
            value={searchTicker}
            onChange={(e) => setSearchTicker(e.target.value)}
            placeholder="Enter ticker..."
          />
          <button onClick={addCompany}>Add</button>
        </div>

        <ul>
          {companies.map((c) => (
            <li
              key={c.ticker}
              onClick={() => selectTicker(c.ticker)}
              className={selected === c.ticker ? 'active' : ''}
            >
              <strong>{c.ticker}</strong> <small>{c.name}</small>
            </li>
          ))}
        </ul>
      </aside>

      <main className="main">
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {selected || 'Select a company'}
      {/* Image to the right of the company name */}
      <img
        src={image}
        alt="Company Icon"
        style={{ width: '120px', height: 'auto'}}
      />
    </h1>

    {selected && (
      <button className="predict-btn" onClick={getPrediction} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Image inside the button */}
        Get AI Prediction
        <img
          src={image2}
          alt="AI Icon"
          style={{ width: '80px', height: 'auto' }}
        />
      </button>
    )}
  </div>

  {loading && <p>Loading...</p>}
  {error && <p className="error">{error}</p>}

  {stats && (
    <div className="stats-box">
      <p><strong>52-Week High:</strong> {stats.high_52week || 'N/A'}</p>
      <p><strong>52-Week Low:</strong> {stats.low_52week || 'N/A'}</p>
      <p><strong>Avg Volume:</strong> {stats.avg_volume || 'N/A'}</p>
    </div>
  )}

  {!loading && series.length > 0 && <StockChart data={series} />}

  {prediction && (
    <div className="prediction-box">
      <h3>AI Prediction</h3>
      <p><strong>Predicted Price:</strong> ${prediction.predicted_price?.toFixed(2)}</p>
      <p><strong>Confidence:</strong> {(prediction.confidence * 100).toFixed(1)}%</p>
      <p><strong>Rationale:</strong> {prediction.rationale}</p>
    </div>
  )}
</main>
    </div>
  );
}

