// Simple server without any dependencies on missing env vars
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

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

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
});
