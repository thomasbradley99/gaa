#!/usr/bin/env node
/**
 * Test script to extract video URL from VEO match page
 * 
 * Usage: node test-veo-extraction.js <veo-url>
 * Example: node test-veo-extraction.js https://app.veo.co/matches/20250612-snr-v-magherafelt-12-6-25-39d247f3/
 */

const axios = require('axios');

const VEO_URL = process.argv[2] || 'https://app.veo.co/matches/20250612-snr-v-magherafelt-12-6-25-39d247f3/';

console.log('🔍 VEO Video URL Extractor - Test Script');
console.log('='.repeat(60));
console.log(`📄 Target URL: ${VEO_URL}\n`);

async function testMethod1_FetchHTML() {
  console.log('\n📋 Method 1: Fetch HTML and parse meta tags...');
  try {
    const response = await axios.get(VEO_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
      maxRedirects: 5
    });

    const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    console.log(`   ✅ Fetched HTML (${html.length} bytes)`);

    // Try to find video ID in Open Graph tags
    const ogImageMatch = html.match(/property="og:image".*content="([^"]+)"/);
    if (ogImageMatch) {
      console.log(`   📸 Found OG Image: ${ogImageMatch[1]}`);
      
      // Extract video ID from thumbnail URL
      const videoIdMatch = ogImageMatch[1].match(/c\.veocdn\.com\/([a-f0-9\-]+)/);
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        console.log(`   ✅ Found Video ID: ${videoId}`);
        return { videoId, thumbnailUrl: ogImageMatch[1] };
      }
    }

    // Try to find video ID in any thumbnail URL pattern
    const thumbnailPatterns = [
      /c\.veocdn\.com\/([a-f0-9\-]+)\/[^"'\s]+thumbnail\.jpg/g,
      /https:\/\/c\.veocdn\.com\/([a-f0-9\-]+)\//g,
    ];

    for (const pattern of thumbnailPatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        const videoId = matches[0][1];
        console.log(`   ✅ Found Video ID (pattern): ${videoId}`);
        return { videoId, thumbnailUrl: matches[0][0] };
      }
    }

    // Try to find video ID in script tags (if it's a SPA)
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      console.log(`   📜 Found ${scriptMatches.length} script tags, searching for video ID...`);
      for (const script of scriptMatches) {
        const videoIdMatch = script.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (videoIdMatch) {
          const possibleId = videoIdMatch[1];
          if (script.includes('veocdn') || script.includes('video')) {
            console.log(`   ✅ Possible Video ID in script: ${possibleId}`);
            return { videoId: possibleId };
          }
        }
      }
    }

    console.log('   ❌ Could not extract video ID from HTML');
    return null;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function testMethod2_APIEndpoint() {
  console.log('\n📋 Method 2: Try VEO API endpoints...');
  
  // Extract match ID from URL
  const matchIdMatch = VEO_URL.match(/\/matches\/([^\/]+)/);
  if (!matchIdMatch) {
    console.log('   ❌ Could not extract match ID from URL');
    return null;
  }

  const matchId = matchIdMatch[1];
  console.log(`   🔍 Extracted Match ID: ${matchId}`);

  // Try various API endpoints
  const apiEndpoints = [
    `https://app.veo.co/api/matches/${matchId}`,
    `https://app.veo.co/api/v1/matches/${matchId}`,
    `https://api.veo.co/matches/${matchId}`,
    `https://app.veo.co/api/match/${matchId}`,
  ];

  for (const endpoint of apiEndpoints) {
    try {
      console.log(`   🔍 Trying: ${endpoint}`);
      const response = await axios.get(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200 && response.data) {
        console.log(`   ✅ Got response from ${endpoint}`);
        console.log(`   📦 Response keys: ${Object.keys(response.data).join(', ')}`);
        
        // Try to find video URL in response
        const responseStr = JSON.stringify(response.data);
        const videoUrlMatch = responseStr.match(/c\.veocdn\.com\/[^"'\s]+video\.mp4/);
        if (videoUrlMatch) {
          console.log(`   ✅ Found video URL in API response: ${videoUrlMatch[0]}`);
          return { videoUrl: videoUrlMatch[0] };
        }

        // Try to find video ID
        const videoIdMatch = responseStr.match(/"video_id":\s*"([^"]+)"/);
        if (videoIdMatch) {
          console.log(`   ✅ Found video_id in API: ${videoIdMatch[1]}`);
          return { videoId: videoIdMatch[1] };
        }

        // Log full response for inspection
        console.log(`   📄 Full response (first 500 chars): ${responseStr.substring(0, 500)}...`);
      } else {
        console.log(`   ⚠️  Status ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`   ⚠️  Status ${error.response.status}`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  return null;
}

async function testMethod3_ParseVideoUrl(videoId, thumbnailUrl) {
  if (!videoId) {
    console.log('\n📋 Method 3: Skipping - no video ID found');
    return null;
  }

  console.log('\n📋 Method 3: Try different video URL patterns...');
  
  // Extract path structure from thumbnail URL if available
  let basePath = 'standard';
  let subPath = 'human';
  let hashPath = 'b16608bb'; // Common hash

  if (thumbnailUrl) {
    const pathMatch = thumbnailUrl.match(/c\.veocdn\.com\/[^\/]+\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
    if (pathMatch) {
      basePath = pathMatch[1] || 'standard';
      subPath = pathMatch[2] || 'human';
      hashPath = pathMatch[3] || 'b16608bb';
      console.log(`   📁 Extracted path structure: ${basePath}/${subPath}/${hashPath}`);
    }
  }

  // Try multiple video URL patterns
  const videoUrlPatterns = [
    `https://c.veocdn.com/${videoId}/${basePath}/${subPath}/${hashPath}/video.mp4`,
    `https://c.veocdn.com/${videoId}/${basePath}/${subPath}/video.mp4`,
    `https://c.veocdn.com/${videoId}/${basePath}/video.mp4`,
    `https://c.veocdn.com/${videoId}/standard/human/b16608bb/video.mp4`,
    `https://c.veocdn.com/${videoId}/standard/human/video.mp4`,
    `https://c.veocdn.com/${videoId}/standard/video.mp4`,
    `https://c.veocdn.com/${videoId}/video.mp4`,
  ];

  console.log(`   🔍 Testing ${videoUrlPatterns.length} URL patterns...`);

  for (const videoUrl of videoUrlPatterns) {
    try {
      const response = await axios.head(videoUrl, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200) {
        const finalUrl = response.request?.res?.responseUrl || videoUrl;
        console.log(`   ✅ WORKING VIDEO URL: ${finalUrl}`);
        return { videoUrl: finalUrl, working: true };
      } else if (response.status === 301 || response.status === 302) {
        const redirectUrl = response.headers.location;
        console.log(`   ⚠️  Redirect (${response.status}): ${redirectUrl}`);
        // Check if redirect is valid
        const redirectCheck = await axios.head(redirectUrl, { timeout: 5000, validateStatus: () => true });
        if (redirectCheck.status === 200) {
          console.log(`   ✅ REDIRECTED TO WORKING URL: ${redirectUrl}`);
          return { videoUrl: redirectUrl, working: true };
        }
      } else {
        console.log(`   ❌ Status ${response.status}: ${videoUrl}`);
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          // Don't log 404s for all patterns - too noisy
        } else {
          console.log(`   ⚠️  Status ${error.response.status}: ${videoUrl}`);
        }
      }
    }
  }

  console.log('   ❌ No working video URL found');
  return null;
}

async function main() {
  try {
    // Method 1: Fetch HTML
    const method1Result = await testMethod1_FetchHTML();
    
    // Method 2: Try API endpoints
    const method2Result = await testMethod2_APIEndpoint();

    // Method 3: Try to construct video URL
    const videoId = method1Result?.videoId || method2Result?.videoId;
    const thumbnailUrl = method1Result?.thumbnailUrl;
    
    const method3Result = await testMethod3_ParseVideoUrl(videoId, thumbnailUrl);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    
    if (method3Result?.working) {
      console.log(`✅ SUCCESS! Working video URL found:`);
      console.log(`   ${method3Result.videoUrl}`);
      process.exit(0);
    } else if (videoId) {
      console.log(`⚠️  Found video ID (${videoId}) but could not verify working URL`);
      console.log(`   Try manually: https://c.veocdn.com/${videoId}/standard/human/video.mp4`);
      process.exit(1);
    } else {
      console.log(`❌ Could not extract video ID or URL`);
      console.log(`\n💡 Possible reasons:`);
      console.log(`   - Page is JavaScript-rendered (needs headless browser)`);
      console.log(`   - Requires authentication`);
      console.log(`   - VEO changed their structure`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

