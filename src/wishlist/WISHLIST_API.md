# Wishlist & Cart API Documentation

## Base URL
All endpoints are prefixed with `/wishlist`

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header.

---

## Wishlist Endpoints

### 1. Get User's Wishlist
```http
GET /wishlist
```

**Description**: Retrieves the authenticated user's wishlist with populated course data.

**Response**:
```json
{
  "_id": "string",
  "user": "string",
  "courses": [
    {
      "_id": "string",
      "title": "string",
      "description": "string",
      "slug": "string",
      "price": 99.99,
      "thumbnail": "string",
      "instructor": {...},
      "rating": 4.5,
      "reviewCount": 100,
      "totalEnrollments": 500,
      ...
    }
  ],
  "createdAt": "2026-01-04T00:00:00.000Z",
  "updatedAt": "2026-01-04T00:00:00.000Z"
}
```

### 2. Add Course to Wishlist
```http
POST /wishlist/:courseId
```

**Parameters**:
- `courseId` (path) - The ID of the course to add

**Response**: Same as Get Wishlist (updated wishlist)

### 3. Remove Course from Wishlist
```http
DELETE /wishlist/:courseId
```

**Parameters**:
- `courseId` (path) - The ID of the course to remove

**Response**: Same as Get Wishlist (updated wishlist)

### 4. Bulk Remove from Wishlist
```http
POST /wishlist/bulk-remove
```

**Body**:
```json
{
  "courseIds": ["courseId1", "courseId2", "courseId3"]
}
```

**Response**: Same as Get Wishlist (updated wishlist)

### 5. Check if Course is in Wishlist
```http
GET /wishlist/check/:courseId
```

**Parameters**:
- `courseId` (path) - The ID of the course to check

**Response**:
```json
{
  "inWishlist": true
}
```

---

## Cart Endpoints

### 1. Get User's Cart
```http
GET /wishlist/cart
```

**Description**: Retrieves the authenticated user's cart with populated item data.

**Response**:
```json
{
  "_id": "string",
  "user": "string",
  "items": [
    {
      "itemId": "string",
      "itemType": "Course",
      "price": 99.99,
      "quantity": 1,
      "course": {...} // Populated course data
    }
  ],
  "totalAmount": 99.99,
  "discount": 10.00,
  "appliedCoupon": {...},
  "createdAt": "2026-01-04T00:00:00.000Z",
  "updatedAt": "2026-01-04T00:00:00.000Z"
}
```

### 2. Get Cart Item Count
```http
GET /wishlist/cart/count
```

**Description**: Returns the total number of items in the cart (sum of quantities).

**Response**:
```json
{
  "count": 5
}
```

### 3. Add Item to Cart
```http
POST /wishlist/cart
```

**Body**:
```json
{
  "courseId": "string",      // Required if adding a course
  "productId": "string",     // Required if adding a product
  "itemId": "string",        // Legacy support
  "itemType": "course",      // "course" or "product"
  "price": 99.99,            // Optional, will fetch if not provided
  "quantity": 1              // Optional, defaults to 1
}
```

**Response**: Same as Get Cart (updated cart)

**Notes**:
- Either `courseId`, `productId`, or `itemId` must be provided
- If `price` is not provided, it will be fetched from the course/product
- `itemType` defaults to "Course" if `courseId` is provided, "Product" if `productId` is provided

### 4. Remove Item from Cart
```http
DELETE /wishlist/cart/:itemId
```

**Parameters**:
- `itemId` (path) - The ID of the item to remove

**Response**: Same as Get Cart (updated cart)

### 5. Update Cart Item Quantity
```http
PATCH /wishlist/cart/:itemId
```

**Parameters**:
- `itemId` (path) - The ID of the item to update

**Body**:
```json
{
  "quantity": 2
}
```

**Response**: Same as Get Cart (updated cart)

**Notes**:
- Quantity must be at least 1
- Returns 404 if cart or item not found

### 6. Clear Cart
```http
DELETE /wishlist/cart
```

**Description**: Removes all items from the cart.

**Response**:
```json
{
  "message": "Cart cleared successfully"
}
```

### 7. Apply Coupon
```http
POST /wishlist/cart/coupon
```

**Body**:
```json
{
  "code": "SUMMER2026"
}
```

**Response**: Same as Get Cart (updated cart with applied discount)

**Error Responses**:
- 400 - Invalid coupon code
- 400 - Coupon expired or not yet active
- 400 - Minimum purchase amount not met
- 400 - Coupon usage limit exceeded

### 8. Remove Coupon
```http
DELETE /wishlist/cart/coupon
```

**Description**: Removes the applied coupon from the cart.

**Response**: Same as Get Cart (updated cart without discount)

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

**Error Response Format**:
```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

---

## Common Use Cases

### Adding a Course to Wishlist then Moving to Cart

1. Add to wishlist:
```javascript
POST /wishlist/64f5b3c7e4b0a123456789ab
```

2. Later, move to cart:
```javascript
// Add to cart
POST /wishlist/cart
{
  "courseId": "64f5b3c7e4b0a123456789ab",
  "itemType": "course"
}

// Remove from wishlist
DELETE /wishlist/64f5b3c7e4b0a123456789ab
```

### Bulk Operations

Remove multiple courses from wishlist:
```javascript
POST /wishlist/bulk-remove
{
  "courseIds": [
    "64f5b3c7e4b0a123456789ab",
    "64f5b3c7e4b0a123456789ac",
    "64f5b3c7e4b0a123456789ad"
  ]
}
```

### Applying a Discount

1. Add items to cart
2. Apply coupon:
```javascript
POST /wishlist/cart/coupon
{
  "code": "NEWYEAR2026"
}
```

3. Cart total will be automatically recalculated with discount

---

## Frontend Service Integration

### Wishlist Service Usage

```typescript
import { wishlistService } from '@/services/wishlist.service';

// Get wishlist
const wishlist = await wishlistService.getWishlist();

// Add to wishlist
await wishlistService.addToWishlist(courseId);

// Remove from wishlist
await wishlistService.removeFromWishlist(courseId);

// Bulk remove
await wishlistService.bulkRemoveFromWishlist([courseId1, courseId2]);

// Check wishlist
const { inWishlist } = await wishlistService.checkWishlist(courseId);
```

### useWishlist Hook Usage

```typescript
import { useWishlist } from '@/hooks/useWishlist';

function MyComponent() {
  const {
    courses,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    bulkRemoveFromWishlist,
    isInWishlist,
  } = useWishlist();

  // Component logic here
}
```

---

## Notes

- All prices are in USD by default
- Cart totals are automatically recalculated when items are added/removed
- Coupons are validated on application and removal
- Wishlist courses are automatically populated with full course data
- Cart items are automatically populated with course/product data

---

**Version**: 1.0.0  
**Last Updated**: January 4, 2026

