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
const multer = require('multer');
const xml2js = require('xml2js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

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
    console.log(`🔍 Generating thumbnail URLs for ${result.rows.length} games`);
    console.log(`🪣 S3 Client available: ${!!s3Client}`);
    console.log(`🪣 Bucket: ${process.env.AWS_BUCKET_NAME}`);
    
    const gamesWithThumbnails = await Promise.all(
      result.rows.map(async (game) => {
        console.log(`📹 Game ${game.id}: thumbnail_key=${game.thumbnail_key}`);
        if (game.thumbnail_key && s3Client) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: game.thumbnail_key,
            });
            game.thumbnail_url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            console.log(`✅ Generated thumbnail URL for game ${game.id}`);
          } catch (error) {
            console.error(`❌ Failed to generate thumbnail URL for game ${game.id}:`, error);
          }
        } else {
          console.log(`⚠️  Skipping thumbnail for game ${game.id}: thumbnail_key=${game.thumbnail_key}, s3Client=${!!s3Client}`);
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

/**
 * POST /api/games/:id/events/upload-xml
 * 
 * Upload VEO XML file and parse events
 * Allows manual event upload without Lambda
 * 
 * Auth: User token
 */
router.post('/:id/events/upload-xml', authenticateToken, upload.single('xml'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate game exists and belongs to user
    const gameResult = await query(
      'SELECT g.* FROM games g WHERE g.id = $1 AND g.user_id = $2',
      [id, req.user.id]
    );
    
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Validate XML file
    if (!req.file) {
      return res.status(400).json({ error: 'No XML file uploaded' });
    }
    
    // Parse XML
    const parser = new xml2js.Parser();
    const xmlString = req.file.buffer.toString('utf-8');
    
    let xmlData;
    try {
      xmlData = await parser.parseStringPromise(xmlString);
    } catch (parseError) {
      console.error('XML parse error:', parseError);
      return res.status(400).json({ error: 'Invalid XML format' });
    }
    
    // Convert VEO XML to our event format
    const events = parseVeoXmlToEvents(xmlData);
    
    if (!events || events.length === 0) {
      return res.status(400).json({ error: 'No events found in XML' });
    }
    
    // Build events JSONB object
    const eventsData = {
      match_info: {
        source: 'manual_xml_upload',
        total_events: events.length,
        uploaded_at: new Date().toISOString()
      },
      events: events,
      team_mapping: null,
      updated_at: new Date().toISOString()
    };
    
    // Update database
    const updateResult = await query(
      `UPDATE games 
       SET events = $1::jsonb, 
           status = 'analyzed',
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [JSON.stringify(eventsData), id]
    );
    
    console.log(`✅ XML events uploaded for game ${id}: ${events.length} events`);
    
    res.json({
      success: true,
      game_id: id,
      events_count: events.length,
      status: updateResult.rows[0].status
    });
  } catch (error) {
    console.error('XML upload error:', error);
    res.status(500).json({ error: 'Failed to process XML upload' });
  }
});

/**
 * PUT /api/games/:id/events
 * 
 * Update game events after editing in frontend
 * Used by Edit Mode to persist event changes
 * 
 * Auth: User token
 */
router.put('/:id/events', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { events } = req.body;
    
    // Validate game exists and belongs to user
    const gameResult = await query(
      'SELECT g.* FROM games g WHERE g.id = $1 AND g.user_id = $2',
      [id, req.user.id]
    );
    
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Validate events array
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }
    
    // Convert frontend GameEvent format to database format
    const dbEvents = events.map(event => ({
      id: event.id,
      team: event.team,
      time: event.timestamp,
      action: event.type,
      outcome: event.metadata?.outcome || 'N/A',
      metadata: {
        ...event.metadata,
        player: event.player,
        description: event.description,
        validated: true, // Mark as validated by user
        userEdited: true,
        editedAt: new Date().toISOString(),
      }
    }));
    
    // Wrap in GAA Events Schema format
    const eventsData = {
      match_info: {
        source: 'user_edited',
        total_events: dbEvents.length,
        edited_at: new Date().toISOString(),
      },
      events: dbEvents,
      team_mapping: null,
      updated_at: new Date().toISOString()
    };
    
    // Update database
    const updateResult = await query(
      `UPDATE games
       SET events = $1::jsonb,
           status = 'analyzed',
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [JSON.stringify(eventsData), id]
    );
    
    console.log(`✅ Events updated for game ${id}: ${dbEvents.length} events`);
    
    res.json({
      success: true,
      game_id: id,
      events_count: dbEvents.length,
      status: updateResult.rows[0].status
    });
  } catch (error) {
    console.error('Update events error:', error);
    res.status(500).json({ error: 'Failed to update events' });
  }
});

/**
 * Parse VEO XML format to our event schema
 * 
 * Handles VEO XML structure and converts to GAA Events Schema format
 */
function parseVeoXmlToEvents(xmlData) {
  const events = [];
  
  try {
    // VEO XML typically has structure like:
    // <file><ALL_INSTANCES><instance>...</instance></ALL_INSTANCES></file>
    // or <file><instance>...</instance></file>
    
    let instances = [];
    
    // Try different XML structures
    if (xmlData.file && xmlData.file.ALL_INSTANCES && xmlData.file.ALL_INSTANCES[0]) {
      instances = xmlData.file.ALL_INSTANCES[0].instance || [];
    } else if (xmlData.file && xmlData.file.instance) {
      instances = xmlData.file.instance;
    } else if (xmlData.ALL_INSTANCES && xmlData.ALL_INSTANCES[0]) {
      instances = xmlData.ALL_INSTANCES[0].instance || [];
    } else if (xmlData.instance) {
      instances = xmlData.instance;
    }
    
    // Parse each instance
    instances.forEach((instance, index) => {
      try {
        // Extract event data from instance
        const code = instance.code ? instance.code[0] : '';
        const start = instance.start ? parseFloat(instance.start[0]) : 0;
        const team = instance.team ? instance.team[0].toLowerCase() : 'neutral';
        
        // Map VEO codes to our event types
        const eventType = mapVeoCodeToEventType(code);
        
        if (eventType) {
          events.push({
            id: `event_${index + 1}`,
            team: team === '0' || team === 'neutral' ? 'neutral' : (team === '1' ? 'home' : 'away'),
            timestamp: start,
            type: eventType.type,
            outcome: eventType.outcome || 'N/A',
            description: eventType.description || '',
            metadata: {
              veo_code: code,
              validated: false,
              autoGenerated: false,
              source: 'xml_upload'
            }
          });
        }
      } catch (err) {
        console.error('Error parsing instance:', err);
      }
    });
    
  } catch (error) {
    console.error('Error parsing VEO XML:', error);
  }
  
  return events;
}

/**
 * Map VEO action codes to our event schema
 */
function mapVeoCodeToEventType(code) {
  const codeUpper = code.toUpperCase();
  
  // Common VEO codes
  const mapping = {
    'SHOT': { type: 'shot', outcome: 'Shot' },
    'GOAL': { type: 'shot', outcome: 'Goal' },
    'POINT': { type: 'shot', outcome: 'Point' },
    'WIDE': { type: 'shot', outcome: 'Wide' },
    'SAVE': { type: 'shot', outcome: 'Saved' },
    'KICKOUT': { type: 'kickout', outcome: 'N/A' },
    'KICK-OUT': { type: 'kickout', outcome: 'N/A' },
    'TURNOVER': { type: 'turnover', outcome: 'N/A' },
    'FOUL': { type: 'foul', outcome: 'N/A' },
    'FREE': { type: 'foul', outcome: 'Free' },
    'YELLOW': { type: 'card', outcome: 'Yellow Card' },
    'BLACK': { type: 'card', outcome: 'Black Card' },
    'RED': { type: 'card', outcome: 'Red Card' },
    'THROW-UP': { type: 'throw-up', outcome: 'N/A' },
    'THROWUP': { type: 'throw-up', outcome: 'N/A' }
  };
  
  // Try exact match
  if (mapping[codeUpper]) {
    return mapping[codeUpper];
  }
  
  // Try partial match
  for (const key in mapping) {
    if (codeUpper.includes(key)) {
      return mapping[key];
    }
  }
  
  // Default: treat as generic event
  return {
    type: code.toLowerCase().replace(/[^a-z-]/g, ''),
    outcome: 'N/A',
    description: code
  };
}

// AI Chat endpoint
router.post('/:id/chat', authenticateToken, async (req, res) => {
  console.log(`🤖 AI Chat request for game: ${req.params.id}`)
  
  try {
    const { id } = req.params
    const { message, history = [], systemPrompt } = req.body

    console.log(`🤖 Message received: ${message}`)
    console.log(`🤖 Chat history length: ${history.length}`)

    if (!message) {
      console.log('❌ No message provided')
      return res.status(400).json({ error: 'Message is required' })
    }

    // Get game details with events
    console.log(`🎮 Fetching game data for: ${id}`)
    const gameResult = await query(
      'SELECT g.* FROM games g WHERE g.id = $1 AND g.user_id = $2',
      [id, req.user.id]
    )
    
    if (gameResult.rows.length === 0) {
      console.log('❌ Game not found in database')
      return res.status(404).json({ error: 'Game not found' })
    }

    const game = gameResult.rows[0]
    console.log(`✅ Game found: ${game.title}`)
    
    // Parse events from events JSONB column
    let events = []
    if (game.events && game.events.events) {
      events = game.events.events
    }
    console.log(`📊 Events parsed: ${events.length} events`)

    // Calculate GAA stats
    const stats = {
      totalEvents: events.length,
      goals: events.filter(e => e.action === 'goal').length,
      points: events.filter(e => e.action === 'point').length,
      wides: events.filter(e => e.action === 'wide').length,
      frees: events.filter(e => e.action === 'free').length,
      homeGoals: events.filter(e => e.team === 'home' && e.action === 'goal').length,
      awayGoals: events.filter(e => e.team === 'away' && e.action === 'goal').length,
      homePoints: events.filter(e => e.team === 'home' && e.action === 'point').length,
      awayPoints: events.filter(e => e.team === 'away' && e.action === 'point').length,
    }

    // Build context for AI
    const gameContext = `
Game Information:
- Title: ${game.title}
- Status: ${game.status}
- Created: ${game.created_at}

Match Statistics:
- Total Events: ${stats.totalEvents}
- Home Score: ${stats.homeGoals}-${stats.homePoints}
- Away Score: ${stats.awayGoals}-${stats.awayPoints}
- Goals: ${stats.goals}
- Points: ${stats.points}
- Wides: ${stats.wides}
- Frees: ${stats.frees}

Recent Events:
${events.slice(-10).map(event => 
  `- ${Math.floor(event.time / 60)}:${(event.time % 60).toString().padStart(2, '0')} - ${event.action}${event.team ? ` (${event.team} team)` : ''}${event.metadata?.description ? `: ${event.metadata.description}` : ''}${event.metadata?.player ? ` by ${event.metadata.player}` : ''}`
).join('\n')}
    `

    // Use coach-specific system prompt or default
    const defaultSystemPrompt = `You are an AI GAA analyst and coach assistant. You have access to detailed game data and events. Provide helpful analysis, tactical insights, and coaching advice based on the game context provided. Be specific and reference actual events when possible.

Current Game Context:
${gameContext}

Guidelines:
- Provide tactical analysis and coaching insights for GAA (Gaelic football/hurling)
- Reference specific events when relevant  
- Suggest improvements or highlight positive plays
- Answer questions about training, team strengths/weaknesses
- Be encouraging but constructive
- Keep responses concise but informative
- Focus on actionable advice for players and coaches`

    const finalSystemPrompt = systemPrompt ? `${systemPrompt}

Current Game Context:
${gameContext}` : defaultSystemPrompt

    // Build conversation history for Gemini
    let conversationText = finalSystemPrompt + '\n\n'
    
    // Add chat history
    history.forEach(msg => {
      if (msg.role === 'user') {
        conversationText += `Human: ${msg.content}\n\n`
      } else {
        conversationText += `Assistant: ${msg.content}\n\n`
      }
    })

    // Add current message
    conversationText += `Human: ${message}\n\nAssistant: `

    // Get Gemini model and generate response
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const result = await model.generateContent(conversationText)
    const aiResponse = result.response.text()

    res.json({
      response: aiResponse,
      gameStats: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI Chat error:', error)
    res.status(500).json({ 
      error: 'Failed to process chat request',
      details: error.message 
    })
  }
})

module.exports = router;

