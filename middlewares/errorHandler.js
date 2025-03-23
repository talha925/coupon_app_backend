// middleware/errorHandler.js
const { ERROR_MESSAGES } = require('../constants');

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: ERROR_MESSAGES.SERVER_ERROR });
};

module.exports = errorHandler;