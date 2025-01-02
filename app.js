const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');  // Security middleware

dotenv.config();  // Load environment variables

// Validate essential environment variables
if (!process.env.PORT) {
    console.error('FATAL ERROR: PORT is not defined');
    process.exit(1);
}

const app = express();
connectDB();      // Connect to MongoDB

app.use(cors());  // Enable CORS
app.use(helmet());  // Adds security headers
app.use(express.json()); // Enable JSON parsing

// Root route
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Existing routes
app.use('/api/stores', require('./routes/storeRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
        error: err.message
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
