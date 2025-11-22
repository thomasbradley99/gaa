const axios = require('axios');

/**
 * Extract direct video URL from VEO match page
 * @param {string} veoUrl - VEO match page URL (e.g., https://app.veo.co/matches/...)
 * @returns {Promise<string|null>} - Direct video URL or null if extraction fails
 */
async function extractVideoUrlFromVeoPage(veoUrl) {
  try {
    console.log('🔍 Extracting video URL from VEO page:', veoUrl);
    
    // If already a direct video URL, return it
    if (veoUrl.includes('c.veocdn.com') && veoUrl.endsWith('.mp4')) {
      console.log('✅ Already a direct video URL');
      return veoUrl;
    }
    
    // Fetch VEO page
    const pageResponse = await axios.get(veoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 30000
    });
    
    const pageContent = typeof pageResponse.data === 'string' ? pageResponse.data : JSON.stringify(pageResponse.data);
    
    // Look for video ID in multiple patterns (more flexible)
    const patterns = [
      // OG Image meta tag
      /property="og:image".*content="([^"]+)"/,
      // Any thumbnail URL pattern
      /https:\/\/c\.veocdn\.com\/([a-f0-9\-]+)\/[^"'\s]+thumbnail\.jpg/,
      /c\.veocdn\.com\/([a-f0-9\-]+)\/[^"'\s]+thumbnail\.jpg/,
      // Generic pattern
      /c\.veocdn\.com\/([a-f0-9\-]+)\//
    ];
    
    let videoId = null;
    let thumbnailUrl = null;
    
    for (const pattern of patterns) {
      const match = pageContent.match(pattern);
      if (match) {
        // If pattern matched OG image, extract video ID from the URL
        if (match[0].includes('og:image')) {
          const urlMatch = match[1].match(/c\.veocdn\.com\/([a-f0-9\-]+)/);
          if (urlMatch) {
            videoId = urlMatch[1];
            thumbnailUrl = match[1];
          }
        } else {
          videoId = match[1];
          thumbnailUrl = match[0];
        }
        
        if (videoId) {
          console.log('✅ Found video ID:', videoId);
          break;
        }
      }
    }
    
    if (videoId) {
      // Extract path structure from thumbnail URL if available (more flexible pattern)
      const thumbnailPathMatch = pageContent.match(/c\.veocdn\.com\/[^\/]+\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
      let basePath = 'standard';
      let subPath = 'human';
      let hashPath = 'b16608bb'; // Common hash
      
      if (thumbnailPathMatch) {
        basePath = thumbnailPathMatch[1] || 'standard';
        subPath = thumbnailPathMatch[2] || 'human';
        hashPath = thumbnailPathMatch[3] || 'b16608bb';
        console.log('📁 Extracted path structure:', { basePath, subPath, hashPath });
      } else {
        console.log('⚠️  Could not extract path structure, using defaults');
      }
      
      // Try multiple video URL patterns (VEO uses different paths)
      const videoUrlPatterns = [
        `https://c.veocdn.com/${videoId}/${basePath}/${subPath}/${hashPath}/video.mp4`,
        `https://c.veocdn.com/${videoId}/${basePath}/${subPath}/video.mp4`,
        `https://c.veocdn.com/${videoId}/${basePath}/video.mp4`,
        `https://c.veocdn.com/${videoId}/standard/human/b16608bb/video.mp4`,
        `https://c.veocdn.com/${videoId}/standard/human/video.mp4`,
        `https://c.veocdn.com/${videoId}/standard/video.mp4`,
        `https://c.veocdn.com/${videoId}/video.mp4`
      ];
      
      for (const videoUrl of videoUrlPatterns) {
        try {
          console.log('🔍 Trying video URL:', videoUrl);
          const headResponse = await axios.head(videoUrl, { 
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Accept redirects
          });
          if (headResponse.status === 200 || headResponse.status === 301 || headResponse.status === 302) {
            const finalUrl = headResponse.request?.res?.responseUrl || videoUrl;
            console.log('✅ Verified video URL:', finalUrl);
            return finalUrl;
          }
        } catch (e) {
          // Continue to next pattern - don't log every failure to avoid spam
          if (videoUrlPatterns.indexOf(videoUrl) < 3) {
            console.log('⚠️  URL failed:', videoUrl);
          }
        }
      }
    }
    
    console.log('❌ Could not extract video URL from VEO page');
    return null;
  } catch (error) {
    console.error('❌ Error extracting video URL:', error.message);
    return null;
  }
}

module.exports = { extractVideoUrlFromVeoPage };

