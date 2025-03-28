# API Testing Guide for Frontend Developers

This guide provides comprehensive instructions for testing the Coupon Management API and integrating it with your frontend application.

## Table of Contents

- [Setting Up Your Testing Environment](#setting-up-your-testing-environment)
- [Authentication](#authentication)
- [Store Endpoints](#store-endpoints)
- [Coupon Endpoints](#coupon-endpoints)
- [Category Endpoints](#category-endpoints)
- [File Upload](#file-upload)
- [Common Error Responses](#common-error-responses)
- [Integration with Frontend](#integration-with-frontend)
- [Testing Tips](#testing-tips)

## Setting Up Your Testing Environment

### Tools Required

- [Postman](https://www.postman.com/downloads/) or [Insomnia](https://insomnia.rest/download)
- Modern web browser with developer tools

### Initial Setup

1. **Environment Configuration**:

   - Create a new environment in Postman/Insomnia
   - Set base URL variable: `baseUrl = http://localhost:5000/api` (or your production URL)

2. **Headers Configuration**:
   - Create a preset with the header: `Content-Type: application/json`
   - For authenticated requests, add: `Authorization: Bearer {{authToken}}`

## Authentication

### Admin Login

```
POST {{baseUrl}}/auth/login
```

**Request Body**:

```json
{
  "email": "admin@example.com",
  "password": "Admin@12345"
}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "615f8a8e7b12c820b8164f7c",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "createdAt": "2023-01-15T10:30:00.000Z"
    }
  }
}
```

**Notes**:

- Save the token as environment variable `authToken` for use in authenticated requests
- The token expires after 7 days by default

### Register New Admin (Super-admin only)

```
POST {{baseUrl}}/auth/register
```

**Request Headers**:

```
Authorization: Bearer {{authToken}}
```

**Request Body**:

```json
{
  "name": "New Admin",
  "email": "newadmin@example.com",
  "password": "SecurePassword123!",
  "passwordConfirm": "SecurePassword123!",
  "role": "admin"
}
```

**Response (201 Created)**:

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "615f8a8e7b12c820b8164f7d",
      "name": "New Admin",
      "email": "newadmin@example.com",
      "role": "admin",
      "createdAt": "2023-06-15T14:30:00.000Z"
    }
  }
}
```

### Get Current User Profile

```
GET {{baseUrl}}/auth/me
```

**Request Headers**:

```
Authorization: Bearer {{authToken}}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "615f8a8e7b12c820b8164f7c",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "createdAt": "2023-01-15T10:30:00.000Z",
      "lastLogin": "2023-06-20T08:15:00.000Z"
    }
  }
}
```

### Update Password

```
PATCH {{baseUrl}}/auth/update-password
```

**Request Headers**:

```
Authorization: Bearer {{authToken}}
```

**Request Body**:

```json
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass456!",
  "passwordConfirm": "NewSecurePass456!"
}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "615f8a8e7b12c820b8164f7c",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

### Forgot Password

```
POST {{baseUrl}}/auth/forgot-password
```

**Request Body**:

```json
{
  "email": "admin@example.com"
}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "message": "Token sent to email"
}
```

### Reset Password

```
PATCH {{baseUrl}}/auth/reset-password/:token
```

**Request Body**:

```json
{
  "password": "NewSecurePass789!",
  "passwordConfirm": "NewSecurePass789!"
}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "615f8a8e7b12c820b8164f7c",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

### Update User Profile

```
PATCH {{baseUrl}}/auth/update-me
```

**Request Headers**:

```
Authorization: Bearer {{authToken}}
```

**Request Body**:

```json
{
  "name": "Updated Admin Name",
  "email": "updated_email@example.com"
}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "615f8a8e7b12c820b8164f7c",
      "name": "Updated Admin Name",
      "email": "updated_email@example.com",
      "role": "admin"
    }
  }
}
```

### Get All Admins (Super-admin only)

```
GET {{baseUrl}}/auth/admins
```

**Request Headers**:

```
Authorization: Bearer {{authToken}}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "results": 2,
  "data": {
    "admins": [
      {
        "_id": "615f8a8e7b12c820b8164f7c",
        "name": "Super Admin",
        "email": "superadmin@example.com",
        "role": "super-admin",
        "createdAt": "2023-01-10T10:00:00.000Z"
      },
      {
        "_id": "615f8a8e7b12c820b8164f7d",
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin",
        "createdAt": "2023-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

## Store Endpoints

### 1. List All Stores

```
GET {{baseUrl}}/stores
```

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `language` (optional): Filter by language
- `category` (optional): Filter by category ID
- `isTopStore` (optional): Filter top stores (true/false)
- `isEditorsChoice` (optional): Filter editor's choice (true/false)

**Response (200 OK)**:

```json
{
  "status": "success",
  "totalPages": 5,
  "currentPage": 1,
  "data": [
    {
      "_id": "615f8a8e7b12c820b8164f7d",
      "name": "Amazon",
      "slug": "amazon",
      "directUrl": "https://amazon.com",
      "trackingUrl": "https://amazon.com?ref=couponsite",
      "short_description": "Online shopping platform",
      "image": {
        "url": "https://example.com/images/amazon.jpg",
        "alt": "Amazon logo"
      },
      "categories": [
        {
          "_id": "615f8a8e7b12c820b8164f7e",
          "name": "E-commerce"
        }
      ],
      "isTopStore": true,
      "isEditorsChoice": false
    }
    // More stores...
  ]
}
```

**Frontend Implementation**:

```javascript
async function fetchStores(page = 1, limit = 10) {
  try {
    const response = await fetch(
      `${API_URL}/stores?page=${page}&limit=${limit}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch stores");
    }

    const data = await response.json();

    // Update UI with stores
    displayStores(data.data);

    // Update pagination
    updatePagination(data.currentPage, data.totalPages);
  } catch (error) {
    showErrorMessage(error.message);
  }
}
```

### 2. Search Stores

```
GET {{baseUrl}}/stores/search?query=discount
```

**Query Parameters**:

- `query` (required): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200 OK)**:

```json
{
  "status": "success",
  "totalPages": 2,
  "currentPage": 1,
  "data": [
    {
      "_id": "615f8a8e7b12c820b8164f7f",
      "name": "Discount Store",
      "slug": "discount-store",
      "short_description": "Best discount deals",
      "image": {
        "url": "https://example.com/images/discount.jpg",
        "alt": "Discount Store logo"
      }
    }
    // More stores...
  ]
}
```

### 3. Get Store by Slug

```
GET {{baseUrl}}/stores/slug/amazon
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "data": {
    "_id": "615f8a8e7b12c820b8164f7d",
    "name": "Amazon",
    "slug": "amazon",
    "directUrl": "https://amazon.com",
    "trackingUrl": "https://amazon.com?ref=couponsite",
    "short_description": "Online shopping platform",
    "long_description": "Amazon.com is an American multinational technology company...",
    "image": {
      "url": "https://example.com/images/amazon.jpg",
      "alt": "Amazon logo"
    },
    "categories": [
      {
        "_id": "615f8a8e7b12c820b8164f7e",
        "name": "E-commerce"
      }
    ],
    "seo": {
      "meta_title": "Amazon Coupons & Promo Codes",
      "meta_description": "Save with Amazon coupons and promo codes",
      "meta_keywords": "amazon, coupons, promo codes, deals"
    },
    "language": "English",
    "isTopStore": true,
    "isEditorsChoice": false,
    "heading": "Coupons & Promo Codes",
    "createdAt": "2023-01-15T10:30:00.000Z",
    "updatedAt": "2023-03-20T15:45:00.000Z"
  }
}
```

**Response (404 Not Found)**:

```json
{
  "status": "error",
  "message": "Store not found"
}
```

### 4. Create a Store

```
POST {{baseUrl}}/stores
```

**Request Headers**:

```
Content-Type: application/json
Authorization: Bearer {{authToken}}
```

**Request Body**:

```json
{
  "name": "Nike",
  "directUrl": "https://nike.com",
  "trackingUrl": "https://nike.com?ref=couponsite",
  "short_description": "Athletic shoes and apparel",
  "long_description": "Nike, Inc. is an American multinational corporation...",
  "image": {
    "url": "https://example.com/images/nike.jpg",
    "alt": "Nike logo"
  },
  "categories": ["615f8a8e7b12c820b8164f7e", "615f8a8e7b12c820b8164f8f"],
  "seo": {
    "meta_title": "Nike Coupons & Promo Codes",
    "meta_description": "Save with Nike coupons and promo codes",
    "meta_keywords": "nike, coupons, shoes, sportswear"
  },
  "language": "English",
  "isTopStore": true,
  "isEditorsChoice": false,
  "heading": "Coupons & Promo Codes"
}
```

**Response (201 Created)**:

```json
{
  "status": "success",
  "data": {
    "_id": "615f8a8e7b12c820b8164f80",
    "name": "Nike",
    "slug": "nike",
    "directUrl": "https://nike.com",
    "trackingUrl": "https://nike.com?ref=couponsite",
    "short_description": "Athletic shoes and apparel",
    "long_description": "Nike, Inc. is an American multinational corporation...",
    "image": {
      "url": "https://example.com/images/nike.jpg",
      "alt": "Nike logo"
    },
    "categories": ["615f8a8e7b12c820b8164f7e", "615f8a8e7b12c820b8164f8f"],
    "seo": {
      "meta_title": "Nike Coupons & Promo Codes",
      "meta_description": "Save with Nike coupons and promo codes",
      "meta_keywords": "nike, coupons, shoes, sportswear"
    },
    "language": "English",
    "isTopStore": true,
    "isEditorsChoice": false,
    "heading": "Coupons & Promo Codes",
    "createdAt": "2023-06-10T10:30:00.000Z",
    "updatedAt": "2023-06-10T10:30:00.000Z"
  }
}
```

**Response (400 Bad Request)**:

```json
{
  "status": "error",
  "message": "Store name cannot be empty"
}
```

### 5. Update a Store

```
PUT {{baseUrl}}/stores/615f8a8e7b12c820b8164f80
```

**Request Headers**:

```
Content-Type: application/json
Authorization: Bearer {{authToken}}
```

**Request Body**:

```json
{
  "short_description": "Athletic footwear and apparel",
  "isTopStore": false
}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "data": {
    "_id": "615f8a8e7b12c820b8164f80",
    "name": "Nike",
    "slug": "nike",
    "short_description": "Athletic footwear and apparel",
    "isTopStore": false
    // Other fields unchanged...
  }
}
```

### 6. Delete a Store

```
DELETE {{baseUrl}}/stores/615f8a8e7b12c820b8164f80
```

**Request Headers**:

```
Authorization: Bearer {{authToken}}
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "message": "Store deleted successfully"
}
```

**Response (404 Not Found)**:

```json
{
  "status": "error",
  "message": "Store not found"
}
```

## Coupon Endpoints

### 1. List All Coupons

```
GET {{baseUrl}}/coupons
```

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `store` (optional): Filter by store ID
- `active` (optional): Filter active coupons (true/false)
- `isValid` (optional): Filter valid coupons (true/false)
- `featuredForHome` (optional): Filter featured coupons (true/false)

**Response (200 OK)**:

```json
{
  "status": "success",
  "data": [
    {
      "_id": "615f8a8e7b12c820b8164f81",
      "offerDetails": "20% off on all shoes",
      "code": "SHOES20",
      "active": true,
      "isValid": true,
      "featuredForHome": true,
      "hits": 245,
      "lastAccessed": "2023-05-20T15:30:00.000Z",
      "storeId": "615f8a8e7b12c820b8164f80"
    }
    // More coupons...
  ],
  "metadata": {
    "totalCoupons": 45,
    "currentPage": 1,
    "totalPages": 5
  }
}
```

### 2. Create a Coupon

```
POST {{baseUrl}}/coupons
```

**Request Headers**:

```
Content-Type: application/json
Authorization: Bearer {{authToken}}
```

**Request Body**:

```json
{
  "offerDetails": "15% off sitewide",
  "code": "SAVE15",
  "store": "615f8a8e7b12c820b8164f80",
  "active": true,
  "featuredForHome": true,
  "expirationDate": "2023-12-31T23:59:59.999Z"
}
```

**Response (201 Created)**:

```json
{
  "status": "success",
  "data": {
    "_id": "615f8a8e7b12c820b8164f82",
    "offerDetails": "15% off sitewide",
    "code": "SAVE15",
    "store": "615f8a8e7b12c820b8164f80",
    "active": true,
    "isValid": true,
    "featuredForHome": true,
    "hits": 0,
    "lastAccessed": null,
    "expirationDate": "2023-12-31T23:59:59.999Z",
    "createdAt": "2023-06-10T12:00:00.000Z",
    "updatedAt": "2023-06-10T12:00:00.000Z"
  }
}
```

### 3. Track Coupon Usage

```
POST {{baseUrl}}/coupons/615f8a8e7b12c820b8164f82/track
```

**Response (200 OK)**:

```json
{
  "status": "success",
  "data": {
    "_id": "615f8a8e7b12c820b8164f82",
    "offerDetails": "15% off sitewide",
    "code": "SAVE15",
    "active": true,
    "isValid": true,
    "featuredForHome": true,
    "hits": 1,
    "lastAccessed": "2023-06-10T14:25:10.123Z"
  }
}
```

## Category Endpoints

### 1. List All Categories

```
GET {{baseUrl}}/categories
```

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `active` (optional): Filter active categories (true/false)

**Response (200 OK)**:

```json
{
  "status": "success",
  "data": {
    "categories": [
      {
        "_id": "615f8a8e7b12c820b8164f7e",
        "name": "E-commerce",
        "description": "Online shopping platforms",
        "active": true,
        "order": 1
      },
      {
        "_id": "615f8a8e7b12c820b8164f8f",
        "name": "Fashion",
        "description": "Clothing and accessories",
        "active": true,
        "order": 2
      }
      // More categories...
    ],
    "totalCategories": 15,
    "currentPage": 1,
    "totalPages": 1
  }
}
```

### 2. Create a Category

```
POST {{baseUrl}}/categories
```

**Request Headers**:

```
Content-Type: application/json
Authorization: Bearer {{authToken}}
```

**Request Body**:

```json
{
  "name": "Electronics",
  "description": "Electronic devices and gadgets",
  "icon": "https://example.com/icons/electronics.svg",
  "active": true,
  "order": 3
}
```

**Response (201 Created)**:

```json
{
  "status": "success",
  "data": {
    "_id": "615f8a8e7b12c820b8164f90",
    "name": "Electronics",
    "description": "Electronic devices and gadgets",
    "icon": "https://example.com/icons/electronics.svg",
    "active": true,
    "order": 3,
    "createdAt": "2023-06-10T16:00:00.000Z",
    "updatedAt": "2023-06-10T16:00:00.000Z"
  }
}
```

## File Upload

### Upload an Image

```
POST {{baseUrl}}/upload
```

**Request Headers**:

```
Authorization: Bearer {{authToken}}
Content-Type: multipart/form-data
```

**Form Data**:

- `file`: Image file

**Response (200 OK)**:

```json
{
  "status": "success",
  "data": {
    "url": "https://coupon-app-image.s3.amazonaws.com/stores/nike-1623337200123.jpg",
    "key": "stores/nike-1623337200123.jpg"
  }
}
```

## Common Error Responses

### Validation Error (400 Bad Request)

```json
{
  "status": "error",
  "message": "Invalid input data: Store name cannot be empty. Direct URL must be a valid URL."
}
```

### Authentication Error (401 Unauthorized)

```json
{
  "status": "error",
  "message": "Invalid token. Please log in again."
}
```

### Not Found Error (404 Not Found)

```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### Server Error (500 Internal Server Error)

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

## Integration with Frontend

### Basic Fetch Example

```javascript
// Utility function for API calls
async function apiCall(endpoint, method = "GET", data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem("authToken");

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "API request failed");
    }

    return result;
  } catch (error) {
    console.error("API Error:", error);
    // Display error in UI
    showErrorNotification(error.message);
    throw error;
  }
}
```

### Example: Display Stores with Axios

```javascript
import axios from "axios";

// Create API instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// React component to display stores
function StoreList() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchStores() {
      try {
        setLoading(true);
        const response = await api.get(`/stores?page=${page}&limit=10`);
        setStores(response.data.data);
        setTotalPages(response.data.totalPages);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch stores");
        // Show user-friendly error
        toast.error(
          `Error: ${err.response?.data?.message || "Failed to fetch stores"}`
        );
      } finally {
        setLoading(false);
      }
    }

    fetchStores();
  }, [page]);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="store-list">
      <h2>All Stores</h2>

      <div className="store-grid">
        {stores.map((store) => (
          <StoreCard key={store._id} store={store} />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}

// Store card component
function StoreCard({ store }) {
  return (
    <div className="store-card">
      <img src={store.image.url} alt={store.image.alt} className="store-logo" />
      <h3>{store.name}</h3>
      <p>{store.short_description}</p>
      <Link to={`/stores/${store.slug}`} className="view-store-btn">
        View Coupons
      </Link>
    </div>
  );
}
```

### Example: Create a Coupon Form

```javascript
function CreateCouponForm({ storeId }) {
  const [formData, setFormData] = useState({
    offerDetails: "",
    code: "",
    store: storeId,
    active: true,
    featuredForHome: false,
    expirationDate: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/coupons", formData);

      // Show success message
      toast.success("Coupon created successfully!");

      // Reset form or redirect
      resetForm();
      // or: navigate(`/stores/${storeSlug}`);
    } catch (err) {
      // Show validation errors or other errors
      setError(err.response?.data?.message || "Failed to create coupon");
      toast.error(
        `Error: ${err.response?.data?.message || "Failed to create coupon"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      offerDetails: "",
      code: "",
      store: storeId,
      active: true,
      featuredForHome: false,
      expirationDate: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="coupon-form">
      <h2>Add New Coupon</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="offerDetails">Offer Details</label>
        <input
          type="text"
          id="offerDetails"
          name="offerDetails"
          value={formData.offerDetails}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="code">Coupon Code (optional)</label>
        <input
          type="text"
          id="code"
          name="code"
          value={formData.code}
          onChange={handleChange}
        />
        <small>Leave empty for deals without codes</small>
      </div>

      <div className="form-group">
        <label htmlFor="expirationDate">Expiration Date (optional)</label>
        <input
          type="datetime-local"
          id="expirationDate"
          name="expirationDate"
          value={formData.expirationDate}
          onChange={handleChange}
        />
      </div>

      <div className="form-group checkbox">
        <input
          type="checkbox"
          id="active"
          name="active"
          checked={formData.active}
          onChange={handleChange}
        />
        <label htmlFor="active">Active</label>
      </div>

      <div className="form-group checkbox">
        <input
          type="checkbox"
          id="featuredForHome"
          name="featuredForHome"
          checked={formData.featuredForHome}
          onChange={handleChange}
        />
        <label htmlFor="featuredForHome">Featured for Home Page</label>
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? "Creating..." : "Create Coupon"}
      </button>
    </form>
  );
}
```

## Testing Tips

### Common Issues to Watch For

1. **CORS Issues**:

   - Test API calls directly from your frontend application, not just Postman
   - Check for CORS errors in browser developer tools
   - Ensure your API server allows requests from your frontend origin

2. **Authentication Testing**:

   - Test both authenticated and unauthenticated requests
   - Test with expired tokens to ensure proper handling
   - Verify token refresh functionality if implemented

3. **Data Validation**:

   - Test with invalid data formats (e.g., invalid email, wrong data types)
   - Test with missing required fields
   - Test with values exceeding maximum lengths

4. **Error Handling**:

   - Verify all error responses include a descriptive message
   - Check that appropriate HTTP status codes are used
   - Test error handling in your frontend code

5. **Edge Cases**:
   - Test with empty result sets (e.g., search with no results)
   - Test pagination with various page sizes
   - Test with boundary values (min/max values for limits)

### Testing Checklist

- [ ] All API endpoints return expected data structure
- [ ] Authentication works for protected endpoints
- [ ] Validation errors are handled properly
- [ ] Server errors are handled gracefully
- [ ] Pagination works correctly
- [ ] Search and filtering return expected results
- [ ] POST/PUT requests validate input properly
- [ ] DELETE operations confirm success and update UI accordingly
- [ ] File uploads work and return proper URLs
- [ ] API performance is acceptable under load

By following this guide, frontend developers should be able to comprehensively test the API and integrate it effectively with their applications. For any issues or questions about specific endpoints, refer to the API documentation or contact the backend team.
