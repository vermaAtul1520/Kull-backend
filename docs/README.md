# KULL Platform API Documentation

Welcome to the KULL Platform API documentation. This folder contains all the resources you need to integrate with and understand the KULL backend API.

---

## 📚 Documentation Files

### 1. **API_DOCUMENTATION.md** (Main Reference)
Complete API documentation with detailed endpoints, request/response examples, and usage guidelines.

**What's Inside:**
- All API endpoints organized by category
- Request body examples
- Response format specifications
- Query parameter documentation
- Authorization requirements
- Error handling

**Start Here If:** You need detailed information about a specific endpoint or want comprehensive API coverage.

---

### 2. **API_QUICK_REFERENCE.md** (Quick Lookup)
Condensed reference guide for fast lookups and common patterns.

**What's Inside:**
- Endpoint tables with methods and auth requirements
- Query parser syntax
- Common request templates
- HTTP status codes
- Testing tips

**Start Here If:** You already know the basics and need a quick reference or syntax reminder.

---

### 3. **CHANGELOG.md** (Recent Changes)
Detailed log of all changes in version 2.1, including breaking changes and migration guide.

**What's Inside:**
- Password management system changes
- Appeals system updates
- News authorization fixes
- Removed features
- Breaking changes and migration guide
- Security considerations

**Start Here If:** You're upgrading from version 2.0 or need to understand what changed recently.

---

### 4. **KULL_API.postman_collection.json** (Postman Collection)
Ready-to-import Postman collection with all configured endpoints.

**What's Inside:**
- 50+ pre-configured API requests
- Collection variables (baseUrl, token, communityId)
- Request body templates
- Organized by category

**Start Here If:** You want to test the API immediately or integrate with Postman.

---

## 🚀 Quick Start

### 1. Import Postman Collection
```bash
# In Postman:
File → Import → Select "KULL_API.postman_collection.json"
```

### 2. Set Environment Variables
```
baseUrl: http://localhost:5000/api
token: YOUR_JWT_TOKEN (get from login)
communityId: YOUR_COMMUNITY_ID
userId: YOUR_USER_ID
```

### 3. Test Authentication
```bash
POST {{baseUrl}}/auth/login
Body:
{
  "emailOrPhone": "user@example.com",
  "password": "yourpassword"
}

# Copy the token from response and update collection variable
```

### 4. Start Making Requests
All other requests in the collection use the `{{token}}` variable automatically!

---

## 🔑 Key Features in v2.1

### 1. **Password Management System**
- Admins can view user passwords via user list endpoint
- Passwords stored as plaintext for admin viewing
- Still hashed with bcrypt for authentication
- Password sent in welcome emails

**Example:**
```bash
GET /api/communities/COMMUNITY_ID/users?projection=firstName,email,password
# Admins see password field, regular users don't
```

### 2. **Appeals System (Open to All Users)**
- ANY authenticated user can submit appeals
- No admin permission required
- Automatically linked to user's community
- Role-based filtering on list endpoint

**Example:**
```bash
POST /api/appeals
Body: {
  "subject": "Issue",
  "description": "Details"
}
# Works for all users with a community!
```

### 3. **News Headlines Endpoint**
- Dedicated endpoint for homepage news slider
- Returns latest news with title, image, date
- Optimized for mobile app integration

**Example:**
```bash
GET /api/news/community/COMMUNITY_ID/headlines?limit=5
# Perfect for homepage sliders
```

### 4. **Family Tree Search**
- Comprehensive search across multiple fields
- Filter by gotra and sub-gotra
- Case-insensitive matching
- Fast and efficient

**Example:**
```bash
GET /api/users/family-tree/search?q=rajesh&gotra=Kashyap
# Search by name, email, phone, or code
```

---

## 📋 API Categories

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Auth** | `/auth/login`, `/auth/register` | Authentication |
| **Users** | `/users/*` | User management, search |
| **Communities** | `/communities/*` | Community CRUD, config |
| **Appeals** | `/appeals/*` | User appeals/complaints |
| **News** | `/news/*` | News articles & headlines |
| **Posts** | `/posts/*` | Community posts |
| **Donations** | `/donations/*` | Donation tracking |
| **Jobs** | `/jobPosts/*` | Employment listings |
| **Sports** | `/sportsEvents/*` | Sports events |
| **Shops** | `/dukaans/*` | Shop directory |
| **Education** | `/educationResources/*` | Educational content |
| **Meetings** | `/meetings/*` | Community meetings |
| **Occasions** | `/occasions/*` | Events & celebrations |
| **Family** | `/family/*` | Family tree |
| **Bhajans** | `/communities/:id/bhajans` | Devotional songs |

---

## 🔐 Authorization Levels

### SuperAdmin
- Full access to all endpoints
- Can manage all communities
- View all users' passwords
- Delete any resource

### Community Admin
- Manage their own community
- Add/update/delete community users
- View their community users' passwords
- Manage community content

### User
- Update own profile
- Submit appeals
- Search family tree
- View community content
- NO password visibility

---

## 🧪 Testing Guide

### Test with cURL

**1. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"user@example.com","password":"pass"}'
```

**2. Use Token:**
```bash
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:5000/api/users/pending \
  -H "Authorization: Bearer $TOKEN"
```

**3. Create User with Password:**
```bash
curl -X POST http://localhost:5000/api/communities/COMMUNITY_ID/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Test",
    "lastName":"User",
    "email":"test@example.com",
    "password":"TestPass123"
  }'
```

**4. View Passwords (Admin):**
```bash
curl -X GET "http://localhost:5000/api/communities/COMMUNITY_ID/users?projection=firstName,email,password" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 📊 Common Patterns

### Query Parser Syntax
```
# Filter
?filter[field]=value
?filter[status]=active&filter[gender]=male

# Sort
?sort=firstName          # Ascending
?sort=-createdAt        # Descending

# Pagination
?limit=20&page=1

# Projection
?projection=firstName,email,phone

# Combined
?filter[gender]=male&sort=firstName&limit=50&projection=firstName,email,password
```

### Response Format
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

---

## ⚠️ Important Notes

### Password Visibility
- **Stored in plain text** for admin viewing
- **Also hashed** with bcrypt for authentication
- **Only visible to admins** via projection
- **Not auto-included** in queries

### Breaking Changes from v2.0
- ❌ Removed route aliases (`/api/employment`, etc.)
- ❌ Removed dedicated password endpoint
- ✅ Use user list endpoint with projection instead
- ✅ SuperAdmins now have full news access

### Security Best Practices
1. Always use HTTPS in production
2. Rotate JWT secrets regularly
3. Monitor admin access logs
4. Implement rate limiting
5. Use strong passwords
6. Enable database encryption at rest

---

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized:**
- Check if token is valid
- Ensure token is not expired
- Verify Authorization header format

**403 Forbidden:**
- Check user role and permissions
- Verify community ownership for Community Admins
- Ensure user belongs to a community (for appeals)

**404 Not Found:**
- Verify endpoint URL is correct
- Check if route aliases were removed (use full paths)
- Ensure resource ID exists

**Password Not Visible:**
- Ensure you're using admin token
- Include `password` in projection query
- Check if user has `plainTextPassword` field

---

## 📞 Support & Resources

### Documentation Files
- `API_DOCUMENTATION.md` - Full API reference
- `API_QUICK_REFERENCE.md` - Quick lookup guide
- `CHANGELOG.md` - Version history & changes
- `KULL_API.postman_collection.json` - Postman collection

### Links
- Base URL (Dev): `http://localhost:5000/api`
- Base URL (Prod): `[YOUR_PRODUCTION_URL]/api`
- Health Check: `GET /api/health`

### Contact
- Backend Team: [Your Contact Info]
- Issues: [GitHub/Issue Tracker]
- Email: support@kull.com

---

## 🎯 Next Steps

1. ✅ **Import Postman Collection** - Start testing immediately
2. ✅ **Read Quick Reference** - Get familiar with endpoints
3. ✅ **Check Changelog** - Understand recent changes
4. ✅ **Test Authentication** - Get your JWT token
5. ✅ **Explore APIs** - Try different endpoints
6. ✅ **Build Integration** - Start implementing features

---

## 📝 Contributing

### Documentation Updates
- Update `API_DOCUMENTATION.md` for new endpoints
- Add entries to `CHANGELOG.md` for changes
- Update Postman collection with new requests
- Keep `API_QUICK_REFERENCE.md` in sync

### Version History
- **v2.1** (Oct 21, 2025) - Current version
- **v2.0** (Oct 18, 2025) - Password encryption system
- **v1.0** - Initial release

---

**Last Updated:** October 21, 2025  
**Version:** 2.1  
**Status:** Current & Active
