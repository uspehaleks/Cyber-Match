// Server API для Cyber-Match (Node.js + Express + PostgreSQL)

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// PostgreSQL connection pool (optional - only if DATABASE_URL is set)
let pool = null;
const dbUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
if (dbUrl) {
    pool = new Pool({
        connectionString: dbUrl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });

    // Тест підключення до БД
    pool.connect((err, client, release) => {
        if (err) {
            console.error('Database connection error:', err.stack);
        } else {
            console.log('✅ Database connected successfully');
            release();
        }
    });
}

// ==================== API Routes ====================

// Отримати користувача по Telegram ID
app.get('/api/user/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const result = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [telegramId]
        );
        res.json(result.rows[0] || null);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Створити/оновити користувача
app.post('/api/user', async (req, res) => {
    try {
        const { telegram_id, username, first_name, last_name, phone } = req.body;
        
        const result = await pool.query(
            `INSERT INTO users (telegram_id, username, first_name, last_name, phone)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (telegram_id) 
             DO UPDATE SET 
                username = EXCLUDED.username,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                phone = EXCLUDED.phone,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [telegram_id, username, first_name, last_name, phone]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Зберегти перевірку VIN
app.post('/api/vin-check', async (req, res) => {
    try {
        const { user_id, vin, car_make, car_model, car_year, report_data } = req.body;
        
        const result = await pool.query(
            `INSERT INTO vin_checks (user_id, vin, car_make, car_model, car_year, report_data)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [user_id, vin, car_make, car_model, car_year, report_data]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error saving VIN check:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Отримати історію VIN перевірок користувача
app.get('/api/vin-checks/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            'SELECT * FROM vin_checks WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching VIN checks:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Зберегти оцінку авто
app.post('/api/evaluation', async (req, res) => {
    try {
        const { user_id, car_make, car_model, car_year, mileage, condition, estimated_price, currency } = req.body;
        
        const result = await pool.query(
            `INSERT INTO car_evaluations (user_id, car_make, car_model, car_year, mileage, condition, estimated_price, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [user_id, car_make, car_model, car_year, mileage, condition, estimated_price, currency]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error saving evaluation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Отримати історію оцінок користувача
app.get('/api/evaluations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            'SELECT * FROM car_evaluations WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Зберегти запит до AI
app.post('/api/ai-query', async (req, res) => {
    try {
        const { user_id, question, answer, category } = req.body;
        
        const result = await pool.query(
            `INSERT INTO ai_queries (user_id, question, answer, category)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [user_id, question, answer, category]
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error saving AI query:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Отримати історію AI запитів
app.get('/api/ai-queries/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            'SELECT * FROM ai_queries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching AI queries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Трекінг кліку по партнерці
app.post('/api/track-click', async (req, res) => {
    try {
        const { user_id, partner_type, ip_address, user_agent } = req.body;
        
        await pool.query(
            `INSERT INTO partner_clicks (user_id, partner_type, ip_address, user_agent)
             VALUES ($1, $2, $3, $4)`,
            [user_id, partner_type, ip_address, user_agent]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking click:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Статистика кліків (для адміна)
app.get('/api/analytics/clicks', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT partner_type, COUNT(*) as count, 
                    DATE_TRUNC('day', clicked_at) as date
             FROM partner_clicks 
             GROUP BY partner_type, DATE_TRUNC('day', clicked_at)
             ORDER BY date DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== Serve Frontend ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== Start Server ====================

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
});
