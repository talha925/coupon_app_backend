const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/userModel');
const AppError = require('../errors/AppError');
const { promisify } = require('util');

// Generate JWT token
const signToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Create and send JWT token response
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    
    // Update last login time
    User.findByIdAndUpdate(user._id, { lastLogin: Date.now() }).catch(err => {
        console.error('Failed to update last login time:', err);
    });
    
    // Remove password from output
    user.password = undefined;
    
    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user }
    });
};

/**
 * Register a new admin user
 * Only super-admin can create new admin accounts
 */
exports.register = async (req, res, next) => {
    try {
        // Check if the requester is a super-admin (this is handled by the protect & restrictTo middleware)
        
        const { name, email, password, passwordConfirm, role = 'admin' } = req.body;
        
        // Validate password confirmation
        if (password !== passwordConfirm) {
            return next(new AppError('Passwords do not match', 400));
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new AppError('Email already in use', 400));
        }
        
        // Create new user (password will be hashed by the pre-save hook)
        const newUser = await User.create({
            name,
            email,
            password,
            role: role === 'super-admin' && req.user.role !== 'super-admin' ? 'admin' : role
        });
        
        createSendToken(newUser, 201, res);
    } catch (error) {
        next(new AppError(error.message || 'Error registering user', error.statusCode || 500));
    }
};

/**
 * Login with email and password
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        // Check if email and password exist
        if (!email || !password) {
            return next(new AppError('Please provide email and password', 400));
        }
        
        // Check if user exists and password is correct
        const user = await User.findOne({ email, active: true }).select('+password');
        
        if (!user || !(await user.correctPassword(password, user.password))) {
            return next(new AppError('Incorrect email or password', 401));
        }
        
        // Check if user is an admin or super-admin
        if (user.role !== 'admin' && user.role !== 'super-admin') {
            return next(new AppError('Access denied. Admin privileges required', 403));
        }
        
        // Send token
        createSendToken(user, 200, res);
    } catch (error) {
        next(new AppError(error.message || 'Error logging in', error.statusCode || 500));
    }
};

/**
 * Get current user profile
 */
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user);
        
        if (!user) {
            return next(new AppError('User not found', 404));
        }
        
        res.status(200).json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        next(new AppError(error.message || 'Error fetching profile', error.statusCode || 500));
    }
};

/**
 * Update current user password
 */
exports.updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, passwordConfirm } = req.body;
        
        // Validate input
        if (!currentPassword || !newPassword || !passwordConfirm) {
            return next(new AppError('Please provide current password, new password, and password confirmation', 400));
        }
        
        if (newPassword !== passwordConfirm) {
            return next(new AppError('New passwords do not match', 400));
        }
        
        // Get user with password
        const user = await User.findById(req.user).select('+password');
        
        // Check current password
        if (!(await user.correctPassword(currentPassword, user.password))) {
            return next(new AppError('Current password is incorrect', 401));
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        // Send new token
        createSendToken(user, 200, res);
    } catch (error) {
        next(new AppError(error.message || 'Error updating password', error.statusCode || 500));
    }
};

/**
 * Request password reset (forgot password)
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return next(new AppError('Please provide your email address', 400));
        }
        
        // Find user by email
        const user = await User.findOne({ email, active: true });
        
        if (!user) {
            return next(new AppError('No user found with that email address', 404));
        }
        
        // Generate reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });
        
        // Create reset URL
        const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
        
        try {
            // Here you would send an email with the reset URL using nodemailer
            // For now, we'll just return the token in the response (for development)
            
            res.status(200).json({
                status: 'success',
                message: 'Token sent to email',
                // DEV ONLY - remove in production
                resetToken,
                resetURL
            });
        } catch (err) {
            // If email sending fails, reset the token fields
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            
            return next(new AppError('Error sending password reset email. Please try again later.', 500));
        }
    } catch (error) {
        next(new AppError(error.message || 'Error requesting password reset', error.statusCode || 500));
    }
};

/**
 * Reset password with token
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const { password, passwordConfirm } = req.body;
        const { token } = req.params;
        
        if (!password || !passwordConfirm) {
            return next(new AppError('Please provide password and password confirmation', 400));
        }
        
        if (password !== passwordConfirm) {
            return next(new AppError('Passwords do not match', 400));
        }
        
        // Hash the token from the URL to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
        
        // Find user with valid token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return next(new AppError('Token is invalid or has expired', 400));
        }
        
        // Update password and clear reset fields
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        
        // Log the user in
        createSendToken(user, 200, res);
    } catch (error) {
        next(new AppError(error.message || 'Error resetting password', error.statusCode || 500));
    }
};

/**
 * Update user account (name, email)
 */
exports.updateMe = async (req, res, next) => {
    try {
        // Prevent password updates here (use updatePassword for that)
        if (req.body.password || req.body.passwordConfirm) {
            return next(new AppError('This route is not for password updates. Please use /update-password', 400));
        }
        
        // Filter out unwanted fields that should not be updated
        const filteredBody = {};
        const allowedFields = ['name', 'email'];
        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) filteredBody[key] = req.body[key];
        });
        
        // Update user document
        const updatedUser = await User.findByIdAndUpdate(req.user, filteredBody, {
            new: true,
            runValidators: true
        });
        
        res.status(200).json({
            status: 'success',
            data: { user: updatedUser }
        });
    } catch (error) {
        next(new AppError(error.message || 'Error updating user', error.statusCode || 500));
    }
};

/**
 * Deactivate user account (soft delete)
 */
exports.deleteMe = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user, { active: false });
        
        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(new AppError(error.message || 'Error deactivating account', error.statusCode || 500));
    }
};

/**
 * Super-admin only: Get all admin users
 */
exports.getAllAdmins = async (req, res, next) => {
    try {
        const admins = await User.find({ 
            role: { $in: ['admin', 'super-admin'] },
            active: true
        }).select('-__v');
        
        res.status(200).json({
            status: 'success',
            results: admins.length,
            data: { admins }
        });
    } catch (error) {
        next(new AppError(error.message || 'Error fetching admin users', error.statusCode || 500));
    }
}; 