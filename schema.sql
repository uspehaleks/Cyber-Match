-- Схема бази даних Cyber-Match

-- Користувачі (з Telegram)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(20),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Перевірки VIN
CREATE TABLE IF NOT EXISTS vin_checks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vin VARCHAR(17) NOT NULL,
    car_make VARCHAR(100),
    car_model VARCHAR(100),
    car_year INTEGER,
    report_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Оцінки авто
CREATE TABLE IF NOT EXISTS car_evaluations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    car_make VARCHAR(100) NOT NULL,
    car_model VARCHAR(100) NOT NULL,
    car_year INTEGER,
    mileage INTEGER,
    condition VARCHAR(50),
    estimated_price DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'UAH',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Запити до AI-Механіка
CREATE TABLE IF NOT EXISTS ai_queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Кліки по партнерських посиланнях (для аналітики)
CREATE TABLE IF NOT EXISTS partner_clicks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    partner_type VARCHAR(50) NOT NULL, -- mfo, presale, insurance
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Індекси для швидкості
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vin_checks_user_id ON vin_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_vin_checks_vin ON vin_checks(vin);
CREATE INDEX IF NOT EXISTS idx_vin_checks_created_at ON vin_checks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_car_evaluations_user_id ON car_evaluations(user_id);
CREATE INDEX IF NOT EXISTS idx_car_evaluations_created_at ON car_evaluations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_queries_user_id ON ai_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_queries_created_at ON ai_queries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_clicks_user_id ON partner_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_type ON partner_clicks(partner_type);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_clicked_at ON partner_clicks(clicked_at DESC);
