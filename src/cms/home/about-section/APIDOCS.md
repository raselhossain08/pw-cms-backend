# About Section API Documentation

## Overview

The About Section API provides endpoints for managing the homepage about section content including title, subtitle, description, images, highlights, statistics, and SEO metadata.

**Base URL:** `/api/cms/home/about-section`

**Authentication:** Most endpoints require JWT authentication with Admin or Super Admin role.

**API Version:** 1.0.0

---

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
   - [GET /](#get-about-section)
   - [PUT /](#update-about-section)
   - [PUT /upload](#update-with-upload)
   - [POST /toggle-active](#toggle-active-status)
   - [POST /duplicate](#duplicate-about-section)
   - [GET /export](#export-about-section)
5. [Data Models](#data-models)
6. [Examples](#examples)
7. [Testing](#testing)
8. [Rate Limiting](#rate-limiting)
9. [Changelog](#changelog)

---

## Authentication

### Required Headers

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Obtaining a Token

Authenticate via the `/api/auth/login` endpoint to receive a JWT token.

**Public Endpoints:**
- `GET /` - Does not require authentication

**Protected Endpoints:**
- All `PUT`, `POST`, `DELETE` operations require authentication and Admin/Super Admin role

---

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  },
  "meta": {
    "timestamp": "2025-01-05T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)",
  "statusCode": 400
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 413 | Payload Too Large - File size exceeds limit |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 502 | Bad Gateway - Upstream service error |
| 503 | Service Unavailable - Server overloaded |

### Common Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

#### Authentication Error (401)
```json
{
  "success": false,
  "message": "Authentication required",
  "statusCode": 401
}
```

#### Not Found (404)
```json
{
  "success": false,
  "message": "About section not found. Please create one first.",
  "statusCode": 404
}
```

---

## Endpoints

### GET About Section

Retrieves the homepage about section data.

**Endpoint:** `GET /api/cms/home/about-section`

**Authentication:** None (Public)

**Query Parameters:** None

#### Request Example

```bash
curl -X GET "https://api.example.com/api/cms/home/about-section" \
  -H "Content-Type: application/json"
```

#### Response Example (200 OK)

```json
{
  "success": true,
  "message": "About section retrieved successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "id": "about",
    "title": "Passionate About Flight",
    "subtitle": "Meet Rich Pickett — Pilot, Instructor, and Aviation Innovator",
    "description": "<p>From my very first exploratory flight...</p>",
    "image": "https://res.cloudinary.com/demo/image/upload/v1/about.jpg",
    "highlights": [
      {
        "icon": "🎓",
        "label": "Certified Flight Instructor",
        "text": "Teaching advanced flight operations for 10+ years"
      },
      {
        "icon": "✈️",
        "label": "5000+ Flight Hours",
        "text": "Extensive experience across multiple aircraft types"
      }
    ],
    "stats": [
      {
        "value": 5000,
        "suffix": "+",
        "label": "Hours Flown"
      },
      {
        "value": 300,
        "suffix": "+",
        "label": "Students Trained"
      },
      {
        "value": 15,
        "suffix": "",
        "label": "Years Experience"
      }
    ],
    "cta": {
      "label": "Explore My Courses",
      "link": "/courses"
    },
    "seo": {
      "title": "About Us - Personal Wings Aviation Training",
      "description": "Learn about Rich Pickett's aviation journey...",
      "keywords": "aviation instructor, flight training, pilot education",
      "ogTitle": "About Personal Wings",
      "ogDescription": "Professional aviation training with Rich Pickett",
      "ogImage": "https://res.cloudinary.com/demo/image/upload/v1/og-about.jpg",
      "canonicalUrl": "https://personalwings.com/about"
    },
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-05T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2025-01-05T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

#### Error Responses

**404 Not Found**
```json
{
  "success": false,
  "message": "About section not found. Please create one first.",
  "statusCode": 404
}
```

---

### UPDATE About Section

Updates the about section with new data (without file uploads).

**Endpoint:** `PUT /api/cms/home/about-section`

**Authentication:** Required (Admin/Super Admin)

**Content-Type:** `application/json`

#### Request Body

```json
{
  "title": "Updated Title",
  "subtitle": "Updated Subtitle",
  "description": "<p>Updated description with HTML</p>",
  "highlights": [
    {
      "icon": "🎓",
      "label": "New Highlight",
      "text": "Description of highlight"
    }
  ],
  "stats": [
    {
      "value": 6000,
      "suffix": "+",
      "label": "Hours Flown"
    }
  ],
  "cta": {
    "label": "Learn More",
    "link": "/courses"
  },
  "seo": {
    "title": "About Page Title",
    "description": "Meta description",
    "keywords": "keyword1, keyword2",
    "ogImage": "https://example.com/image.jpg"
  },
  "isActive": true
}
```

#### Request Example

```bash
curl -X PUT "https://api.example.com/api/cms/home/about-section" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "subtitle": "Updated Subtitle"
  }'
```

#### Response Example (200 OK)

```json
{
  "success": true,
  "message": "About section updated successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
    "id": "about",
    "title": "Updated Title",
    "subtitle": "Updated Subtitle",
    // ... rest of the fields
  },
  "meta": {
    "timestamp": "2025-01-05T10:35:00.000Z",
    "updatedFields": ["title", "subtitle"]
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "message": "Update data cannot be empty",
  "statusCode": 400
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Authentication required",
  "statusCode": 401
}
```

**403 Forbidden**
```json
{
  "success": false,
  "message": "Insufficient permissions. Admin role required.",
  "statusCode": 403
}
```

---

### UPDATE with Upload

Updates the about section with media files (images).

**Endpoint:** `PUT /api/cms/home/about-section/upload`

**Authentication:** Required (Admin/Super Admin)

**Content-Type:** `multipart/form-data`

#### Form Data Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| image | File | No | Main image file (JPEG, PNG, WebP, GIF, max 10MB) |
| title | String | Yes | Section title |
| subtitle | String | Yes | Section subtitle |
| description | String | Yes | HTML description |
| highlights[0][icon] | String | No | Highlight icon/emoji |
| highlights[0][label] | String | No | Highlight label |
| highlights[0][text] | String | No | Highlight description |
| stats[0][value] | Number | No | Stat value |
| stats[0][suffix] | String | No | Stat suffix (e.g., "+", "K") |
| stats[0][label] | String | No | Stat label |
| cta[label] | String | No | CTA button label |
| cta[link] | String | No | CTA button link |
| seo[title] | String | No | SEO title |
| seo[description] | String | No | SEO description |
| seo[keywords] | String | No | SEO keywords |
| seo[ogImage] | String | No | Open Graph image URL |
| seo[ogTitle] | String | No | Open Graph title |
| seo[ogDescription] | String | No | Open Graph description |
| seo[canonicalUrl] | String | No | Canonical URL |
| isActive | Boolean | No | Active status |

#### Request Example

```bash
curl -X PUT "https://api.example.com/api/cms/home/about-section/upload" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/image.jpg" \
  -F "title=About Personal Wings" \
  -F "subtitle=Professional Aviation Training" \
  -F "description=<p>About description</p>" \
  -F "highlights[0][icon]=🎓" \
  -F "highlights[0][label]=Certified Instructor" \
  -F "highlights[0][text]=10+ years experience" \
  -F "stats[0][value]=5000" \
  -F "stats[0][suffix]=+" \
  -F "stats[0][label]=Hours Flown" \
  -F "cta[label]=Learn More" \
  -F "cta[link]=/courses" \
  -F "isActive=true"
```

#### Response Example (200 OK)

```json
{
  "success": true,
  "message": "About section updated successfully with media upload",
  "data": {
    "id": "about",
    "title": "About Personal Wings",
    "image": "https://res.cloudinary.com/demo/image/upload/v1/about-new.jpg",
    // ... rest of the fields
  },
  "meta": {
    "timestamp": "2025-01-05T10:40:00.000Z",
    "imageUploaded": true,
    "highlightsCount": 1,
    "statsCount": 1
  }
}
```

#### Error Responses

**400 Bad Request - Invalid File**
```json
{
  "success": false,
  "message": "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed",
  "statusCode": 400
}
```

**413 Payload Too Large**
```json
{
  "success": false,
  "message": "File size exceeds 10MB limit",
  "statusCode": 413
}
```

---

### POST Toggle Active Status

Toggles the active/inactive status of the about section.

**Endpoint:** `POST /api/cms/home/about-section/toggle-active`

**Authentication:** Required (Admin/Super Admin)

#### Request Example

```bash
curl -X POST "https://api.example.com/api/cms/home/about-section/toggle-active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example (200 OK)

```json
{
  "success": true,
  "message": "About section activated successfully",
  "data": {
    "id": "about",
    "isActive": true,
    // ... rest of the fields
  },
  "meta": {
    "timestamp": "2025-01-05T10:45:00.000Z",
    "newStatus": true
  }
}
```

---

### POST Duplicate About Section

Creates a copy of the current about section with a new ID.

**Endpoint:** `POST /api/cms/home/about-section/duplicate`

**Authentication:** Required (Admin/Super Admin)

#### Request Example

```bash
curl -X POST "https://api.example.com/api/cms/home/about-section/duplicate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Response Example (201 Created)

```json
{
  "success": true,
  "message": "About section duplicated successfully",
  "data": {
    "id": "about-1704453600000",
    "title": "About Personal Wings (Copy)",
    "isActive": false,
    // ... rest of the fields
  },
  "meta": {
    "timestamp": "2025-01-05T10:50:00.000Z",
    "originalId": "about",
    "newId": "about-1704453600000"
  }
}
```

---

### GET Export About Section

Exports the about section data in JSON or PDF format.

**Endpoint:** `GET /api/cms/home/about-section/export`

**Authentication:** Required (Admin/Super Admin)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | String | Yes | Export format: `json` or `pdf` |

#### Request Example

```bash
# JSON Export
curl -X GET "https://api.example.com/api/cms/home/about-section/export?format=json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o about-section-export.json

# PDF Export
curl -X GET "https://api.example.com/api/cms/home/about-section/export?format=pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o about-section-export.pdf
```

#### Response Headers

```
Content-Type: application/json (or application/pdf)
Content-Disposition: attachment; filename="about-section_2025-01-05.json"
X-Export-Timestamp: 2025-01-05T10:55:00.000Z
```

---

## Data Models

### AboutSection Schema

```typescript
interface AboutSection {
  _id?: string;
  id: string;
  title: string;
  subtitle: string;
  description: string; // HTML content
  image: string; // URL
  highlights: Highlight[];
  stats: Stat[];
  cta: CTA;
  seo: SeoMeta;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Highlight {
  icon: string;
  label: string;
  text: string;
}

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

interface CTA {
  label: string;
  link: string;
}

interface SeoMeta {
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
}
```

---

## Examples

### Example 1: Fetch and Display About Section

```typescript
// Frontend TypeScript Example
import axios from 'axios';

async function fetchAboutSection() {
  try {
    const response = await axios.get('/api/cms/home/about-section');
    const aboutData = response.data.data;
    
    console.log('Title:', aboutData.title);
    console.log('Highlights:', aboutData.highlights);
    
    return aboutData;
  } catch (error) {
    console.error('Error fetching about section:', error);
    throw error;
  }
}
```

### Example 2: Update About Section

```typescript
async function updateAboutSection(updates: Partial<AboutSection>) {
  try {
    const response = await axios.put(
      '/api/cms/home/about-section',
      updates,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Handle authentication error
      console.error('Authentication required');
    }
    throw error;
  }
}
```

### Example 3: Upload with Image

```typescript
async function uploadWithImage(file: File, data: any) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('title', data.title);
  formData.append('subtitle', data.subtitle);
  // ... append other fields
  
  try {
    const response = await axios.put(
      '/api/cms/home/about-section/upload',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload Progress: ${percentCompleted}%`);
        }
      }
    );
    
    return response.data.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
```

---

## Testing

### Postman Collection

Import the Postman collection for easy testing:

**Collection JSON:** Available at `/api/cms/home/about-section/postman-collection.json`

### Test with cURL

```bash
# 1. Login to get token
TOKEN=$(curl -X POST "https://api.example.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.data.token')

# 2. Fetch about section
curl -X GET "https://api.example.com/api/cms/home/about-section" \
  -H "Authorization: Bearer $TOKEN"

# 3. Update about section
curl -X PUT "https://api.example.com/api/cms/home/about-section" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Title"}'
```

---

## Rate Limiting

**Rate Limit:** 100 requests per 15 minutes per IP address

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

**429 Response:**
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "statusCode": 429,
  "retryAfter": 900
}
```

---

## Changelog

### Version 1.0.0 (2025-01-05)
- Initial API release
- GET, PUT, POST endpoints
- Image upload support
- Export functionality
- Comprehensive error handling
- Performance monitoring
- Caching implementation

---

## Support

**Email:** support@personalwings.com  
**Documentation:** https://docs.personalwings.com  
**Status Page:** https://status.personalwings.com

---

**Last Updated:** January 5, 2025  
**API Version:** 1.0.0

