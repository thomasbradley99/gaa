const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5011;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN?.split(',') || ['https://gaa.clannai.com']
    : ['http://localhost:5012', 'http://localhost:3013'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  if (process.env.DEBUG === 'true') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({ 
    message: 'GAA Webapp Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      teams: '/api/teams/*',
      games: '/api/games/*',
      admin: '/api/admin/*',
      crm: '/api/crm/*'
    }
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const teamsRoutes = require('./routes/teams');
const videoProxyRoutes = require('./routes/video-proxy');
const gamesRoutes = require('./routes/games');
const adminRoutes = require('./routes/admin');
const clubsRoutes = require('./routes/clubs');
// CRM routes (optional - only load if module available)
let crmRoutes = null;
try {
  crmRoutes = require('./routes/crm');
} catch (err) {
  console.log('⚠️  CRM routes not available (missing @aws-sdk/client-ses)');
}

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/video-proxy', videoProxyRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clubs', clubsRoutes);
if (crmRoutes) {
  app.use('/api/crm', crmRoutes);
}

// CRM notifications (always available, doesn't need SES)
const crmNotifications = require('./routes/crm-notifications');
app.use('/api/crm', crmNotifications);

// CRM bounce handling
const crmBounces = require('./routes/crm-bounces');
app.use('/api/crm', crmBounces);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server (only if not on Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 GAA Backend server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export for Vercel
module.exports = app;

// Redeploy trigger Fri Nov 21 12:29:35 GMT 2025
// Redeploy Fri Nov 21 12:59:18 GMT 2025
// Fix JWT_EXPIRY Fri Nov 21 13:11:05 GMT 2025
// JWT_EXPIRY fix Fri Nov 21 13:37:02 GMT 2025

// Redeploy trigger 1763763204
