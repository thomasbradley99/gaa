const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'clann-gaa-videos-nov25';

/**
 * Generate a presigned URL for uploading a file to S3
 * @param {string} fileName - Original filename
 * @param {string} fileType - MIME type (e.g., 'video/mp4')
 * @param {string} userId - User ID for organizing uploads
 * @returns {Promise<{uploadUrl: string, s3Key: string}>}
 */
async function getPresignedUploadUrl(fileName, fileType, userId) {
  // Generate unique S3 key: videos/{userId}/{timestamp}-{random}-{filename}
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const s3Key = `videos/${userId}/${timestamp}-${random}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: fileType,
    // Note: Public access is controlled by bucket policy, not ACL
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

  return {
    uploadUrl,
    s3Key,
    publicUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${s3Key}`,
  };
}

/**
 * Generate a presigned URL for downloading/viewing a file from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>}
 */
async function getPresignedDownloadUrl(s3Key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  return downloadUrl;
}

module.exports = {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  BUCKET_NAME,
};

