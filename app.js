const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');

dotenv.config();  // Load environment variables

const app = express();
connectDB();      // Connect to MongoDB

app.use(cors());  // Enable CORS
app.use(express.json()); // Enable JSON parsing

// Root route
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Existing routes
app.use('/api/stores', require('./routes/storeRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));

// Upload route
app.use('/api/upload', require('./routes/uploadRoutes')); // Upload route for handling image uploads

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
