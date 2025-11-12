const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Check if connecting to AWS RDS or Vercel Postgres (requires SSL)
const isAWSRDS = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('rds.amazonaws.com') ||
  process.env.DATABASE_URL.includes('vercel-storage.com')
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isAWSRDS || process.env.NODE_ENV === 'production' ? { 
    rejectUnauthorized: false,
    require: true 
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Helper function to execute queries
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Helper functions for common operations
const getUserByEmail = async (email) => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

const getUserById = async (id) => {
  const result = await query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

const createUser = async (email, passwordHash, name, role = 'user') => {
  const result = await query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
    [email, passwordHash, name, role]
  );
  return result.rows[0];
};

module.exports = {
  pool,
  query,
  getUserByEmail,
  getUserById,
  createUser
};

