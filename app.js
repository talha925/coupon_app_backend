const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();
connectDB();

app.use(express.json());

// Example root route
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/stores', require('./routes/storeRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
