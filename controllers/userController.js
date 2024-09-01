const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register a new user
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ status: 'success', message: 'User registered' });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Log in a user
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ status: 'error', error: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ status: 'error', error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ status: 'success', token });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Save a coupon
exports.saveCoupon = async (req, res) => {
    const { userId, couponId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ status: 'error', error: 'User not found' });

        if (!user.savedCoupons.includes(couponId)) {
            user.savedCoupons.push(couponId);
            await user.save();
        }

        res.status(200).json({ status: 'success', data: user });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};
