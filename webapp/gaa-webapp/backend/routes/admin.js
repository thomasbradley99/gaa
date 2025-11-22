/**
 * Admin Routes
 * 
 * Provides admin-only endpoints to view all games, teams, and users.
 * Requires admin role authentication.
 */

const express = require('express');
const { query } = require('../utils/database');
const { authenticateAdmin } = require('../middleware/auth');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

// Initialize S3 client if AWS credentials are available
let s3Client = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * GET /api/admin/games
 * Get all games from all teams
 */
router.get('/games', authenticateAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        g.*,
        t.name as team_name,
        u.email as created_by_email,
        u.name as created_by_name
       FROM games g
       LEFT JOIN teams t ON g.team_id = t.id
       LEFT JOIN users u ON g.created_by = u.id
       ORDER BY g.created_at DESC`
    );

    // Generate presigned URLs for thumbnails
    const gamesWithThumbnails = await Promise.all(
      result.rows.map(async (game) => {
        if (game.thumbnail_key && s3Client) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: game.thumbnail_key,
            });
            game.thumbnail_url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          } catch (error) {
            console.error(`Failed to generate thumbnail URL for game ${game.id}:`, error);
          }
        }
        return game;
      })
    );

    res.json({ 
      games: gamesWithThumbnails,
      total: gamesWithThumbnails.length
    });
  } catch (error) {
    console.error('Admin get games error:', error);
    res.status(500).json({ error: 'Failed to get games' });
  }
});

/**
 * GET /api/admin/teams
 * Get all teams with member counts
 */
router.get('/teams', authenticateAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        t.*,
        u.email as created_by_email,
        u.name as created_by_name,
        COUNT(DISTINCT tm.user_id) as member_count,
        COUNT(DISTINCT g.id) as game_count
       FROM teams t
       LEFT JOIN users u ON t.created_by = u.id
       LEFT JOIN team_members tm ON t.id = tm.team_id
       LEFT JOIN games g ON t.id = g.team_id
       GROUP BY t.id, u.email, u.name
       ORDER BY t.created_at DESC`
    );

    res.json({ 
      teams: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Admin get teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

/**
 * GET /api/admin/users
 * Get users filtered by team (if teamId provided) or all users
 * Query params: teamId (optional) - filter users by team
 */
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { teamId } = req.query;
    
    let queryText;
    let params = [];

    if (teamId) {
      // Filter users by specific team
      queryText = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.phone,
          u.role,
          u.created_at,
          tm.role as team_role,
          tm.joined_at as team_joined_at,
          COUNT(DISTINCT g.id) as game_count
        FROM users u
        INNER JOIN team_members tm ON u.id = tm.user_id
        LEFT JOIN games g ON u.id = g.created_by
        WHERE tm.team_id = $1
        GROUP BY u.id, tm.role, tm.joined_at
        ORDER BY tm.joined_at ASC, u.created_at DESC
      `;
      params = [teamId];
    } else {
      // Get all users with their team information
      queryText = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.phone,
          u.role,
          u.created_at,
          COUNT(DISTINCT tm.team_id) as team_count,
          COUNT(DISTINCT g.id) as game_count,
          STRING_AGG(DISTINCT t.name, ', ' ORDER BY t.name) as team_names,
          MAX(tm.role) as team_role,
          MAX(tm.joined_at) as team_joined_at
        FROM users u
        LEFT JOIN team_members tm ON u.id = tm.user_id
        LEFT JOIN teams t ON tm.team_id = t.id
        LEFT JOIN games g ON u.id = g.created_by
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `;
    }

    const result = await query(queryText, params);

    res.json({ 
      users: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update a user's role (make admin or remove admin)
 * Body: { role: 'admin' | 'user' }
 */
router.put('/users/:id/role', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || (role !== 'admin' && role !== 'user')) {
      return res.status(400).json({ error: 'Role must be "admin" or "user"' });
    }

    // Prevent removing your own admin access
    if (req.user.userId === id && role !== 'admin') {
      return res.status(403).json({ error: 'Cannot remove your own admin access' });
    }

    const result = await query(
      `UPDATE users 
       SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, name, role`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ Admin ${req.user.email} updated user ${result.rows[0].email} role to ${role}`);

    res.json({ 
      user: result.rows[0],
      message: `User role updated to ${role}`
    });
  } catch (error) {
    console.error('Admin update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * GET /api/admin/stats
 * Get overall statistics
 */
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [usersResult, teamsResult, gamesResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM teams'),
      query('SELECT COUNT(*) as count FROM games'),
    ]);

    const stats = {
      totalUsers: parseInt(usersResult.rows[0].count),
      totalTeams: parseInt(teamsResult.rows[0].count),
      totalGames: parseInt(gamesResult.rows[0].count),
    };

    res.json({ stats });
  } catch (error) {
    console.error('Admin get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;

