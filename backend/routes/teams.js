const express = require('express');
const { query } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's teams
router.get('/my-teams', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT t.* FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1`,
      [req.user.userId]
    );

    res.json({ teams: result.rows });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

// Create team
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Generate invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await query(
      `INSERT INTO teams (name, description, invite_code, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, inviteCode, req.user.userId]
    );

    const team = result.rows[0];

    // Add creator as team member
    await query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [team.id, req.user.userId]
    );

    res.status(201).json({ team });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Join team by invite code
router.post('/join-by-code', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    // Find team by invite code
    const teamResult = await query(
      'SELECT * FROM teams WHERE invite_code = $1',
      [inviteCode]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const team = teamResult.rows[0];

    // Check if user is already a member
    const memberResult = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [team.id, req.user.userId]
    );

    if (memberResult.rows.length > 0) {
      return res.json({ team, message: 'Already a member' });
    }

    // Add user to team
    await query(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES ($1, $2, 'member')`,
      [team.id, req.user.userId]
    );

    res.json({ team, message: 'Successfully joined team' });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

module.exports = router;

