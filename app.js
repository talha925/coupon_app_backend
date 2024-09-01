const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');

dotenv.config();

const app = express();
connectDB();

app.use(cors()); 
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.use('/api/stores', require('./routes/storeRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
