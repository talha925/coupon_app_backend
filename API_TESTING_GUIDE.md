# API Testing Guide

A comprehensive guide for testing the Coupon Management API endpoints.

Base URL: `https://coupon-app-backend.vercel.app`

## Security Headers

All endpoints are protected with the following security headers:

```
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: same-origin
```

## Authentication Endpoints

### Login

```http
POST https://coupon-app-backend.vercel.app/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin@12345"
}

Response:
{
  "status": "success",
  "token": "your_jwt_token",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "lastLogin": "2025-05-08T10:00:00.000Z"
    }
  }
}
```

### Register Admin (Super-admin only)

```
POST /api/auth/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "SecurePassword123!",
  "passwordConfirm": "SecurePassword123!"
}
```

### Get Current User

```
GET /api/auth/me
Authorization: Bearer {token}
```

### Password Management

#### Forgot Password

```http
POST https://coupon-app-backend.vercel.app/api/auth/forgot-password
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

#### Reset Password

```http
PATCH https://coupon-app-backend.vercel.app/api/auth/reset-password/:token
Content-Type: application/json

{
  "password": "NewSecurePass456!",
  "passwordConfirm": "NewSecurePass456!"
}
```

#### Update Password

```http
PATCH https://coupon-app-backend.vercel.app/api/auth/update-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass456!",
  "passwordConfirm": "NewSecurePass456!"
}
```

## Store Endpoints

### List Stores with Filtering

```http
GET https://coupon-app-backend.vercel.app/api/stores

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- language: Filter by language (e.g., "English")
- category: Filter by category ID
- isTopStore: Filter top stores (true/false)
- isEditorsChoice: Filter editor's choice stores (true/false)

Response:
{
  "status": "success",
  "data": [...stores],
  "metadata": {
    "totalStores": 100,
    "timestamp": "2025-05-08T10:00:00.000Z"
  }
}
```

### Search Stores

```http
GET https://coupon-app-backend.vercel.app/api/stores/search?query={searchTerm}
```

### Get Store by Slug

```http
GET https://coupon-app-backend.vercel.app/api/stores/slug/{slug}
```

### Get Store by ID

```http
GET https://coupon-app-backend.vercel.app/api/stores/:id
Authorization: Bearer {token}

Response:
{
  "status": "success",
  "data": {
    "_id": "store_id",
    "name": "Store Name",
    "slug": "store-name",
    "trackingUrl": "https://store.com?ref=couponsite",
    "short_description": "Store description",
    "long_description": "Detailed store description",
    "image": {
      "url": "https://example.com/image.jpg",
      "alt": "Store logo"
    },
    "categories": ["categoryId1"],
    "seo": {
      "meta_title": "Store Title",
      "meta_description": "Store description",
      "meta_keywords": "keywords"
    },
    "language": "English",
    "isTopStore": false,
    "isEditorsChoice": false,
    "heading": "Coupons & Promo Codes"
  }
}
```

### Create Store

```http
POST https://coupon-app-backend.vercel.app/api/stores
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Store Name",
  "trackingUrl": "https://store.com?ref=couponsite",
  "short_description": "Store description (max 160 chars)",
  "long_description": "Detailed store description",
  "image": {
    "url": "https://example.com/image.jpg",
    "alt": "Store logo"
  },
  "categories": ["categoryId1"],
  "seo": {
    "meta_title": "Store Title (max 60 chars)",
    "meta_description": "Store description (max 160 chars)",
    "meta_keywords": "keywords (max 200 chars)"
  },
  "language": "English",
  "isTopStore": false,
  "isEditorsChoice": false,
  "heading": "Coupons & Promo Codes"
}
```

Note: The `heading` field only accepts these values:

- "Promo Codes & Coupon"
- "Coupons & Promo Codes"
- "Voucher & Discount Codes"

### Update Store

```
PUT /api/stores/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  // Include fields to update
}
```

### Delete Store

```
DELETE /api/stores/{id}
Authorization: Bearer {token}
```

## Coupon Endpoints

### List Coupons with Filtering

```http
GET https://coupon-app-backend.vercel.app/api/coupons

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 10)
- store: Filter by store ID
- active: Filter active coupons (true/false)
- isValid: Filter valid coupons (true/false, default: true)
- featuredForHome: Filter featured coupons (true/false)

Response:
{
  "status": "success",
  "data": [...coupons],
  "metadata": {
    "totalCoupons": 50,
    "currentPage": 1,
    "totalPages": 5
  }
}
```

### Get Coupon by ID

```http
GET https://coupon-app-backend.vercel.app/api/coupons/:id

Response:
{
  "status": "success",
  "data": {
    "_id": "coupon_id",
    "offerDetails": "Offer description",
    "code": "COUPON123",
    "active": true,
    "isValid": true,
    "store": {
      "_id": "store_id",
      "name": "Store Name",
      "image": {
        "url": "https://example.com/image.jpg",
        "alt": "Store logo"
      },
      "trackingUrl": "https://store.com?ref=couponsite"
    },
    "featuredForHome": false,
    "hits": 0,
    "lastAccessed": "2025-05-08T10:00:00.000Z",
    "expirationDate": "2025-12-31T23:59:59.999Z"
  }
}
```

### Create Coupon

```http
POST https://coupon-app-backend.vercel.app/api/coupons
Authorization: Bearer {token}
Content-Type: application/json

{
  "offerDetails": "Offer description (required)",
  "code": "COUPON123",  // Optional
  "store": "storeId",   // Required, must be valid ObjectId
  "active": true,       // Default: true
  "isValid": true,      // Default: true
  "featuredForHome": false,  // Default: false
  "expirationDate": "2025-12-31T23:59:59.999Z"  // Optional
}
```

Note: Either `code` or `active` must be provided.

### Track Coupon Usage

```http
POST https://coupon-app-backend.vercel.app/api/coupons/:couponId/track
```

This endpoint increments the hit counter and updates lastAccessed timestamp.

### Update Coupon Order

```http
PUT https://coupon-app-backend.vercel.app/api/coupons/store/:storeId/order
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderedCouponIds": [
    "couponId1",
    "couponId2",
    "couponId3"
  ]
}

Response:
{
  "status": "success",
  "data": {
    "message": "Coupon order updated successfully",
    "totalUpdated": 3
  }
}
```

This endpoint updates the display order of coupons for a specific store. The coupons will be ordered according to their position in the `orderedCouponIds` array.

Error Responses:

- 400: Invalid coupon IDs or store ID
- 404: Store not found
- 400: Coupons don't belong to the specified store

## Category Endpoints

### List Categories

```http
GET https://coupon-app-backend.vercel.app/api/categories

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 50)
- active: Filter active categories (true/false)

Response:
{
  "status": "success",
  "data": {
    "categories": [...categories],
    "totalCategories": 20,
    "currentPage": 1,
    "totalPages": 1
  }
}
```

### Get Category by ID

```http
GET https://coupon-app-backend.vercel.app/api/categories/:id

Response:
{
  "status": "success",
  "data": {
    "_id": "category_id",
    "name": "Category Name",
    "description": "Category description",
    "icon": "https://example.com/icon.svg",
    "active": true,
    "order": 0
  }
}
```

### Create Category

```http
POST https://coupon-app-backend.vercel.app/api/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Category Name",  // Required, unique
  "description": "Description (max 200 chars)",  // Optional
  "icon": "https://example.com/icon.svg",  // Optional, must be URL
  "active": true,  // Default: true
  "order": 0      // Default: 0, must be >= 0
}
```

## File Upload

### Upload Image

```http
POST https://coupon-app-backend.vercel.app/api/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form data:
- image: Image file

Response:
{
  "imageUrl": "https://{bucket}.s3.{region}.amazonaws.com/{key}"
}
```

### Delete Image

```http
POST https://coupon-app-backend.vercel.app/api/upload/delete-image
Authorization: Bearer {token}
Content-Type: application/json

{
  "imageUrl": "https://{bucket}.s3.{region}.amazonaws.com/{key}"
}
```

## Common Response Formats

### Success Response

```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description"
}
```

## Common HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

## Error Handling

The API uses consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common validation errors:

- Store name empty or invalid
- Invalid MongoDB ObjectId
- Duplicate category name
- Invalid image URL format
- Missing required fields
- Invalid date format
- Invalid coupon code format

## Rate Limiting

The API implements rate limiting on all `/api` routes. Responses include headers:

```
X-RateLimit-Limit: (requests per window)
X-RateLimit-Remaining: (remaining requests)
X-RateLimit-Reset: (time until reset)
```
