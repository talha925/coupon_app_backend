const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Set up Multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Set up S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Route for handling image upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileKey = `${uuidv4()}-${req.file.originalname}`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;
