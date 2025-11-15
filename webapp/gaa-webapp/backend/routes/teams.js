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

    // Check if user already has a team
    const existingTeamResult = await query(
      `SELECT t.* FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1 AND tm.role = 'admin'`,
      [req.user.userId]
    );

    if (existingTeamResult.rows.length > 0) {
      return res.status(400).json({ 
        error: 'You already have a team. Each user can only create one team.',
        existingTeam: existingTeamResult.rows[0]
      });
    }

    // Check if team name already exists
    const nameCheckResult = await query(
      'SELECT id, name FROM teams WHERE name = $1',
      [name.trim()]
    );

    if (nameCheckResult.rows.length > 0) {
      return res.status(409).json({ 
        error: `A team named "${name}" already exists. Each club can only have one team.`,
        existingTeam: nameCheckResult.rows[0]
      });
    }

    // Generate invite code (ensure it's unique)
    let inviteCode;
    let codeExists = true;
    while (codeExists) {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const codeCheck = await query(
        'SELECT id FROM teams WHERE invite_code = $1',
        [inviteCode]
      );
      codeExists = codeCheck.rows.length > 0;
    }

    const result = await query(
      `INSERT INTO teams (name, description, invite_code, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), description || null, inviteCode, req.user.userId]
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
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      if (error.constraint === 'unique_team_name') {
        return res.status(409).json({ 
          error: `A team named "${req.body.name}" already exists. Each club can only have one team.`
        });
      }
    }
    
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

// Get team members
router.get('/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verify user is member of team
    const memberCheck = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this team' });
    }

    // Get all team members with user details
    const result = await query(
      `SELECT 
        tm.id,
        tm.role,
        tm.joined_at,
        u.id as user_id,
        u.name,
        u.email
       FROM team_members tm
       INNER JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [teamId]
    );

    res.json({ members: result.rows });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Failed to get team members' });
  }
});

module.exports = router;

