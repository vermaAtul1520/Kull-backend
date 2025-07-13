const { cleanupFiles } = require('./upload');

// Custom error class for application errors
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    let message;
    switch (field) {
        case 'email':
            message = 'Email address is already registered. Please use a different email or try logging in.';
            break;
        case 'phone':
            message = 'Phone number is already registered. Please use a different phone number.';
            break;
        case 'name':
            message = 'Community name already exists. Please choose a different name.';
            break;
        case 'joinKey':
            message = 'Join key conflict. Please try again.';
            break;
        default:
            message = `${field} '${value}' already exists. Please use a different value.`;
    }

    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data: ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired. Please log in again.', 401);

const handleMulterError = (err) => {
    switch (err.code) {
        case 'LIMIT_FILE_SIZE':
            return new AppError(
                'File size too large. Maximum allowed size is 5MB for documents and images, 50MB for videos.',
                400
            );
        case 'LIMIT_FILE_COUNT':
            return new AppError('Too many files. Please reduce the number of files.', 400);
        case 'LIMIT_UNEXPECTED_FILE':
            return new AppError('Unexpected file field. Please check your form configuration.', 400);
        case 'LIMIT_PART_COUNT':
            return new AppError('Too many form fields.', 400);
        case 'LIMIT_FIELD_KEY':
            return new AppError('Field name too long.', 400);
        case 'LIMIT_FIELD_VALUE':
            return new AppError('Field value too long.', 400);
        case 'LIMIT_FIELD_COUNT':
            return new AppError('Too many fields.', 400);
        default:
            return new AppError(`File upload error: ${err.message}`, 400);
    }
};

const handleRateLimitError = () =>
    new AppError('Too many requests from this IP. Please try again later.', 429);

const handleTimeoutError = () =>
    new AppError('Request timeout. Please try again.', 408);

const handleMongoNetworkError = () =>
    new AppError('Database connection error. Please try again later.', 503);

// Send error response in development
const sendErrorDev = (err, req, res) => {
    // Log error for debugging
    console.error('ERROR 💥:', err);

    // Clean up uploaded files if any error occurs
    if (req.files || req.file) {
        cleanupFiles(req.files || req.file);
    }

    res.status(err.statusCode).json({
        success: false,
        error: err.message,
        message: err.message,
        stack: err.stack,
        details: {
            name: err.name,
            statusCode: err.statusCode,
            isOperational: err.isOperational,
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
        }
    });
};

// Send error response in production
const sendErrorProd = (err, req, res) => {
    // Clean up uploaded files if any error occurs
    if (req.files || req.file) {
        cleanupFiles(req.files || req.file);
    }

    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            error: err.message,
            timestamp: new Date().toISOString()
        });
    } else {
        // Programming or other unknown error: don't leak error details
        console.error('ERROR 💥:', err);

        res.status(500).json({
            success: false,
            message: 'Something went wrong on our end. Please try again later.',
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;

    // Log error for monitoring (in production, this might go to a logging service)
    if (process.env.NODE_ENV === 'production') {
        console.error('Error:', {
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            userId: req.user?.id || 'anonymous'
        });
    }

    // Handle specific error types
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (err.name === 'MulterError') error = handleMulterError(error);
    if (err.message && err.message.includes('Rate limit')) error = handleRateLimitError();
    if (err.name === 'TimeoutError') error = handleTimeoutError();
    if (err.name === 'MongoNetworkError') error = handleMongoNetworkError();

    // Handle SendGrid email errors
    if (err.code && err.code >= 400 && err.code < 500 && err.response) {
        error = new AppError('Email service error. Please try again later.', 503);
    }

    // Handle Express validation errors
    if (err.array && typeof err.array === 'function') {
        const validationErrors = err.array();
        const message = validationErrors.map(error => error.msg).join('. ');
        error = new AppError(`Validation failed: ${message}`, 400);
    }

    // Handle file upload errors that aren't MulterError
    if (err.message && err.message.includes('Invalid file type')) {
        error = new AppError(err.message, 400);
    }

    // Handle MongoDB duplicate key error with more specific messages
    if (err.code === 11000 && err.keyPattern) {
        const field = Object.keys(err.keyPattern)[0];
        let message = `${field} already exists`;

        if (field === 'email') {
            message = 'An account with this email already exists';
        } else if (field === 'phone') {
            message = 'An account with this phone number already exists';
        } else if (field === 'name') {
            message = 'A community with this name already exists';
        }

        error = new AppError(message, 400);
    }

    // Send error response based on environment
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(error, req, res);
    } else {
        sendErrorProd(error, req, res);
    }
};

// Async error catcher wrapper
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
    const err = new AppError(`Route ${req.originalUrl} not found on this server`, 404);
    next(err);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('UNHANDLED PROMISE REJECTION! 💥 Shutting down...');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Close server gracefully
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Exit immediately
    process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    process.exit(0);
});

module.exports = {
    errorHandler,
    AppError,
    catchAsync,
    notFound
};