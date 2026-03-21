// Simple server without any dependencies on missing env vars
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Handle favicon.ico - return empty 204 response
app.get('/favicon.ico', (req, res) => {
    res.status(204).send();
});

// PostgreSQL connection pool (optional)
let pool = null;
// Use LOCAL_DATABASE_URL for local dev (overrides Railway's internal URL)
const dbUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
if (dbUrl) {
    pool = new Pool({
        connectionString: dbUrl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        env: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            PORT: process.env.PORT || 3000,
            HAS_DATABASE_URL: !!process.env.DATABASE_URL,
            HAS_TELEGRAM_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN
        }
    });
});

// Diagnostics page
app.get('/api/diagnostics', async (req, res) => {
    const result = {
        timestamp: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            PORT: process.env.PORT || 3000,
            HAS_DATABASE_URL: !!process.env.DATABASE_URL,
            HAS_TELEGRAM_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
            DATABASE_URL_SET: !!process.env.DATABASE_URL
        },
        database: {
            connected: false,
            tables: [],
            error: null
        }
    };

    if (pool) {
        try {
            // Test connection
            await pool.query('SELECT 1');
            result.database.connected = true;

            // Get tables
            const tablesResult = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);
            result.database.tables = tablesResult.rows.map(r => r.table_name);

            // Get row counts
            result.database.counts = {};
            for (const table of result.database.tables) {
                const countResult = await pool.query(
                    `SELECT COUNT(*) as count FROM ${table}`
                );
                result.database.counts[table] = parseInt(countResult.rows[0].count);
            }

            // Get indexes count
            const indexesResult = await pool.query(`
                SELECT COUNT(*) as count 
                FROM pg_indexes 
                WHERE schemaname = 'public'
            `);
            result.database.indexesCount = parseInt(indexesResult.rows[0].count);

        } catch (error) {
            result.database.error = error.message;
        }
    } else {
        result.database.error = 'DATABASE_URL not set';
    }

    res.json(result);
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`🔍 Diagnostics: http://localhost:${PORT}/api/diagnostics`);
});
