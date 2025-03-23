const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');  // Security middleware
const errorHandler = require('./middlewares/errorHandler'); 

dotenv.config();  // Load environment variables

// Validate essential environment variables
if (!process.env.PORT) {
    console.error('FATAL ERROR: PORT is not defined');
    process.exit(1);
}

const app = express();
connectDB();      // Connect to MongoDB

// Middleware
app.use(cors({
    origin: '*',  // Allows requests from any domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet());  // Adds security headers
app.use(express.json()); // Enable JSON parsing

// Routes
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.use('/api/stores', require('./routes/storeRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Error handling middleware (must be after routes)
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});