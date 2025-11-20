/**
 * Clubs Routes
 * 
 * Provides endpoints to view GAA clubs and filter by VEO usage.
 */

const express = require('express');
const { query } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/clubs
 * Get all clubs, optionally filtered by uses_veo
 * Query params: usesVeo (optional) - 'true' or 'false' to filter
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { usesVeo, county, province, search } = req.query;
    
    let queryText = 'SELECT * FROM clubs WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    // Filter by VEO usage
    if (usesVeo === 'true') {
      paramCount++;
      queryText += ` AND uses_veo = $${paramCount}`;
      params.push(true);
    } else if (usesVeo === 'false') {
      paramCount++;
      queryText += ` AND uses_veo = $${paramCount}`;
      params.push(false);
    }
    
    // Filter by county
    if (county) {
      paramCount++;
      queryText += ` AND county = $${paramCount}`;
      params.push(county);
    }
    
    // Filter by province
    if (province) {
      paramCount++;
      queryText += ` AND province = $${paramCount}`;
      params.push(province);
    }
    
    // Search by club name
    if (search) {
      paramCount++;
      queryText += ` AND club_name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }
    
    queryText += ' ORDER BY club_name ASC';
    
    const result = await query(queryText, params);
    
    res.json({
      clubs: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({ error: 'Failed to get clubs' });
  }
});

/**
 * GET /api/clubs/stats
 * Get statistics about clubs
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [totalResult, veoResult, countiesResult, provincesResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM clubs'),
      query('SELECT COUNT(*) as count FROM clubs WHERE uses_veo = true'),
      query('SELECT COUNT(DISTINCT county) as count FROM clubs WHERE county IS NOT NULL'),
      query('SELECT COUNT(DISTINCT province) as count FROM clubs WHERE province IS NOT NULL')
    ]);
    
    res.json({
      stats: {
        total: parseInt(totalResult.rows[0].count),
        usingVeo: parseInt(veoResult.rows[0].count),
        notUsingVeo: parseInt(totalResult.rows[0].count) - parseInt(veoResult.rows[0].count),
        counties: parseInt(countiesResult.rows[0].count),
        provinces: parseInt(provincesResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get clubs stats error:', error);
    res.status(500).json({ error: 'Failed to get clubs stats' });
  }
});

/**
 * GET /api/clubs/counties
 * Get list of all counties
 */
router.get('/counties', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT DISTINCT county FROM clubs WHERE county IS NOT NULL ORDER BY county ASC'
    );
    
    res.json({
      counties: result.rows.map(row => row.county)
    });
  } catch (error) {
    console.error('Get counties error:', error);
    res.status(500).json({ error: 'Failed to get counties' });
  }
});

/**
 * GET /api/clubs/provinces
 * Get list of all provinces
 */
router.get('/provinces', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT DISTINCT province FROM clubs WHERE province IS NOT NULL ORDER BY province ASC'
    );
    
    res.json({
      provinces: result.rows.map(row => row.province)
    });
  } catch (error) {
    console.error('Get provinces error:', error);
    res.status(500).json({ error: 'Failed to get provinces' });
  }
});

module.exports = router;

