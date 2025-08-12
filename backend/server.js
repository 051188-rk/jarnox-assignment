// backend/server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const fetch = require('node-fetch');
const yf = require('yahoo-finance2').default;
const cors = require('cors');

const HOST = process.env.PG_HOST || 'localhost';
const PORT = process.env.PG_PORT || 4000;
const FURL = process.env.FURL || 'https://jarnox-assignment-l885.vercel.app/';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Render's managed Postgres
  }
});

pool.connect()
  .then(() => console.log("✅ Connected to Postgres"))
  .catch(err => console.error("❌ Connection error:", err));


const app = express();
app.use(express.json());
app.use(cors({
    origin: [
      "http://localhost:3000", // local dev
      "https://jarnox-assignment-l885.vercel.app" // deployed Vercel site
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));


// Utility function for DB queries
async function dbQuery(q, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(q, params);
    return res;
  } finally {
    client.release();
  }
}

// DB connection check on startup
pool.connect()
  .then(client => {
    console.log("✅ Connected to PostgreSQL");
    return client.query('SELECT NOW()')
      .then(res => {
        console.log("Server time:", res.rows[0]);
        client.release();
      })
      .catch(err => {
        console.error("Query error:", err);
        client.release();
      });
  })
  .catch(err => console.error("❌ Connection error:", err));

// Debug route to check tables
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/tables', async (req, res) => {
    try {
      const tablesRes = await dbQuery(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      const results = [];
      for (const t of tablesRes.rows) {
        const countRes = await dbQuery(`SELECT COUNT(*) FROM ${t.table_name}`);
        results.push({
          table: t.table_name,
          rows: parseInt(countRes.rows[0].count, 10)
        });
      }
      res.json({ connected: true, tables: results });
    } catch (err) {
      console.error(err);
      res.status(500).json({ connected: false, error: err.message });
    }
  });
}

// Get companies
app.get('/api/companies', async (req, res) => {
  try {
    const { rows } = await dbQuery('SELECT ticker, name FROM companies ORDER BY ticker');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed companies (GET for dev convenience)
app.get('/api/seed', async (req, res) => {
  try {
    const seed = [
      { ticker: 'AAPL', name: 'Apple Inc.' },
      { ticker: 'MSFT', name: 'Microsoft Corporation' },
      { ticker: 'GOOGL', name: 'Alphabet Inc.' }
    ];
    for (const c of seed) {
      await dbQuery(
        `INSERT INTO companies (ticker, name, last_updated)
         VALUES ($1, $2, now())
         ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, last_updated = now()`,
        [c.ticker, c.name]
      );
    }
    res.json({ seeded: seed.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get historical stock data
app.get('/api/historical/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const { start, end } = req.query;

    const dbRes = await dbQuery(
      `SELECT date, open, high, low, close, adjclose, volume FROM historical_prices
       WHERE ticker=$1 AND date >= $2 AND date <= $3
       ORDER BY date`,
      [ticker, start, end]
    );

    if (dbRes.rows.length > 0) {
      return res.json({ source: 'db', data: dbRes.rows });
    }

    const yfOptions = { period1: start, period2: end, interval: '1d' };
    const result = await yf.historical(ticker, yfOptions);

    for (const row of result) {
      const date = row.date.toISOString().slice(0, 10);
      await dbQuery(
        `INSERT INTO historical_prices (ticker, date, open, high, low, close, adjclose, volume)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (ticker, date) DO UPDATE SET open=$3, high=$4, low=$5, close=$6, adjclose=$7, volume=$8`,
        [ticker, date, row.open, row.high, row.low, row.close, row.adjClose ?? row.close, row.volume]
      );
    }

    res.json({
      source: 'yahoo',
      data: result.map(r => ({
        date: r.date.toISOString().slice(0, 10),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        adjclose: r.adjClose ?? r.close,
        volume: r.volume
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI price prediction
app.get('/api/predict/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
  
      // Check env vars
      if (!process.env.GROQ_API_KEY || !process.env.GROQ_MODEL || !process.env.GROQ_BASE) {
        console.error("❌ Missing Groq environment variables");
        return res.status(500).json({ error: "Server misconfigured: Missing Groq API settings" });
      }
  
      // Fetch last 14 days of data
      let dbRes;
      try {
        dbRes = await dbQuery(
          `SELECT date, close FROM historical_prices
           WHERE ticker=$1 ORDER BY date DESC LIMIT 14`,
          [ticker]
        );
      } catch (dbErr) {
        console.error("❌ DB query failed:", dbErr);
        return res.status(500).json({ error: "Database error", details: dbErr.message });
      }
  
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: 'No historical data found for ticker' });
      }
  
      const series = dbRes.rows
        .slice()
        .reverse()
        .map(r => `${r.date}:${r.close}`)
        .join('\n');
  
      const prompt = `Historical prices for ${ticker}:\n${series}\nPredict next-day close price in JSON with keys predicted_price, confidence, rationale.`;
  
      let r;
      try {
        r = await fetch(`${process.env.GROQ_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL,
            messages: [
              { role: 'system', content: 'Output only JSON.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 200
          })
        });
      } catch (fetchErr) {
        console.error("❌ Groq API fetch failed:", fetchErr);
        return res.status(500).json({ error: "Failed to call Groq API", details: fetchErr.message });
      }
  
      if (!r.ok) {
        const errText = await r.text();
        console.error(`❌ Groq API error [${r.status}]:`, errText);
        return res.status(r.status).json({ error: "Groq API request failed", details: errText });
      }
  
      const j = await r.json();
      let content = j.choices?.[0]?.message?.content || '';
  
      // Remove triple backticks if present
      content = content.replace(/```json|```/g, '').trim();
  
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        console.warn("⚠️ AI did not return valid JSON:", content);
        parsed = { raw: content };
      }
  
      const predictedPrice = parsed.predicted_price ?? null;
      const confidence = parsed.confidence ?? null;
      const rationale = parsed.rationale || "No rationale provided";
  
      // Save prediction
      try {
        await dbQuery(
          `INSERT INTO predictions (ticker, predicted_price, confidence, rationale)
           VALUES ($1, $2, $3, $4)`,
          [ticker, predictedPrice, confidence, rationale]
        );
      } catch (insertErr) {
        console.error("❌ Failed to insert prediction into DB:", insertErr);
        return res.status(500).json({ error: "Database insert failed", details: insertErr.message });
      }
  
      res.json({
        prediction: {
          predicted_price: predictedPrice,
          confidence,
          rationale
        }
      });
  
    } catch (err) {
      console.error("❌ Unexpected error in /api/predict:", err);
      res.status(500).json({ error: err.message });
    }
  });
  

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.get('/api/debug/data/:table', async (req, res) => {
    try {
      const table = req.params.table;
      const result = await dbQuery(`SELECT * FROM ${table}`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/add-company', async (req, res) => {
    try {
      const { ticker } = req.body;
      if (!ticker) return res.status(400).json({ error: 'Ticker is required' });
  
      const upperTicker = ticker.toUpperCase();
  
      // Fetch company info
      const info = await yf.quoteSummary(upperTicker, { modules: ['price'] });
      const name = info.price?.longName || upperTicker;
  
      // Save to companies
      await dbQuery(
        `INSERT INTO companies (ticker, name, last_updated)
         VALUES ($1, $2, now())
         ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, last_updated = now()`,
        [upperTicker, name]
      );
  
      // Fetch last 1 year of historical data
      const end = new Date().toISOString().slice(0, 10);
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const start = startDate.toISOString().slice(0, 10);
  
      const historical = await yf.historical(upperTicker, { period1: start, period2: end, interval: '1d' });
      for (const row of historical) {
        const date = row.date.toISOString().slice(0, 10);
        await dbQuery(
          `INSERT INTO historical_prices (ticker, date, open, high, low, close, adjclose, volume)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (ticker, date) DO UPDATE SET open=$3, high=$4, low=$5, close=$6, adjclose=$7, volume=$8`,
          [upperTicker, date, row.open, row.high, row.low, row.close, row.adjClose ?? row.close, row.volume]
        );
      }
  
      res.json({ message: `${upperTicker} added successfully`, name });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  

  app.get('/api/company-info/:ticker', async (req, res) => {
    try {
      const ticker = req.params.ticker.toUpperCase();
  
      const data = await dbQuery(
        `SELECT
           MAX(high) AS high_52week,
           MIN(low) AS low_52week,
           ROUND(AVG(volume)) AS avg_volume
         FROM historical_prices
         WHERE ticker=$1 AND date >= NOW() - INTERVAL '1 year'`,
        [ticker]
      );
  
      res.json(data.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  
