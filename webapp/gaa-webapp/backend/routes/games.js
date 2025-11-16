/**
 * GAA Games Routes
 * 
 * Handles game creation, listing, and video management for GAA webapp.
 * 
 * Features:
 * - Create games with VEO URLs or file uploads
 * - Trigger Lambda to download VEO videos
 * - Generate presigned S3 URLs for video playback
 * - List user's games filtered by team
 * 
 * Part of: GAA Webapp Backend
 */

const express = require('express');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { query } = require('../utils/database');
const { authenticateToken, authenticateLambda } = require('../middleware/auth');
const { getPresignedUploadUrl, getPresignedDownloadUrl } = require('../utils/s3');

const router = express.Router();

// Lambda client (only initialize if AWS credentials are available)
let lambdaClient = null;
let s3Client = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  lambdaClient = new LambdaClient({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * GAA VEO Downloader Lambda Trigger
 * 
 * Triggers the GAA VEO downloader Lambda function when a VEO URL is submitted.
 * Lambda function downloads the video from VEO and uploads to S3.
 * 
 * @param {string} gameId - Game ID from database
 * @param {string} videoUrl - VEO match URL
 * @returns {Promise<boolean>} - True if Lambda invoked successfully
 */
async function triggerVeoDownload(gameId, videoUrl) {
  if (!lambdaClient) {
    console.log('⚠️  Lambda client not configured - skipping GAA VEO download trigger');
    return false;
  }

  const lambdaFunctionName = process.env.AWS_LAMBDA_FUNCTION_NAME || 'gaa-veo-downloader-nov25';
  
  try {
    console.log(`🚀 Triggering Lambda: ${lambdaFunctionName}`);
    console.log(`   Game ID: ${gameId}`);
    console.log(`   VEO URL: ${videoUrl}`);

    const invokeCommand = new InvokeCommand({
      FunctionName: lambdaFunctionName,
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify({
        game_id: gameId,
        video_url: videoUrl,
      }),
    });

    const lambdaResponse = await lambdaClient.send(invokeCommand);
    console.log(`✅ Lambda invoked successfully!`);
    console.log(`   Status Code: ${lambdaResponse.StatusCode}`);
    console.log(`   Request ID: ${lambdaResponse.$metadata.requestId}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to invoke Lambda:`, error);
    return false;
  }
}

// Get user's games
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.query;
    
    let queryText = `
      SELECT 
        g.*,
        t.name as team_name
      FROM games g
      INNER JOIN team_members tm ON g.team_id = tm.team_id
      INNER JOIN teams t ON g.team_id = t.id
      WHERE tm.user_id = $1
    `;
    
    const params = [req.user.userId];
    
    // Filter by team if teamId provided
    if (teamId) {
      queryText += ` AND g.team_id = $2`;
      params.push(teamId);
    }
    
    queryText += ` ORDER BY g.created_at DESC`;
    
    const result = await query(queryText, params);

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

    res.json({ games: gamesWithThumbnails });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to get games' });
  }
});

// Get presigned URL for file upload
router.post('/upload-url', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'File name and type are required' });
    }

    const { uploadUrl, s3Key, publicUrl } = await getPresignedUploadUrl(
      fileName,
      fileType,
      req.user.userId
    );

    res.json({ uploadUrl, s3Key, publicUrl });
  } catch (error) {
    console.error('Get upload URL error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Create game (supports VEO URL or file upload)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, teamId, videoUrl, s3Key, originalFilename, fileSize } = req.body;

    if (!title || !teamId) {
      return res.status(400).json({ error: 'Title and team ID are required' });
    }

    // Verify user is member of team
    const memberResult = await query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this team' });
    }

    // Determine file type based on videoUrl or s3Key
    let fileType = 'upload'; // default for file uploads
    let finalVideoUrl = null;

    if (s3Key) {
      // File upload - use public S3 URL
      fileType = 'upload';
      finalVideoUrl = `https://${process.env.AWS_BUCKET_NAME || 'clann-gaa-videos-nov25'}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${s3Key}`;
    } else if (videoUrl) {
      // URL input
      finalVideoUrl = videoUrl;
      if (videoUrl.includes('veo.co') || videoUrl.includes('app.veo.co')) {
        fileType = 'veo';
      } else if (videoUrl.includes('traceup.com')) {
        fileType = 'trace';
      } else if (videoUrl.includes('spiideo.com')) {
        fileType = 'spiideo';
      } else {
        fileType = 'veo'; // default for external URLs
      }
    }

    const result = await query(
      `INSERT INTO games (title, description, team_id, created_by, video_url, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [
        title,
        description || null,
        teamId,
        req.user.userId,
        finalVideoUrl,
      ]
    );

    const game = result.rows[0];

    // If GAA VEO URL submitted, trigger Lambda to download video
    // Lambda will: extract video URL → download → upload to S3 → update database
    if (fileType === 'veo' && finalVideoUrl && !s3Key) {
      console.log(`📹 GAA VEO URL detected - triggering download Lambda...`);
      
      // Trigger Lambda asynchronously (don't wait for response)
      // Game is created with status='pending', Lambda will update to 'analyzed' when done
      triggerVeoDownload(game.id, finalVideoUrl).catch(err => {
        console.error('❌ Failed to trigger GAA VEO download Lambda:', err);
        // Don't fail the request - game is created, Lambda can be triggered manually later
      });
    }

    res.status(201).json({ game });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get demo games (public, no auth required)
router.get('/demo', async (req, res) => {
  try {
    const result = await query(
      `SELECT g.id, g.title, g.description, g.thumbnail_url, g.duration, g.status, g.video_url, g.file_type, g.created_at
       FROM games g
       WHERE g.is_demo = true AND g.status = 'analyzed'
       ORDER BY g.created_at DESC
       LIMIT 5`
    );

    res.json({ games: result.rows });
  } catch (error) {
    console.error('Get demo games error:', error);
    res.status(500).json({ error: 'Failed to get demo games' });
  }
});

// Get single game
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        g.*,
        t.name as team_name
       FROM games g
       INNER JOIN team_members tm ON g.team_id = tm.team_id
       INNER JOIN teams t ON g.team_id = t.id
       WHERE g.id = $1 AND tm.user_id = $2`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = result.rows[0];
    
    // Generate presigned S3 URLs if s3_key exists
    if (game.s3_key) {
      try {
        const presignedUrl = await getPresignedDownloadUrl(game.s3_key);
        game.video_url = presignedUrl; // Override with presigned URL for secure access
      } catch (s3Error) {
        console.error('Failed to generate presigned URL:', s3Error);
        // Fallback to public URL if presigned fails
        game.video_url = `https://${process.env.AWS_BUCKET_NAME || 'clann-gaa-videos-nov25'}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${game.s3_key}`;
      }
    } else if (game.video_url && (game.video_url.includes('veocdn.com') || game.video_url.includes('veo.co'))) {
      // VEO URL - proxy through our backend to bypass CORS
      const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4011}`;
      game.video_url = `${backendUrl}/api/video-proxy?url=${encodeURIComponent(game.video_url)}`;
    }
    
    res.json({ game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game' });
  }
});

/**
 * POST /api/games/:id/events
 * 
 * Lambda endpoint to store events from AI analysis pipeline.
 * Accepts GAA Events Schema format and stores in events JSONB field.
 * 
 * Auth: Lambda API key (X-API-Key header)
 */
router.post('/:id/events', authenticateLambda, async (req, res) => {
  try {
    const { id } = req.params;
    const { events, match_info, team_mapping } = req.body;

    // Validate game exists
    const gameResult = await query('SELECT id FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Validate events data structure
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    // Build events JSONB object
    const eventsData = {
      match_info: match_info || {
        title: 'GAA Match Events',
        total_events: events.length,
        analysis_method: 'AI pipeline',
        created_at: new Date().toISOString()
      },
      events: events,
      team_mapping: team_mapping || null, // Store team mapping if provided
      updated_at: new Date().toISOString()
    };

    // Update database: store events and update status
    const updateResult = await query(
      `UPDATE games 
       SET events = $1::jsonb, 
           status = 'analyzed',
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [JSON.stringify(eventsData), id]
    );

    console.log(`✅ Events stored for game ${id}: ${events.length} events`);

    res.json({
      message: 'Events stored successfully',
      game_id: id,
      events_count: events.length,
      status: updateResult.rows[0].status
    });
  } catch (error) {
    console.error('Store events error:', error);
    res.status(500).json({ error: 'Failed to store events' });
  }
});

module.exports = router;

