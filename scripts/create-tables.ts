import { db } from '../server/db';
import { pool } from '../server/db';

async function createTables() {
  try {
    console.log('Creating users table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT,
        email TEXT,
        phone TEXT,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating appointments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating available_slots table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS available_slots (
        id SERIAL PRIMARY KEY,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);

    console.log('Creating booking_configurations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS booking_configurations (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('All tables created successfully!');
    
    // Initialize default booking configurations with direct SQL
    console.log('Initializing default booking configurations...');
    const checkResult = await pool.query(`SELECT * FROM booking_configurations WHERE key = 'booking_window_day'`);
    
    if (checkResult.rows.length === 0) {
      await pool.query(`
        INSERT INTO booking_configurations (key, value, description) VALUES
        ('booking_window_day', '0', 'Day of the week when booking window is open (0-6, Sunday-Saturday)'),
        ('booking_window_start', '8', 'Hour when booking window opens (0-23)'),
        ('booking_window_end', '9', 'Hour when booking window closes (0-23)'),
        ('morning_slot_start', '9', 'Hour when morning appointments start (0-23)'),
        ('morning_slot_end', '13', 'Hour when morning appointments end (0-23)'),
        ('afternoon_slot_start', '15', 'Hour when afternoon appointments start (0-23)'),
        ('afternoon_slot_end', '17', 'Hour when afternoon appointments end (0-23)'),
        ('disabled_days', '2,6', 'Days of the week when appointments are not available (0-6, Sunday-Saturday, comma-separated)'),
        ('slot_duration', '15', 'Duration of each appointment slot in minutes')
      `);
      console.log('Default booking configurations initialized!');
    } else {
      console.log('Default booking configurations already exist.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createTables();