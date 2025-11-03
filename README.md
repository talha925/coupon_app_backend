# Coupon Management API

A robust RESTful API for managing stores, coupons, and categories built with Node.js, Express, and MongoDB.

## 📋 Overview

This API provides a comprehensive backend solution for coupon and store management systems. It features advanced data validation, error handling, secure authentication, and follows modern best practices for Node.js/MongoDB applications.

## 🚀 Features

- **Complete Store Management**: Create, read, update, and delete stores
- **Coupon Management**: Track coupon usage, validate codes, and manage offers
- **Category Organization**: Organize stores by categories
- **Real-time Notifications**: WebSocket-powered real-time updates for stores and coupons
- **Redis Pub/Sub Integration**: Cross-instance communication for scalable real-time features
- **Secure Authentication**: JWT-based authentication with role management
- **Admin Panel**: Admin-only routes with role-based access control
- **Advanced Searching**: Full-text search across store names and descriptions
- **Pagination & Filtering**: All list endpoints support pagination and filtering
- **Data Validation**: Comprehensive validation for all input data
- **Error Handling**: Detailed and consistent error responses
- **Security**: Protection against common web vulnerabilities
- **Password Management**: Secure password reset and update flows
- **Optimized Database Queries**: Efficient MongoDB queries with proper indexing
- **Performance Monitoring**: Built-in performance tracking and health checks

## 🔧 Technologies

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Joi** - Data validation
- **Helmet** - Security middleware
- **AWS SDK** - File uploads to S3 (for store images)
- **WebSocket (ws)** - Real-time bidirectional communication
- **Redis** - In-memory data store for caching and pub/sub messaging
- **ioredis** - Redis client for Node.js

## 📁 Project Structure

```
├── app.js                # Application entry point
├── config/               # Configuration files
│   ├── db.js             # Database connection
│   └── env.js            # Environment configuration
├── controllers/          # Request handlers
│   ├── storeController.js
│   ├── couponController.js
│   ├── categoryController.js
│   └── authController.js  # Authentication controller
├── lib/                  # Core libraries
│   ├── websocket-server.js # WebSocket server implementation
│   └── redis-client.js   # Redis client configuration
├── models/               # Database models
│   ├── storeModel.js
│   ├── couponModel.js
│   ├── categoryModel.js
│   └── userModel.js      # User model with roles
├── services/             # Business logic
│   ├── storeService.js
│   ├── couponService.js
│   ├── categoryService.js
│   └── cacheService.js   # Redis caching service
├── validators/           # Request validation schemas
│   ├── storeValidator.js
│   ├── couponValidator.js
│   └── categoryValidator.js
├── middlewares/          # Express middlewares
│   ├── errorHandler.js
│   ├── validator.js
│   ├── security.js
│   ├── authMiddleware.js # Authentication middleware
│   └── requestLogger.js
├── errors/               # Custom error classes
│   └── AppError.js
├── utils/                # Utility functions
│   └── couponUtils.js
├── websocket-client-test.js # WebSocket testing client
└── routes/               # API routes
    ├── storeRoutes.js
    ├── couponRoutes.js
    ├── categoryRoutes.js
    ├── authRoutes.js     # Authentication routes
    └── uploadRoutes.js
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint                          | Description                   | Access        |
| ------ | --------------------------------- | ----------------------------- | ------------- |
| POST   | `/api/auth/login`                 | Login with email and password | Public        |
| POST   | `/api/auth/forgot-password`       | Request password reset        | Public        |
| PATCH  | `/api/auth/reset-password/:token` | Reset password with token     | Public        |
| GET    | `/api/auth/me`                    | Get current user profile      | Authenticated |
| PATCH  | `/api/auth/update-me`             | Update user profile           | Authenticated |
| PATCH  | `/api/auth/update-password`       | Update current user password  | Authenticated |
| DELETE | `/api/auth/delete-me`             | Deactivate user account       | Authenticated |
| POST   | `/api/auth/register`              | Register a new admin          | Super-admin   |
| GET    | `/api/auth/admins`                | Get all admin users           | Super-admin   |

### Stores

| Method | Endpoint                 | Description                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| GET    | `/api/stores`            | Get all stores (supports pagination & filtering) |
| GET    | `/api/stores/search`     | Search stores (full-text search)                 |
| GET    | `/api/stores/slug/:slug` | Get store by slug                                |
| POST   | `/api/stores`            | Create a new store                               |
| PUT    | `/api/stores/:id`        | Update a store                                   |
| DELETE | `/api/stores/:id`        | Delete a store                                   |

### Coupons

| Method | Endpoint                       | Description                                       |
| ------ | ------------------------------ | ------------------------------------------------- |
| GET    | `/api/coupons`                 | Get all coupons (supports pagination & filtering) |
| GET    | `/api/coupons/:id`             | Get coupon by ID                                  |
| POST   | `/api/coupons`                 | Create a new coupon                               |
| PUT    | `/api/coupons/:id`             | Update a coupon                                   |
| DELETE | `/api/coupons/:id`             | Delete a coupon                                   |
| POST   | `/api/coupons/:couponId/track` | Track coupon usage                                |

### Categories

| Method | Endpoint              | Description           |
| ------ | --------------------- | --------------------- |
| GET    | `/api/categories`     | Get all categories    |
| GET    | `/api/categories/:id` | Get category by ID    |
| POST   | `/api/categories`     | Create a new category |
| PUT    | `/api/categories/:id` | Update a category     |
| DELETE | `/api/categories/:id` | Delete a category     |

### File Upload

| Method | Endpoint      | Description            |
| ------ | ------------- | ---------------------- |
| POST   | `/api/upload` | Upload files to AWS S3 |

## 🚦 Getting Started

### Prerequisites

- Node.js 14+
- MongoDB 4.4+
- Redis 6.0+ (for caching and real-time features)
- AWS account (for file uploads)

### Installation

1. Clone the repository

   ```
   git clone <repository-url>
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   MONGO_URI=your_mongodb_connection_string
   PORT=5000
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3000
   JWT_SECRET=your_secure_jwt_secret_key
   JWT_EXPIRES_IN=7d
   INIT_ADMIN_EMAIL=admin@example.com
   INIT_ADMIN_PASSWORD=secure_password

   # AWS Configuration (for file uploads)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   AWS_BUCKET_NAME=your_s3_bucket_name

   # Redis Configuration (for caching and pub/sub)
   REDIS_URL=redis://localhost:6379

   # WebSocket Configuration
   WS_ENABLED=true
   WS_PORT=8080
   ```

4. Start the server
   ```
   npm start
   ```

### Development Mode

Run the server with automatic restart on file changes:

```
npm run dev
```

## 👥 Authentication System

The API includes a complete authentication system with the following features:

- **JWT Token-based Authentication**: Secure token generation and validation
- **Role-based Access Control**: User roles include 'user', 'admin', and 'super-admin'
- **Password Security**: Passwords are hashed using bcrypt
- **Password Reset Flow**: Includes token generation and validation for secure password resets
- **Automatic Admin Setup**: Initial super-admin user created on first run
- **Account Management**: Profile updates, password changes, and account deactivation

### Default Super Admin

On first startup, the system creates a super-admin account using the credentials specified in the .env file:

```
Email: admin@example.com
Password: Admin@12345 (change this in production)
```

### Authentication Flow

1. **Login**: POST to `/api/auth/login` with email and password
2. **Using the Token**: Include the JWT token in the Authorization header for protected routes
   ```
   Authorization: Bearer your_jwt_token
   ```
3. **Token Expiry**: Tokens expire after the time specified in JWT_EXPIRES_IN (default: 7 days)

## 📊 Database Indexing

The application uses the following MongoDB indexes for optimal performance:

- Text indexes on store names, slugs, and descriptions for full-text search
- Compound indexes for common query patterns
- Regular indexes for frequently filtered fields

## 🔌 WebSocket Real-time Features

The API includes WebSocket support for real-time notifications and updates.

### WebSocket Server

The WebSocket server runs on a separate port (default: 8080) and provides real-time updates for:

- **Store Updates**: Real-time notifications when stores are created, updated, or deleted
- **Coupon Updates**: Real-time notifications when coupons are created, updated, or deleted
- **Cross-instance Communication**: Redis pub/sub for scalable real-time features

### WebSocket Events

#### Store Events
- `store:created` - Emitted when a new store is created
- `store:updated` - Emitted when a store is updated
- `store:deleted` - Emitted when a store is deleted

#### Coupon Events
- `coupon:created` - Emitted when a new coupon is created
- `coupon:updated` - Emitted when a coupon is updated
- `coupon:deleted` - Emitted when a coupon is deleted

### Client Connection

Connect to the WebSocket server:

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
  
  // Handle different event types
  switch(message.type) {
    case 'store:created':
      console.log('New store created:', message.data);
      break;
    case 'coupon:updated':
      console.log('Coupon updated:', message.data);
      break;
    // ... handle other events
  }
});
```

### Testing WebSocket

Use the included test client to verify WebSocket functionality:

```bash
node websocket-client-test.js
```

This will connect to the WebSocket server and demonstrate real-time notifications by creating, updating, and deleting test stores and coupons.

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Passwords stored as secure hashes
- **Role-based Access**: Different permission levels based on user roles
- **Input Validation**: All user inputs are validated using Joi schemas
- **Data Sanitization**: Protection against NoSQL injection
- **XSS Protection**: Prevention of cross-site scripting attacks
- **Security Headers**: Helmet middleware adds security-related HTTP headers
- **Parameter Pollution Prevention**: Protection against query parameter pollution
- **Rate Limiting**: Basic protection against brute force attacks

## 📚 Best Practices

This project follows several best practices:

- **Service Layer Architecture**: Separation of business logic from controllers
- **Error Handling**: Centralized and consistent error handling
- **Authentication**: Secure JWT-based authentication system
- **Validation**: Request data validation before processing
- **Database Optimization**: Proper indexes and lean queries
- **Environment Configuration**: Secure configuration management
- **Code Organization**: Clear separation of concerns

## 🛠️ Additional Scripts

- `npm test` - Run tests
- `npm run lint` - Run linter

## 📄 License

This project is licensed under the MIT License.
