const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const router = express.Router(); // Ensure the router is defined

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
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique file key
    const fileKey = `${uuidv4()}-${req.file.originalname}`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read', // Ensure the file is publicly accessible
    };

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    res.status(200).json({ imageUrl }); // Return the image URL
  } catch (error) {
    console.error('Error uploading image:', error.message);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;
