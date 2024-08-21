const express = require('express');
const { registerUser, loginUser, saveCoupon } = require('../controllers/userController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.put('/saveCoupon', saveCoupon);

module.exports = router;
