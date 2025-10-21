# KULL API - Quick Reference Guide

**Version:** 2.1 | **Updated:** Oct 21, 2025

---

## 🔑 Authentication
```
Headers: Authorization: Bearer JWT_TOKEN
```

## 📡 Base Endpoints

| Category | Base Path | Description |
|----------|-----------|-------------|
| Auth | `/api/auth` | Login, register, password reset |
| Users | `/api/users` | User management |
| Communities | `/api/communities` | Community management |
| Appeals | `/api/appeals` | User appeals/complaints |
| News | `/api/news` | News articles |
| Posts | `/api/posts` | Community posts |
| Donations | `/api/donations` | Donation management |
| Jobs | `/api/jobPosts` | Employment/jobs |
| Sports | `/api/sportsEvents` | Sports events |
| Shops | `/api/dukaans` | Shop listings |
| Education | `/api/educationResources` | Educational content |
| Kartavya | `/api/kartavya` | Responsibilities |
| Meetings | `/api/meetings` | Community meetings |
| Occasions | `/api/occasions` | Events/occasions |
| Family | `/api/family` | Family tree |

---

## 👥 Users API

### Key Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/pending` | SuperAdmin | Get pending users |
| GET | `/users/city-search?query=delhi` | User | Search by city |
| GET | `/users/family-tree/search?q=name` | User | Search family members |
| PUT | `/users/profile` | User | Update own profile |
| PUT | `/users/:userId` | Admin | Update user |
| PUT | `/users/:userId/assignCommunity` | Admin | Assign community |
| DELETE | `/users/:userId` | Admin | Delete user |

### Family Tree Search Parameters
- `q` (required) - Search term
- `communityId` - Filter by community
- `gotra` - Filter by gotra
- `subGotra` - Filter by sub-gotra
- `limit` - Max results (default: 50)

---

## 🏘️ Communities API

### Key Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/communities/create` | Any | Create community |
| GET | `/communities` | SuperAdmin | List all communities |
| GET | `/communities/:id` | SuperAdmin | Get community |
| PUT | `/communities/:id` | SuperAdmin | Update community |
| DELETE | `/communities/:id` | SuperAdmin | Delete community |
| GET | `/communities/:id/users` | Auth | **Get users (passwords for admins)** |
| POST | `/communities/:id/users` | Admin | **Add user with password** |
| GET | `/communities/:id/users/orgofficers` | Auth | Get officers |
| GET | `/communities/:id/gotraDetail` | Any | Get gotra list |
| POST | `/communities/:id/configuration` | Admin | Set config |
| GET | `/communities/:id/configuration` | Auth | Get config |
| POST | `/communities/:id/bhajans` | Admin | Add bhajan |
| GET | `/communities/:id/bhajans` | Auth | List bhajans |

### 🔐 Get Community Users (With Passwords)

**Endpoint:** `GET /api/communities/:communityId/users`

**Special Feature:** Admins see plaintext passwords!

**Query Parameters:**
- All standard queryParser options
- `filter[gender]=male`
- `filter[roleInCommunity]=member`
- `sort=firstName`
- `limit=50`

**Admin Response Includes:**
```json
{
  "data": [{
    "firstName": "John",
    "email": "john@example.com",
    "password": "UserPassword123"  // 👈 Only for admins!
  }]
}
```

### ✨ Add User to Community

**Endpoint:** `POST /api/communities/:communityId/users`

**Required Fields:**
- `firstName`
- `lastName`
- `password` ⭐
- `email` OR `phone`

**Password Handling:**
- Stored as bcrypt hash (for login)
- Stored as plainTextPassword (for admin viewing)
- Sent in welcome email to user
- Returned in API response

**Response:**
```json
{
  "success": true,
  "credentials": {
    "loginIdentifier": "john@example.com",
    "password": "UserPassword123"
  }
}
```

---

## 📢 Appeals API

### Key Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/appeals` | **Any User** | Submit appeal |
| GET | `/appeals` | User | List appeals (filtered by role) |
| GET | `/appeals/:id` | Admin | Get single appeal |
| PUT | `/appeals/:id` | Admin | Update appeal |
| DELETE | `/appeals/:id` | Admin | Delete appeal |

### Create Appeal (Any User Can Submit!)
```json
{
  "subject": "Issue Title",
  "description": "Detailed description",
  "category": "maintenance",
  "priority": "medium"
}
```

### List Appeals - Role-Based Filtering
- **SuperAdmin**: Sees ALL appeals
- **Community Admin**: Sees their community's appeals
- **Regular User**: Sees ONLY their own appeals

### Query Parameters
- `filter[status]=pending`
- `filter[priority]=high`
- `sort=-createdAt`
- `limit=50`

---

## 📰 News API

### Key Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/news/community/:id/headlines` | User | Get headlines (slider) |
| GET | `/news/community/:id` | User | Get community news |
| POST | `/news/community/:id` | Admin | Create news |
| GET | `/news/:id` | User | Get single news |
| PUT | `/news/:id` | Admin | Update news |
| DELETE | `/news/:id` | Admin | Delete news |

### Headlines for Slider
```http
GET /api/news/community/:communityId/headlines?limit=5
```

**Response:**
```json
{
  "headlines": [
    {
      "id": "...",
      "title": "News Title",
      "image": "url",
      "createdAt": "2024-10-21T..."
    }
  ]
}
```

---

## 📝 Other APIs Quick Reference

### Posts
- `POST /posts` - Create post
- `GET /posts` - List posts
- `GET /posts/:id` - Get post
- `PUT /posts/:id` - Update post
- `DELETE /posts/:id` - Delete post

### Donations
- `POST /donations` - Create donation
- `GET /donations` - List donations

### Job Posts
- `POST /jobPosts` - Create job
- `GET /jobPosts` - List jobs

### Sports Events
- `POST /sportsEvents` - Create event
- `GET /sportsEvents` - List events

### Dukaans (Shops)
- `POST /dukaans` - Create shop
- `GET /dukaans` - List shops

### Education Resources
- `POST /educationResources` - Create resource
- `GET /educationResources` - List resources

### Meetings
- `POST /meetings` - Create meeting
- `GET /meetings` - List meetings

### Occasions
- `POST /occasions` - Create occasion
- `GET /occasions` - List occasions
- `GET /occasion-categories` - List categories

---

## 🔍 Query Parser Syntax

Most list endpoints support advanced querying:

### Filter
```
?filter[field]=value
?filter[status]=active&filter[gender]=male
```

### Sort
```
?sort=firstName          # Ascending
?sort=-createdAt         # Descending (- prefix)
?sort=firstName,-createdAt  # Multiple
```

### Pagination
```
?limit=20&page=1
?limit=50&page=2
```

### Projection (Select Fields)
```
?projection=firstName,email,phone
```

### Combined Example
```
GET /api/communities/COMMUNITY_ID/users?filter[gender]=male&filter[roleInCommunity]=member&sort=firstName&limit=50&page=1&projection=firstName,email,phone,password
```

---

## 🔐 Authorization Levels

| Role | Access Level |
|------|--------------|
| **SuperAdmin** | Full access to everything |
| **Community Admin** | Manage their community only |
| **User** | Basic access, own data only |

### Common Access Patterns

**SuperAdmin Only:**
- List all communities
- Delete any user
- View all appeals

**Admin (Super + Community):**
- Add users to community
- Update community config
- Manage community content
- **View user passwords**

**Any Authenticated User:**
- Submit appeals
- Update own profile
- Search family tree
- View community content

---

## 📊 Common Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
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
  "data": [ ... ]
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

## 🚨 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 500 | Server Error |

---

## ⚙️ Important Notes

### Password Management
- **New System**: Passwords stored as plainTextPassword
- **Admin Access**: Admins can view passwords via user list endpoint
- **Email**: Password sent in welcome email
- **Response**: Password returned when creating user

### Community Users Endpoint
- Regular query shows basic fields
- Admins get additional `password` field
- Use projection to request specific fields
- Password only visible to SuperAdmin or Community Admin

### Appeals System
- **ANY user can submit** (no admin required!)
- Automatically linked to user's community
- Role-based filtering on list endpoint
- Admins can update/delete

### News Authorization
- SuperAdmin can access any community's news
- Regular users can only access their own community
- Community admins can manage their community's news

---

## 🧪 Testing Tips

### Get Auth Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"user@example.com","password":"pass"}'
```

### Test with Token
```bash
curl -X GET http://localhost:5000/api/users/pending \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create User with Password
```bash
curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/users \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Test",
    "lastName":"User",
    "email":"test@example.com",
    "password":"TestPass123"
  }'
```

### Get Users (See Passwords as Admin)
```bash
curl -X GET "http://localhost:5000/api/communities/COMMUNITY_ID/users?projection=firstName,email,password" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

**For detailed documentation, see `API_DOCUMENTATION.md`**
