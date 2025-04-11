require('dotenv').config();
const mongoose = require('mongoose');
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// --- MongoDB Setup ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const StoreSchema = new mongoose.Schema({ image: { url: String } }, { collection: 'stores' });
const Store = mongoose.model('Store', StoreSchema);

// --- AWS S3 Setup ---
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_BUCKET_NAME;

async function cleanupUnusedImages() {
  try {
    console.log('Fetching all image URLs from DB...');
    const stores = await Store.find({});
    const usedImageKeys = new Set(
      stores
        .map(s => s.image?.url)
        .filter(Boolean)
        .map(url => {
          try {
            return new URL(url).pathname.substring(1); // remove starting "/"
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );

    console.log('Fetching all objects from S3...');
    const allS3Keys = [];
    let continuationToken = undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      });
      const data = await s3.send(listCommand);
      const keys = data.Contents?.map(obj => obj.Key) || [];
      allS3Keys.push(...keys);
      continuationToken = data.IsTruncated ? data.NextContinuationToken : undefined;
    } while (continuationToken);

    const unusedKeys = allS3Keys.filter(key => !usedImageKeys.has(key));
    console.log(`Found ${unusedKeys.length} unused images.`);

    for (const key of unusedKeys) {
      const delCmd = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
      await s3.send(delCmd);
      console.log(`🗑️ Deleted unused: ${key}`);
    }

    console.log('✅ Cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  }
}

cleanupUnusedImages();
