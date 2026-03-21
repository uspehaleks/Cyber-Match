// Database migration script
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    // Skip migration if no DATABASE_URL (e.g., during build)
    if (!process.env.DATABASE_URL) {
        console.log('⏭️ Skipping migration: DATABASE_URL not set (build time)');
        process.exit(0);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });

    try {
        console.log('🔄 Starting database migration...');

        // Check existing tables
        const existingTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        `);
        
        const tableNames = existingTables.rows.map(r => r.table_name);
        console.log('📊 Existing tables:', tableNames.join(', ') || 'none');

        // Read schema.sql and execute as single transaction
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute full schema in a transaction
        await pool.query('BEGIN');
        try {
            await pool.query(schema);
            await pool.query('COMMIT');
            console.log('✅ Schema executed successfully');
        } catch (error) {
            await pool.query('ROLLBACK');
            // If it's "already exists" error, continue
            if (error.code === '42P07' || error.message.includes('already exists')) {
                console.log('⚠️ Some objects already exist, continuing...');
            } else {
                throw error;
            }
        }

        // Add additional indexes for performance (if not in schema)
        const additionalIndexes = [
            "CREATE INDEX IF NOT EXISTS idx_vin_checks_created_at ON vin_checks(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_car_evaluations_created_at ON car_evaluations(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_ai_queries_created_at ON ai_queries(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_partner_clicks_clicked_at ON partner_clicks(clicked_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)"
        ];

        console.log('🔧 Adding performance indexes...');
        for (const index of additionalIndexes) {
            try {
                await pool.query(index);
            } catch (error) {
                if (error.code === '42P07' || error.message.includes('already exists')) {
                    // Index already exists
                } else {
                    console.warn('⚠️ Index warning:', error.message);
                }
            }
        }

        console.log('✅ Database migration completed successfully!');
        console.log('📊 Tables: users, vin_checks, car_evaluations, ai_queries, partner_clicks');
        console.log('📈 Indexes: telegram_id, user_id (all tables), vin, partner_type, created_at (all tables)');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        await pool.end();
        process.exit(1);
    }
}

migrate();
