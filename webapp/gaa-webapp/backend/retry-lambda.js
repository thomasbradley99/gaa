require('dotenv').config();
const { InvokeCommand, LambdaClient } = require('@aws-sdk/client-lambda');

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'eu-west-1',
});

async function retryLambda() {
  const gameId = '1a8ff7aa-1406-40e4-b91e-43f2d149520a';
  const s3Key = `videos/${gameId}/video.mp4`;
  
  try {
    console.log(`🔄 Re-triggering Lambda for game ${gameId}...`);
    
    const invokeCommand = new InvokeCommand({
      FunctionName: 'gaa-ai-analyzer-nov25',
      InvocationType: 'Event',
      Payload: JSON.stringify({
        game_id: gameId,
        s3_key: s3Key,
        title: 'Allen Gaels GAA, Drumshanbo vs Allen Gaels GAA, Drumshanbo'
      }),
    });

    const response = await lambdaClient.send(invokeCommand);
    console.log(`✅ Lambda re-triggered successfully!`);
    console.log(`   Status Code: ${response.StatusCode}`);
    console.log(`   Request ID: ${response.$metadata.requestId}`);
    
  } catch (error) {
    console.error(`❌ Failed to re-trigger Lambda:`, error);
  }
}

retryLambda();

