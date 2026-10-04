const express = require('express');
const cors = require('cors');
const ClickHouse = require('@apla/clickhouse');
const fs = require('fs');
const path = require('path');

// Load settings
const settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8'));

const app = express();
const PORT = settings.server.port || 3000;

// CORS middleware
app.use(cors());
app.use(express.json());

// Initialize ClickHouse client
const ch = new ClickHouse({
  host: settings.clickhouse.host,
  port: settings.clickhouse.port,
  user: settings.clickhouse.user,
  password: settings.clickhouse.password,
  database: settings.clickhouse.database
});

// API endpoint to get investment metrics
app.get('/api/metrics', async (req, res) => {
  try {
        const query = `
        SELECT 
            region_name,
            mean_value,
            risk_cv,
            country,
            winter_gap
        FROM data.v_invest_metrics
        WHERE mean_value IS NOT NULL
          AND risk_cv IS NOT NULL
          AND region_name IS NOT NULL
    `;

    const data = await new Promise((resolve, reject) => {
      const rows = [];
      ch.query(query)
        .on('data', (row) => { 
          console.log('Received row:', row);
          rows.push(row); 
        })
        .on('end', () => {
          console.log('Query finished, returning', rows.length, 'rows');
          resolve(rows);
        })
        .on('error', (err) => {
          console.error('Query error:', err);
          reject(err);
        });
    });
    console.log('Sending response with', data.length, 'records');
    res.json(data);
  } catch (error) {
    console.error('ClickHouse query error:', error);
    res.status(500).json({ error: 'Failed to fetch data from ClickHouse', details: error.message });
  }
});

// API endpoint to get seasonal bins data
app.get('/api/seasonal-bins', async (req, res) => {
  try {
    const query = `
        SELECT 
            region_code,
            region_name,
            country,
            season_label,
            h_value_bin,
            hours_count
        FROM data.v_region_seasonal_bins
        WHERE region_code IS NOT NULL
          AND h_value_bin IS NOT NULL
          AND hours_count > 0
        ORDER BY region_code, season_label, h_value_bin
    `;

    const data = await new Promise((resolve, reject) => {
      const rows = [];
      ch.query(query)
        .on('data', (row) => { rows.push(row); })
        .on('end', () => resolve(rows))
        .on('error', (err) => reject(err));
    });

    res.json(data);
  } catch (error) {
    console.error('ClickHouse query error:', error);
    res.status(500).json({ error: 'Failed to fetch seasonal bins data', details: error.message });
  }
});

// Recreate the v_country_percentiles view with p10_cf
app.post('/api/recreate-view', async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      ch.query('DROP VIEW IF EXISTS data.v_country_percentiles')
        .on('end', resolve)
        .on('error', reject);
    });
    const sql = `
      CREATE VIEW data.v_country_percentiles
      AS SELECT
          country,
          quantile(0.1)(yearly_mean_cf) AS p10_cf,
          quantile(0.5)(yearly_mean_cf) AS p50_cf,
          quantile(0.9)(yearly_mean_cf) AS p90_cf,
          quantile(0.99)(yearly_mean_cf) AS p99_cf,
          quantile(0.9)(yearly_mean_cf) - quantile(0.1)(yearly_mean_cf) AS p90_p10_spread
      FROM data.v_country_annual_stats
      GROUP BY country
    `;
    await new Promise((resolve, reject) => {
      ch.query(sql)
        .on('end', resolve)
        .on('error', reject);
    });
    res.json({ success: true, message: 'View recreated successfully' });
  } catch (error) {
    console.error('View recreation error:', error);
    res.status(500).json({ error: 'Failed to recreate view', details: error.message });
  }
});

// API endpoint to get country percentiles data
app.get('/api/country-percentiles', async (req, res) => {
  try {
    const query = `
        SELECT 
            country,
            p10_cf,
            p50_cf,
            p90_cf,
            p99_cf,
            p90_p10_spread
        FROM data.v_country_percentiles
        WHERE country IS NOT NULL
          AND p50_cf IS NOT NULL
        ORDER BY p50_cf DESC
    `;

    const data = await new Promise((resolve, reject) => {
      const rows = [];
      ch.query(query)
        .on('data', (row) => { rows.push(row); })
        .on('end', () => resolve(rows))
        .on('error', (err) => reject(err));
    });

    res.json(data);
  } catch (error) {
    console.error('ClickHouse query error:', error);
    res.status(500).json({ error: 'Failed to fetch country percentiles data', details: error.message });
  }
});

// API endpoint to get region percentiles data
app.get('/api/region-percentiles', async (req, res) => {
  try {
    const countryFilter = req.query.country || 'all';
    let whereClause = 'region_name IS NOT NULL AND p50_cf IS NOT NULL';
    if (countryFilter !== 'all') {
      // Validate input to prevent SQL injection
      if (!/^[a-zA-Zа-яА-Я0-9\s\-_.,'()]+$/.test(countryFilter)) {
        return res.status(400).json({ error: 'Invalid country filter' });
      }
      // Escape single quotes by doubling them
      const escaped = countryFilter.replace(/'/g, "''");
      whereClause += ` AND country = '${escaped}'`;
    }
    const query = `
        SELECT 
            region_name,
            country,
            p10_cf,
            p50_cf,
            p90_cf,
            p99_cf,
            p90_p10_spread
        FROM data.v_region_percentiles
        WHERE ${whereClause}
        ORDER BY p50_cf DESC
    `;

    const data = await new Promise((resolve, reject) => {
      const rows = [];
      ch.query(query)
        .on('data', (row) => { rows.push(row); })
        .on('end', () => resolve(rows))
        .on('error', (err) => reject(err));
    });

    res.json(data);
  } catch (error) {
    console.error('ClickHouse query error:', error);
    res.status(500).json({ error: 'Failed to fetch region percentiles data', details: error.message });
  }
});

// API endpoint to get country annual trend data
app.get('/api/country-trend', async (req, res) => {
  try {
    const query = `
        SELECT 
            country,
            year,
            mean_cf
        FROM data.v_country_annual_trend
        WHERE country IS NOT NULL
          AND mean_cf IS NOT NULL
        ORDER BY country, year
    `;

    const data = await new Promise((resolve, reject) => {
      const rows = [];
      ch.query(query)
        .on('data', (row) => { rows.push(row); })
        .on('end', () => resolve(rows))
        .on('error', (err) => reject(err));
    });

    res.json(data);
  } catch (error) {
    console.error('ClickHouse query error:', error);
    res.status(500).json({ error: 'Failed to fetch country trend data', details: error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful error handling for ClickHouse connection
ch.query('SELECT 1').on('data', () => {
  console.log('ClickHouse connection OK');
}).on('error', (err) => {
  console.error('WARNING: ClickHouse connection failed:', err.message);
  console.error('Server will continue running but API calls will fail until ClickHouse is available.');
});