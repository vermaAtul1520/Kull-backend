# KULL Platform API Documentation

**Version:** 2.1  
**Updated:** October 21, 2025  
**Base URL:** `http://localhost:5000/api`

---

## Table of Contents
- [Authentication](#authentication)
- [Users](#users)
- [Communities](#communities)
- [Appeals](#appeals)
- [News](#news)
- [Posts](#posts)
- [Other APIs](#other-apis)
- [Query Parser](#query-parser-guide)

---

## Authentication

### Login
**POST** `/api/auth/login`

```json
// Request
{
  "emailOrPhone": "user@example.com",
  "password": "yourpassword"
}

// Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "firstName": "John",
    "role": "user",
    "community": "..."
  }
}
```

**All subsequent requests require:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Users

### 1. Get Pending Users
**GET** `/api/users/pending`  
**Auth:** SuperAdmin only

Returns all users with `communityStatus: "pending"`

```json
{
  "success": true,
  "count": 5,
  "users": [...]
}
```

---

### 2. City Search
**GET** `/api/users/city-search?query=delhi`  
**Auth:** User (must have community)

Search users by address or pincode within same community.

**Query Params:**
- `query` (required) - Search term

```json
{
  "success": true,
  "count": 3,
  "users": [
    {
      "firstName": "Rajesh",
      "address": "New Delhi",
      "pinCode": "110001",
      "phone": "9876543210"
    }
  ]
}
```

---

### 3. Family Tree Search
**GET** `/api/users/family-tree/search?q=rajesh&gotra=Kashyap&limit=50`  
**Auth:** User

Search family members by name, email, phone, code, or gotra number.

**Query Params:**
- `q` (required) - Search term
- `communityId` - Filter by community (defaults to user's)
- `gotra` - Filter by gotra
- `subGotra` - Filter by sub-gotra  
- `limit` - Max results (default: 50)

**Searches in:**
- First name, Last name
- Email, Phone
- User code, cGotNo

```json
{
  "success": true,
  "count": 2,
  "results": [
    {
      "firstName": "Rajesh",
      "lastName": "Kumar",
      "email": "rajesh@example.com",
      "phone": "9876543210",
      "code": "RK98765423",
      "gotra": "Kashyap",
      "occupation": "Engineer"
    }
  ]
}
```

---

### 4. Update Own Profile
**PUT** `/api/users/profile`  
**Auth:** User

```json
// Request
{
  "firstName": "John",
  "occupation": "Engineer",
  "address": "New Delhi",
  "gotra": "Kashyap"
}

// Allowed fields:
// firstName, lastName, email, phone, gender, occupation
// profileImage, religion, motherTongue, interests
// cast, fatherName, address, pinCode, alternativePhone
// maritalStatus, gotra, subGotra
```

---

### 5. Update User (Admin)
**PUT** `/api/users/:userId`  
**Auth:** SuperAdmin or Community Admin

```json
// Community Admin can update:
{
  "communityStatus": "approved",
  "roleInCommunity": "moderator",
  "status": true
}

// SuperAdmin can update any field
```

---

### 6. Assign Community
**PUT** `/api/users/:userId/assignCommunity`  
**Auth:** SuperAdmin or Community Admin

```json
{
  "communityId": "67123..."
}
```

---

### 7. Delete User
**DELETE** `/api/users/:userId`  
**Auth:** SuperAdmin or Community Admin (own community only)

---

## Communities

### 1. Create Community
**POST** `/api/communities/create`

```json
{
  "name": "New Community",
  "description": "Description",
  "createdBy": "USER_ID"
}
```

---

### 2. List Communities
**GET** `/api/communities?filter[name]=Test&sort=-createdAt&limit=20`  
**Auth:** SuperAdmin only

**Filter Fields:** name, _id, code, createdBy, createdAt  
**Sort Fields:** name, code, createdAt  
**Max Limit:** 50

```json
{
  "success": true,
  "total": 45,
  "page": 1,
  "limit": 20,
  "count": 20,
  "data": [...]
}
```

---

### 3. Get Community by ID
**GET** `/api/communities/:id`  
**Auth:** SuperAdmin only

---

### 4. Update Community
**PUT** `/api/communities/:id`  
**Auth:** SuperAdmin only

---

### 5. Delete Community
**DELETE** `/api/communities/:id`  
**Auth:** SuperAdmin only

---

### 6. Get Community Users ⭐ (With Passwords for Admins)
**GET** `/api/communities/:communityId/users`  
**Auth:** Authenticated

**Special Feature:** Admins see plaintext passwords!

**Query Params (queryParser):**
- `filter[gender]=male`
- `filter[roleInCommunity]=member`
- `filter[communityStatus]=approved`
- `sort=firstName` or `sort=-createdAt`
- `limit=50` (max: 50)
- `page=1`
- `projection=firstName,email,password`

**Filter Fields:**
firstName, email, role, roleInCommunity, status, positionInCommunity, cast, cGotNo, gotra, subGotra, gender, communityStatus

**Sort Fields:**
firstName, email, createdAt

**Project Fields:**
firstName, lastName, email, phone, role, roleInCommunity, status, positionInCommunity, cast, cGotNo, gotra, subGotra, gender, communityStatus, address, occupation, religion, motherTongue, fatherName, pinCode, alternativePhone, maritalStatus, profileImage, createdAt, updatedAt, **plainTextPassword**

**Admin Response (includes password):**
```json
{
  "success": true,
  "total": 150,
  "page": 1,
  "limit": 50,
  "count": 50,
  "data": [
    {
      "_id": "...",
      "firstName": "John",
      "email": "john@example.com",
      "password": "UserPassword123",  // 👈 Only admins see this!
      "gender": "male",
      "roleInCommunity": "member"
    }
  ]
}
```

**Regular User Response (no password):**
```json
{
  "data": [
    {
      "_id": "...",
      "firstName": "John",
      "email": "john@example.com"
      // No password field
    }
  ]
}
```

**Access Control:**
- SuperAdmin → Sees all users' passwords
- Community Admin → Sees their community users' passwords
- Regular User → No password visibility

---

### 7. Add User to Community ⭐ (With Password)
**POST** `/api/communities/:communityId/users`  
**Auth:** SuperAdmin or Community Admin

```json
// Request
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePassword123",  // ⭐ Required!
  "gender": "male",
  "occupation": "Engineer",
  "cGotNo": "GT001",
  "gotra": "Kashyap",
  "subGotra": "Branch1",
  "roleInCommunity": "member",
  "address": "New Delhi",
  "pinCode": "110001"
}

// Required: firstName, lastName, password, (email OR phone)
// Optional: All other user fields

// Response
{
  "success": true,
  "message": "User created successfully. Welcome email sent with login credentials.",
  "user": {
    "_id": "...",
    "firstName": "John",
    "code": "JD98765423",
    "community": "..."
  },
  "credentials": {
    "loginIdentifier": "john@example.com",
    "password": "SecurePassword123"  // 👈 Returned for admin reference
  }
}
```

**What Happens:**
1. Password hashed with bcrypt (for login)
2. Password stored as plainTextPassword (for admin viewing)
3. User added to community
4. **Welcome email sent WITH password**
5. Password returned in response

---

### 8. Get Community Officers
**GET** `/api/communities/:communityId/users/orgofficers`

Returns users with `positionInCommunity` set.

---

### 9. Get Gotra/Sub-Gotra
**GET** `/api/communities/:communityId/gotraDetail`

```json
{
  "success": true,
  "data": {
    "gotra": [
      {
        "name": "Kashyap",
        "subGotra": ["Branch1", "Branch2"]
      }
    ]
  }
}
```

---

### 10. Community Configuration

**Create/Update:**  
**POST** `/api/communities/:communityId/configuration`  
**Auth:** SuperAdmin or Community Admin

```json
{
  "banner": ["url1", "url2"],
  "addPopup": "popup_url",
  "smaajKeTaaj": [...],
  "gotra": [...],
  "drorOption": {
    "education": true,
    "kartavya": true,
    "dukan": false
  }
}
```

**Get Configuration:**  
**GET** `/api/communities/:communityId/configuration`

**Delete Configuration:**  
**DELETE** `/api/communities/:communityId/configuration`

---

### 11. Bhajans (Community Songs)

**Create:**  
**POST** `/api/communities/:communityId/bhajans`  
**Auth:** SuperAdmin or Community Admin

```json
{
  "title": "Bhajan Title",
  "artist": "Artist Name",
  "category": "devotional",
  "youtubeUrl": "https://youtube.com/watch?v=...",
  "description": "..."
}
```

**List:**  
**GET** `/api/communities/:communityId/bhajans?filter[category]=devotional&sort=-views`

**Filter:** title, artist, category  
**Sort:** title, artist, views, createdAt

**Get Single:**  
**GET** `/api/communities/bhajans/:id`

**Update:**  
**PUT** `/api/communities/bhajans/:id`

**Delete:**  
**DELETE** `/api/communities/bhajans/:id`

**Get YouTube Info:**  
**GET** `/api/communities/video-info?url=YOUTUBE_URL`

---

## Appeals

### 1. Create Appeal ⭐ (Any User Can Submit!)
**POST** `/api/appeals`  
**Auth:** Any user with community

```json
// Request
{
  "subject": "Community Hall Maintenance",
  "description": "The ceiling fan needs repair",
  "category": "maintenance",
  "priority": "medium"
}

// Auto-filled:
// - user: Current user ID
// - community: User's community ID
// - status: "pending"

// Response
{
  "success": true,
  "message": "Appeal submitted successfully",
  "data": {
    "_id": "...",
    "subject": "Community Hall Maintenance",
    "status": "pending",
    "user": "...",
    "community": "..."
  }
}
```

---

### 2. List Appeals (Role-Based Filtering)
**GET** `/api/appeals?filter[status]=pending&sort=-createdAt&limit=50`

**Query Params:**
- `filter[status]` - pending, in-progress, resolved
- `filter[priority]` - low, medium, high, urgent
- `filter[category]` - maintenance, complaint, suggestion
- `sort=-createdAt` - Sort by newest first
- `limit=50` - Results per page

**Access Control:**
- **SuperAdmin**: Sees ALL appeals
- **Community Admin**: Sees their community's appeals only
- **Regular User**: Sees ONLY their own appeals

```json
{
  "success": true,
  "total": 25,
  "page": 1,
  "limit": 50,
  "count": 25,
  "data": [...]
}
```

---

### 3. Get Single Appeal
**GET** `/api/appeals/:id`  
**Auth:** SuperAdmin or Community Admin

---

### 4. Update Appeal
**PUT** `/api/appeals/:id`  
**Auth:** SuperAdmin or Community Admin

```json
{
  "status": "in-progress",
  "priority": "high",
  "adminNotes": "Working on it"
}
```

---

### 5. Delete Appeal
**DELETE** `/api/appeals/:id`  
**Auth:** SuperAdmin or Community Admin

---

## News

### 1. Get Headlines (For Slider)
**GET** `/api/news/community/:communityId/headlines?limit=5`  
**Auth:** User

**Query Params:**
- `limit` - Number of headlines (default: 5)

```json
{
  "success": true,
  "statusCode": 200,
  "headlines": [
    {
      "id": "...",
      "title": "Community Event This Weekend",
      "image": "https://...",
      "createdAt": "2024-10-21T..."
    }
  ]
}
```

---

### 2. Get Community News
**GET** `/api/news/community/:communityId`  
**Auth:** User (must be from that community or SuperAdmin)

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Community Event",
      "content": "...",
      "category": "events",
      "tags": ["event"],
      "imageUrl": "https://...",
      "author": {
        "firstName": "Admin",
        "email": "admin@example.com"
      },
      "community": {
        "name": "Test Community"
      },
      "createdAt": "2024-10-21T..."
    }
  ]
}
```

**Authorization:**
- SuperAdmin → Access ANY community's news
- Community members → Access their own community only

---

### 3. Create News
**POST** `/api/news/community/:communityId`  
**Auth:** SuperAdmin or Community Admin

```json
{
  "title": "Community Event This Weekend",
  "content": "Join us for the annual gathering...",
  "category": "events",
  "tags": ["event", "gathering"],
  "imageUrl": "https://..."
}
```

---

### 4. Get Single News
**GET** `/api/news/:id`  
**Auth:** User (must be from that community or SuperAdmin)

---

### 5. Update News
**PUT** `/api/news/:id`  
**Auth:** SuperAdmin or Community Admin (for their community's news)

---

### 6. Delete News
**DELETE** `/api/news/:id`  
**Auth:** SuperAdmin or Community Admin (for their community's news)

---

## Posts

**Standard CRUD operations on `/api/posts`**

- **POST** `/posts` - Create post
- **GET** `/posts` - List posts
- **GET** `/posts/:id` - Get single post
- **PUT** `/posts/:id` - Update post
- **DELETE** `/posts/:id` - Delete post

```json
// Create Post
{
  "title": "Post Title",
  "content": "Post content...",
  "images": ["url1", "url2"],
  "tags": ["tag1", "tag2"]
}
```

---

## Other APIs

### Donations
**POST/GET** `/api/donations`

```json
{
  "amount": 5000,
  "purpose": "Community Hall Renovation",
  "donorName": "John Doe",
  "donorEmail": "john@example.com",
  "paymentMethod": "UPI"
}
```

---

### Job Posts (Employment)
**POST/GET** `/api/jobPosts`

```json
{
  "title": "Software Engineer",
  "company": "Tech Corp",
  "location": "Delhi",
  "salary": "8-12 LPA",
  "description": "...",
  "jobType": "full-time",
  "contactEmail": "hr@techcorp.com"
}
```

---

### Sports Events
**POST/GET** `/api/sportsEvents`

```json
{
  "title": "Community Cricket Tournament",
  "sport": "cricket",
  "date": "2024-11-15T10:00:00Z",
  "venue": "Community Ground",
  "maxParticipants": 50
}
```

---

### Dukaans (Shops)
**POST/GET** `/api/dukaans`

```json
{
  "name": "Sharma Electronics",
  "category": "electronics",
  "owner": "Raj Sharma",
  "phone": "9876543210",
  "address": "Main Market"
}
```

---

### Education Resources
**POST/GET** `/api/educationResources`

```json
{
  "title": "IIT JEE Preparation Guide",
  "type": "guide",
  "category": "engineering",
  "fileUrl": "https://...",
  "author": "Prof. Kumar"
}
```

---

### Kartavya
**POST/GET** `/api/kartavya`

```json
{
  "title": "Community Responsibilities",
  "description": "...",
  "content": "..."
}
```

---

### Meetings
**POST/GET** `/api/meetings`

```json
{
  "title": "Monthly Community Meeting",
  "date": "2024-11-20T18:00:00Z",
  "venue": "Community Hall",
  "agenda": "Discuss upcoming events"
}
```

---

### Occasions
**POST/GET** `/api/occasions`  
**GET** `/api/occasion-categories`

```json
{
  "title": "Diwali Celebration",
  "date": "2024-11-12T18:00:00Z",
  "category": "CATEGORY_ID",
  "venue": "Community Hall"
}
```

---

### Family Tree
**POST/GET** `/api/family`

```json
{
  "user": "USER_ID",
  "relation": "father",
  "relatedUser": "RELATED_USER_ID",
  "name": "Father Name"
}
```

---

## Query Parser Guide

Most list endpoints support advanced querying.

### Basic Syntax
```
?filter[field]=value&sort=field&limit=20&page=1&projection=field1,field2
```

### Filter
```
# Exact match
?filter[status]=active

# Multiple filters
?filter[status]=active&filter[gender]=male

# Nested fields
?filter[community]=COMMUNITY_ID
```

### Sort
```
# Ascending
?sort=firstName

# Descending (prefix with -)
?sort=-createdAt

# Multiple
?sort=firstName,-createdAt
```

### Pagination
```
?limit=20&page=1
?limit=50&page=2
```

### Projection (Select Fields)
```
?projection=firstName,email,phone
?projection=firstName,email,password  # Password only for admins
```

### Combined Example
```
GET /api/communities/COMMUNITY_ID/users?
  filter[gender]=male&
  filter[roleInCommunity]=member&
  filter[communityStatus]=approved&
  sort=firstName&
  limit=50&
  page=1&
  projection=firstName,email,phone,password
```

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

### List Response
```json
{
  "success": true,
  "total": 100,
  "page": 1,
  "limit": 20,
  "count": 20,
  "data": [...]
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 500 | Server Error |

---

## Important Notes

### Password Management
- Passwords stored as plainTextPassword (visible to admins only)
- Also hashed with bcrypt for authentication
- Admins can view via user list endpoint with projection
- Password sent in welcome email when creating user

### Appeals System
- ANY user with a community can submit appeals
- No admin permission required for submission
- List endpoint filters by role automatically

### News Authorization
- SuperAdmin can access ANY community's news
- Regular users restricted to their own community
- Community admins can manage their community's news

### Community Users Endpoint
- Regular query shows basic fields
- Admins get password field when projected
- Access controlled by user role
- Community admins limited to their community

---

**For quick reference, see `API_QUICK_REFERENCE.md`**  
**For changes, see `CHANGELOG.md`**

---

**Version:** 2.1  
**Last Updated:** October 21, 2025
