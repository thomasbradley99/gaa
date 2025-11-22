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

    // Note: Multiple teams can have the same name (removed unique constraint for dev testing)
    
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
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get all teams with colors (public endpoint for team selection)
router.get('/all', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        id,
        name,
        description,
        primary_color,
        secondary_color,
        created_at
       FROM teams
       WHERE primary_color IS NOT NULL
       ORDER BY name ASC`
    );

    res.json({ teams: result.rows });
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

// Get team info by invite code (public endpoint)
router.get('/codes/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const result = await query(
      'SELECT id, name, description, invite_code FROM teams WHERE invite_code = $1',
      [inviteCode.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ team: result.rows[0] });
  } catch (error) {
    console.error('Get team by code error:', error);
    res.status(500).json({ error: 'Failed to get team info' });
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

// Join team by ID (for color-based selection)
router.post('/:teamId/join', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Find team by ID
    const teamResult = await query(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
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
    console.error('Join team by ID error:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// Update team
router.put('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description, primary_color, secondary_color, accent_color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Verify user is admin of team
    const memberCheck = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = $3',
      [teamId, req.user.userId, 'admin']
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only team admins can update team details' });
    }

    // Check if new name conflicts with another team (but not this one)
    const nameCheckResult = await query(
      'SELECT id, name FROM teams WHERE name = $1 AND id != $2',
      [name.trim(), teamId]
    );

    if (nameCheckResult.rows.length > 0) {
      return res.status(409).json({ 
        error: `A team named "${name}" already exists.`
      });
    }

    // Update team (including colors)
    const result = await query(
      `UPDATE teams 
       SET name = $1, 
           description = $2, 
           primary_color = COALESCE($3, primary_color),
           secondary_color = COALESCE($4, secondary_color),
           accent_color = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name.trim(), description || null, primary_color, secondary_color, accent_color, teamId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ team: result.rows[0] });
  } catch (error) {
    console.error('Update team error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: `A team with this name already exists.`
      });
    }
    
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Update team colors only (simplified endpoint)
router.patch('/:teamId/colors', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { primary_color, secondary_color, accent_color } = req.body;

    // Allow if user is application admin OR team admin
    const isApplicationAdmin = req.user.role === 'admin';
    
    // Check if user is team admin
    const memberCheck = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = $3',
      [teamId, req.user.userId, 'admin']
    );

    const isTeamAdmin = memberCheck.rows.length > 0;

    if (!isApplicationAdmin && !isTeamAdmin) {
      return res.status(403).json({ error: 'Only team admins or application admins can update team colors' });
    }

    // Update colors
    const result = await query(
      `UPDATE teams 
       SET primary_color = COALESCE($1, primary_color),
           secondary_color = COALESCE($2, secondary_color),
           accent_color = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [primary_color, secondary_color, accent_color, teamId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ team: result.rows[0] });
  } catch (error) {
    console.error('Update team colors error:', error);
    res.status(500).json({ error: 'Failed to update team colors' });
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

// Remove member from team (admin only)
router.delete('/:teamId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { teamId, memberId } = req.params;

    // Verify user is admin of team
    const adminCheck = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = $3',
      [teamId, req.user.userId, 'admin']
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only team admins can remove members' });
    }

    // Get member to remove
    const memberCheck = await query(
      'SELECT * FROM team_members WHERE id = $1 AND team_id = $2',
      [memberId, teamId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberCheck.rows[0];

    // Prevent removing yourself if you're the only admin
    if (member.user_id === req.user.userId && member.role === 'admin') {
      const adminCount = await query(
        'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1 AND role = $2',
        [teamId, 'admin']
      );
      if (parseInt(adminCount.rows[0].count) === 1) {
        return res.status(400).json({ error: 'Cannot remove the only admin. Promote another member first or delete the team.' });
      }
    }

    // Remove member
    await query(
      'DELETE FROM team_members WHERE id = $1 AND team_id = $2',
      [memberId, teamId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Leave team (member can leave themselves)
router.post('/:teamId/leave', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Get user's membership
    const memberCheck = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'You are not a member of this team' });
    }

    const member = memberCheck.rows[0];

    // Prevent leaving if you're the only admin
    if (member.role === 'admin') {
      const adminCount = await query(
        'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1 AND role = $2',
        [teamId, 'admin']
      );
      if (parseInt(adminCount.rows[0].count) === 1) {
        return res.status(400).json({ error: 'Cannot leave as the only admin. Promote another member first or delete the team.' });
      }
    }

    // Remove member
    await query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.userId]
    );

    res.json({ message: 'Left team successfully' });
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

// Promote member to admin (admin only)
router.post('/:teamId/members/:memberId/promote', authenticateToken, async (req, res) => {
  try {
    const { teamId, memberId } = req.params;

    // Verify user is admin of team
    const adminCheck = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = $3',
      [teamId, req.user.userId, 'admin']
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only team admins can promote members' });
    }

    // Get member to promote
    const memberCheck = await query(
      'SELECT * FROM team_members WHERE id = $1 AND team_id = $2',
      [memberId, teamId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Promote to admin
    await query(
      'UPDATE team_members SET role = $1 WHERE id = $2 AND team_id = $3',
      ['admin', memberId, teamId]
    );

    res.json({ message: 'Member promoted to admin successfully' });
  } catch (error) {
    console.error('Promote member error:', error);
    res.status(500).json({ error: 'Failed to promote member' });
  }
});

// Delete team (owner/admin only)
router.delete('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Verify user is admin of team
    const adminCheck = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = $3',
      [teamId, req.user.userId, 'admin']
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only team admins can delete the team' });
    }

    // Delete team (cascade will handle team_members and games)
    await query('DELETE FROM teams WHERE id = $1', [teamId]);

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// Get team statistics
router.get('/:teamId/stats', authenticateToken, async (req, res) => {
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

    // Get game count
    const gameCountResult = await query(
      'SELECT COUNT(*) as count FROM games WHERE team_id = $1',
      [teamId]
    );

    // Get member count
    const memberCountResult = await query(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = $1',
      [teamId]
    );

    res.json({
      gameCount: parseInt(gameCountResult.rows[0].count),
      memberCount: parseInt(memberCountResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({ error: 'Failed to get team statistics' });
  }
});

module.exports = router;

