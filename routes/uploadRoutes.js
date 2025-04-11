const express = require('express');
const multer = require('multer');
// In your Node.js file, typically where you have other AWS SDK imports
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const he = require('he'); // <-- 'he' library ko import karen

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

    // const fileKey = `${uuidv4()}-${encodeURIComponent(req.file.originalname)}`;
const fileKey = `${Date.now()}-${uuidv4()}-${encodeURIComponent(req.file.originalname)}`;

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

// Route to delete image from S3
router.post('/delete-image', async (req, res) => {
  try {
      const { imageUrl: encodedImageUrl } = req.body; // Isko naya naam dein (encodedImageUrl)
      console.log('--- Delete Image Request ---');
      console.log('Received potentially encoded imageUrl:', encodedImageUrl);

      if (!encodedImageUrl) {
          console.error('Validation Error: Image URL is missing.');
          return res.status(400).json({ error: 'Image URL is required' });
      }

      // <<<--- DECODING STEP ADD KAREN --->>>
      const imageUrl = he.decode(encodedImageUrl);
      // <<<--- Decoded URL ko log karen check karne ke liye --->>>
      console.log('Decoded imageUrl:', imageUrl);

      let fileKey;
      try {
           // Ab DECODED URL ko parse karen
           const url = new URL(imageUrl);
           console.log('Parsed pathname from decoded URL:', url.pathname);

           // Ab jab URL theek hai, simple logic istemal karen key nikalne ke liye
           // (assuming keys mein slashes nahi hote)
           fileKey = url.pathname.substring(1); // Pehla slash / hata dein
           console.log('Extracted fileKey from decoded URL:', fileKey);

      } catch(parseError) {
          console.error('Error parsing DECODED imageUrl:', imageUrl, parseError);
          return res.status(400).json({ error: 'Invalid image URL format after decoding' });
      }

      console.log('Checking if fileKey is empty...');
      if (!fileKey) {
          console.error('Validation Error: Extracted fileKey is empty after decoding.');
          // Agar decode karne ke baad bhi key empty hai, toh 400 bhejen
          return res.status(400).json({ error: 'File key could not be extracted from decoded URL' });
      }

      // S3 delete parameters
      const deleteParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: fileKey,
      };
      console.log('Attempting S3 deletion with params:', deleteParams);

      // Execute S3 delete operation
      const command = new DeleteObjectCommand(deleteParams);
      await s3.send(command);
      console.log('S3 deletion successful for key:', fileKey);

      res.status(200).json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
      console.error('!!! Error in /delete-image route:', error);
      if (error.name === 'NoSuchKey') {
         console.warn('S3 delete warning: Key not found:', error.message);
         res.status(200).json({ success: true, message: 'Image not found on S3 (possibly already deleted).' });
      } else {
         res.status(500).json({ error: 'Failed to delete image', details: error.message });
      }
  }
});



module.exports = router;
