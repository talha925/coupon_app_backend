const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Multer in-memory storage configuration
const storage = multer.memoryStorage();
const upload = multer({ storage });

// S3 client setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Route for handling image upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file uploaded in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileKey = `${uuidv4()}-${encodeURIComponent(req.file.originalname)}`;
    console.log('Generated File Key:', fileKey);

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    console.log('Uploading to S3 with params:', uploadParams);
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    console.log('Image URL:', imageUrl);

    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error.message);
    console.error('Error details:', error.stack);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

module.exports = router;
