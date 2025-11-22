const { verifyToken } = require('../utils/jwt');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Authenticate admin users only
 * Must be authenticated AND have role='admin'
 */
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Authenticate Lambda requests using API key
 * Lambda sends X-API-Key header with secret key
 */
const authenticateLambda = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.LAMBDA_API_KEY || 'gaa-lambda-secret-key-2024';

  // Debug logging (remove after fix)
  console.log('🔐 Lambda Auth Check:', {
    received: apiKey ? `${apiKey.substring(0, 10)}...` : 'missing',
    expected: expectedKey ? `${expectedKey.substring(0, 10)}...` : 'missing',
    match: apiKey === expectedKey,
    receivedLength: apiKey?.length,
    expectedLength: expectedKey?.length
  });

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Mark request as from Lambda
  req.isLambda = true;
  next();
};

module.exports = {
  authenticateToken,
  authenticateAdmin,
  authenticateLambda
};
