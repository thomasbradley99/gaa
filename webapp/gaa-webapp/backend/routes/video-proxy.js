const express = require('express');
const axios = require('axios');
const { extractVideoUrlFromVeoPage } = require('../utils/veo-extractor');

const router = express.Router();

/**
 * Simple video proxy to bypass CORS for VEO videos
 * Usage: /api/video-proxy?url=https://c.veocdn.com/... or https://app.veo.co/matches/...
 */
router.get('/', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Video URL required' });
    }

    // Security: Only allow VEO URLs
    if (!url.includes('veocdn.com') && !url.includes('veo.co')) {
      return res.status(403).json({ error: 'Only VEO videos allowed' });
    }

    let videoUrl = url;
    
    // If it's a VEO match page (app.veo.co), extract the actual video URL
    if (url.includes('app.veo.co/matches')) {
      console.log('📄 VEO match page detected, extracting video URL...');
      const extractedUrl = await extractVideoUrlFromVeoPage(url);
      if (!extractedUrl) {
        return res.status(404).json({ error: 'Could not extract video URL from VEO page' });
      }
      videoUrl = extractedUrl;
    }

    console.log('📹 Proxying video:', videoUrl);

    // Stream video from VEO through our backend
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'Range': req.headers.range || 'bytes=0-', // Support video seeking
      }
    });

    // Forward VEO's headers to client
    res.set({
      'Content-Type': response.headers['content-type'] || 'video/mp4',
      'Content-Length': response.headers['content-length'],
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*', // Allow CORS
    });

    // Handle range requests (for video seeking)
    if (response.status === 206) {
      res.status(206);
      res.set('Content-Range', response.headers['content-range']);
    }

    // Pipe video stream
    response.data.pipe(res);

  } catch (error) {
    console.error('Video proxy error:', error.message);
    res.status(500).json({ error: 'Failed to proxy video' });
  }
});

module.exports = router;

