// Telegram Bot для Cyber-Match AI

require('dotenv').config();
const { Telegraf } = require('telegraf');
const { Pool } = require('pg');

// Ініціалізація бота
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Middleware для логування
bot.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${ctx.updateType} - ${ms}ms`);
});

// Команда /start
bot.start(async (ctx) => {
    const user = ctx.from;
    
    // Зберігаємо користувача в БД
    try {
        await pool.query(
            `INSERT INTO users (telegram_id, username, first_name, last_name)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (telegram_id) 
             DO UPDATE SET 
                username = EXCLUDED.username,
                first_name = EXCLUDED.first_name,
                last_name = EXCLUDED.last_name,
                updated_at = CURRENT_TIMESTAMP`,
            [user.id, user.username, user.first_name, user.last_name]
        );
    } catch (error) {
        console.error('Error saving user:', error);
    }
    
    await ctx.reply(
        `👋 Привіт, ${user.first_name}!\n\n` +
        `Я **Cyber-Match AI Bot** - твій особистий автопомічник.\n\n` +
        `🔧 **Що я вмію:**\n` +
        `• Зберігати результати перевірки VIN\n` +
        `• Зберігати оцінки вартості авто\n` +
        `• Відповідати на запитання через AI-Механіка\n` +
        `• Надсилати сповіщення\n\n` +
        `📱 **Веб-додаток:** https://cyber-match-production.up.railway.app\n\n` +
        `Натисни /help для довідки`,
        { parse_mode: 'Markdown' }
    );
});

// Команда /help
bot.help(async (ctx) => {
    await ctx.reply(
        '📖 **Довідка Cyber-Match AI**\n\n' +
        '🔹 **Команди:**\n' +
        '/start - Запустити бота\n' +
        '/help - Показати цю довідку\n' +
        '/profile - Мій профіль\n' +
        '/history - Історія перевірок\n' +
        '/settings - Налаштування\n\n' +
        '🔹 **Веб-додаток:**\n' +
        'Перейди за посиланням для повного функціоналу:\n' +
        'https://cyber-match-production.up.railway.app',
        { parse_mode: 'Markdown' }
    );
});

// Команда /profile
bot.command('profile', async (ctx) => {
    const userId = ctx.from.id;
    
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE telegram_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            await ctx.reply('❌ Користувача не знайдено. Натисніть /start');
            return;
        }
        
        const user = result.rows[0];
        const vinCount = await pool.query(
            'SELECT COUNT(*) FROM vin_checks WHERE user_id = $1',
            [user.id]
        );
        const evalCount = await pool.query(
            'SELECT COUNT(*) FROM car_evaluations WHERE user_id = $1',
            [user.id]
        );
        
        await ctx.reply(
            `👤 **Профіль**\n\n` +
            `ID: \`${user.telegram_id}\`\n` +
            `Ім'я: ${user.first_name} ${user.last_name || ''}\n` +
            `Username: @${user.username || 'не вказано'}\n` +
            `З нами з: ${new Date(user.created_at).toLocaleDateString('uk-UA')}\n\n` +
            `📊 **Статистика:**\n` +
            `• Перевірок VIN: ${vinCount.rows[0].count}\n` +
            `• Оцінок авто: ${evalCount.rows[0].count}`,
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Error fetching profile:', error);
        await ctx.reply('❌ Помилка отримання профілю');
    }
});

// Команда /history
bot.command('history', async (ctx) => {
    const userId = ctx.from.id;
    
    try {
        const userResult = await pool.query(
            'SELECT id FROM users WHERE telegram_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            await ctx.reply('❌ Користувача не знайдено. Натисніть /start');
            return;
        }
        
        const userIdDb = userResult.rows[0].id;
        
        // Останні 5 VIN перевірок
        const vinResult = await pool.query(
            `SELECT vin, car_make, car_model, car_year, created_at 
             FROM vin_checks 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userIdDb]
        );
        
        if (vinResult.rows.length === 0) {
            await ctx.reply('📭 Історія порожня. Скористайтеся веб-додатком для створення запитів.');
            return;
        }
        
        let message = '📋 **Останні перевірки VIN:**\n\n';
        vinResult.rows.forEach((row, index) => {
            message += `${index + 1}. \`${row.vin}\` - ${row.car_make} ${row.car_model} (${row.car_year})\n`;
            message += `   ${new Date(row.created_at).toLocaleDateString('uk-UA')}\n\n`;
        });
        
        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error fetching history:', error);
        await ctx.reply('❌ Помилка отримання історії');
    }
});

// Команда /settings
bot.command('settings', async (ctx) => {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔔 Увімкнути сповіщення', callback_data: 'notify_on' }],
                [{ text: '🔕 Вимкнути сповіщення', callback_data: 'notify_off' }],
                [{ text: '📤 Експорт даних', callback_data: 'export_data' }],
                [{ text: '❌ Видалити акаунт', callback_data: 'delete_account' }]
            ]
        }
    };
    
    await ctx.reply('⚙️ **Налаштування**\n\nОберіть дію:', keyboard);
});

// Обробка callback query
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;
    
    switch (data) {
        case 'notify_on':
            await pool.query(
                'UPDATE users SET notifications_enabled = TRUE WHERE telegram_id = $1',
                [userId]
            );
            await ctx.answerCbQuery('✅ Сповіщення увімкнено');
            break;
            
        case 'notify_off':
            await pool.query(
                'UPDATE users SET notifications_enabled = FALSE WHERE telegram_id = $1',
                [userId]
            );
            await ctx.answerCbQuery('🔕 Сповіщення вимкнено');
            break;
            
        case 'export_data':
            await ctx.answerCbQuery('📤 Підготовка експорту...');
            // Логіка експорту даних
            break;
            
        case 'delete_account':
            await ctx.answerCbQuery('⚠️ Ви впевнені?');
            // Логіка видалення
            break;
    }
});

// Middleware для будь-яких повідомлень
bot.on('message', async (ctx) => {
    // Якщо це не команда, можна зберігати як запит до AI
    if (!ctx.message.text?.startsWith('/')) {
        // Тут можна інтегрувати AI для відповідей
        await ctx.reply(
            '🤖 Дякую за повідомлення!\n\n' +
            'Для отримання відповіді скористайтеся веб-додатком:\n' +
            'https://cyber-match-production.up.railway.app'
        );
    }
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Simple HTTP server for health check
const http = require('http');
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', service: 'telegram-bot' }));
    } else {
        res.writeHead(404);
        res.end();
    }
});
const HEALTH_PORT = process.env.PORT || 3001;
server.listen(HEALTH_PORT, () => {
    console.log(`🏥 Health check: http://localhost:${HEALTH_PORT}/health`);
});

// Запуск бота
bot.launch().then(() => {
    console.log('✅ Telegram bot started');
    console.log(`Bot username: @${bot.botInfo?.username}`);
}).catch(err => {
    console.error('❌ Error starting bot:', err);
});

// Export для використання в server.js
module.exports = bot;
