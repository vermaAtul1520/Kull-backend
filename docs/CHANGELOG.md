# KULL Backend - Changelog

## Version 2.1 - October 21, 2025

### 🔐 Password Management Changes

#### Simplified Password Storage
- **REMOVED**: AES encryption system
- **ADDED**: `plainTextPassword` field in User model
- **CHANGED**: Passwords now stored in plain text for admin viewing (stored alongside bcrypt hash)

#### Why the Change?
- Simpler implementation
- Faster admin access to passwords
- No encryption key management needed
- Maintains bcrypt hash for secure authentication

#### Impact on Endpoints

**`POST /api/communities/:communityId/users`**
- Still requires `password` in request body
- Password stored as:
  - Bcrypt hash (`password` field) → for login
  - Plain text (`plainTextPassword` field) → for admin viewing
- Password returned in response `credentials` object
- **Password sent in welcome email** (was previously not sent)

**`GET /api/communities/:communityId/users`**
- **NEW FEATURE**: Admins now see `password` field in user list
- Regular users do NOT see password field
- Access control:
  - SuperAdmin → sees all users' passwords
  - Community Admin → sees their community users' passwords
  - Regular User → no password visibility

**REMOVED ENDPOINT**: `GET /api/communities/users/:userId/with-password`
- No longer needed since passwords are in the regular user list

---

### 📢 Appeals System Changes

#### Submission Access
- **CHANGED**: ANY authenticated user can now submit appeals
- **REMOVED**: Admin-only restriction on POST `/api/appeals`
- Users must belong to a community to submit

#### List Endpoint Behavior
- **IMPROVED**: `getAll()` method in AppealController
- **CHANGED**: No longer uses `super.getAll()`
- Direct database query with role-based filtering
- Response includes pagination metadata

---

### 📰 News Authorization Fixes

#### Authorization Logic Updated
All news endpoints now properly check SuperAdmin role:

**Before:**
```javascript
if (roleInCommunity === 'admin' && community !== communityId)
```

**After:**
```javascript
if (role !== 'superadmin' && community.toString() !== communityId)
```

**Affected Endpoints:**
- `POST /api/news/community/:id` - Create news
- `GET /api/news/community/:id` - Get community news  
- `GET /api/news/:id` - Get single news
- `GET /api/news/community/:id/headlines` - Get headlines

**Impact:**
- SuperAdmins can now access ANY community's news
- Non-superadmin users restricted to their own community
- Fixes issues where SuperAdmins were incorrectly denied access

---

### 🏘️ Community User Management

#### Get Users Endpoint Enhanced
**`GET /api/communities/:communityId/users`**

**CHANGED Implementation:**
- No longer delegates to BaseController
- Custom implementation with admin password viewing
- Better field selection control
- Improved projection handling

**New Response Behavior:**
```javascript
// Admin request
{
  "data": [{
    "firstName": "John",
    "email": "john@example.com",
    "password": "UserPassword123"  // ✅ Visible
  }]
}

// Regular user request
{
  "data": [{
    "firstName": "John",
    "email": "john@example.com"
    // ❌ No password field
  }]
}
```

**Projection Support:**
- Can now request `plainTextPassword` in projection
- Automatically included for admins if requested
- Field renamed to `password` in response for cleaner API

---

### 📧 Email Notifications

#### Community Creation
- **REMOVED**: Automatic referral code email on community creation
- **REASON**: Simplified flow, code available in response

#### User Creation
- **CHANGED**: Welcome email now INCLUDES password
- **BEFORE**: Email sent without credentials
- **AFTER**: Email contains login credentials with password

**Email Template:**
```
Subject: Welcome to KULL Platform - Your Account Details

Your Login Credentials:
Email/Phone: john@example.com  
Password: UserPassword123
```

---

### 🗑️ Removed Features

#### Route Aliases
**REMOVED** the following route aliases:
- `/api/employment` → use `/api/jobPosts`
- `/api/sports` → use `/api/sportsEvents`
- `/api/dukan` → use `/api/dukaans`
- `/api/education` → use `/api/educationResources`

**Reason:** Keeping API routes consistent with backend structure

#### Password Encryption
**REMOVED FILES:**
- `utils/passwordEncryption.js`
- All AES encryption logic
- `encryptedPassword` field usage

**REMOVED FROM:**
- `communityController.js` - encryption imports and logic
- User model - `encryptedPassword` field still exists but unused

#### Documentation
**DELETED** old documentation files:
- `docs/README.md`
- `docs/TESTING_GUIDE.md`
- `docs/API_DOCUMENTATION.md` (old version)
- `docs/API_QUICK_REFERENCE.md` (old version)
- `docs/BACKEND_ISSUE_REPORT.md`
- `docs/BACKEND_FIXES_IMPLEMENTED.md`
- `docs/PASSWORD_MANAGEMENT_UPDATE.md`
- `docs/KULL_API.postman_collection.json` (old version)
- `PASSWORD_UPDATE_SUMMARY.md`

**Reason:** Creating fresh, updated documentation

---

### 🔧 Technical Improvements

#### Community User List Query
**Before:**
```javascript
// Delegated to BaseController
const userController = new BaseController(User);
return userController.getAll(req, res, next);
```

**After:**
```javascript
// Custom implementation with admin password support
const users = await User.find(finalFilter)
  .select(selectFields + (isAdmin ? " +plainTextPassword" : ""))
  .sort(sort)
  .skip(skip)
  .limit(limit);

// Transform response
const usersData = users.map(user => {
  const userObj = user.toObject();
  if (userObj.plainTextPassword) {
    userObj.password = userObj.plainTextPassword;
    delete userObj.plainTextPassword;
  }
  return userObj;
});
```

**Benefits:**
- Better control over field selection
- Admin-specific password viewing
- Cleaner response format
- Maintains security boundaries

---

#### Appeal Controller getAll
**Before:**
```javascript
return super.getAll(req, res, next);
```

**After:**
```javascript
const { filter, sort, projection, skip, limit, page } = req.parsedQuery;
const docs = await this.model.find(filter)
  .select(projection || "")
  .sort(sort)
  .skip(skip)
  .limit(limit);
const total = await this.model.countDocuments(filter);

res.status(200).json({ 
  success: true, 
  total, 
  page, 
  limit, 
  count: docs.length, 
  data: docs 
});
```

**Benefits:**
- Explicit control over query execution
- Consistent response format
- Better error handling
- No inheritance confusion

---

### ⚠️ Breaking Changes

#### 1. Password Viewing
**BREAKING:** Removed dedicated password endpoint
- **Old:** `GET /api/communities/users/:userId/with-password`
- **New:** Use `GET /api/communities/:communityId/users` with projection

**Migration:**
```javascript
// Old way
GET /api/communities/users/USER_ID/with-password

// New way
GET /api/communities/COMMUNITY_ID/users?filter[_id]=USER_ID&projection=firstName,email,password
```

#### 2. Route Aliases Removed
**BREAKING:** Mobile app must use correct endpoints
- Use `/api/jobPosts` NOT `/api/employment`
- Use `/api/sportsEvents` NOT `/api/sports`
- Use `/api/dukaans` NOT `/api/dukan`
- Use `/api/educationResources` NOT `/api/education`

#### 3. News Authorization
**BREAKING:** Authorization logic changed
- SuperAdmins now have unrestricted access
- Community admins restricted to their community
- May affect existing admin workflows

---

### 🔒 Security Considerations

#### Plain Text Password Storage
**NEW APPROACH:**
- Passwords stored in plain text (`plainTextPassword` field)
- **ONLY visible to admins** via API
- Still hashed with bcrypt for authentication
- Database field has `select: false` (not auto-included)

**Security Measures:**
1. Field not included in default queries
2. Access restricted to admin roles only
3. Community admins limited to their community
4. Field explicitly requested via projection or admin check

**Trade-offs:**
- ✅ **Pros**: Simple, fast admin access, no key management
- ⚠️ **Cons**: Passwords readable in database, requires trust in admin access controls

**Recommendations:**
- Ensure strong database access controls
- Monitor admin access logs
- Consider encryption at rest for database
- Regular security audits

---

### 📊 Database Schema Changes

#### User Model
```javascript
// ADDED field
plainTextPassword: {
  type: String,
  select: false  // Not included by default
}

// KEPT field (still used for authentication)
password: {
  type: String,
  required: true,
  select: false
}

// KEPT but unused
encryptedPassword: {
  type: String,
  select: false
}
```

**Note:** `encryptedPassword` field exists in schema but is no longer used. Safe to keep for backward compatibility or remove in future migration.

---

### 🧪 Testing Recommendations

#### Test Password Viewing
```bash
# As Admin - should see passwords
curl -X GET "http://localhost:5000/api/communities/COMMUNITY_ID/users?projection=firstName,email,password" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# As Regular User - should NOT see passwords
curl -X GET "http://localhost:5000/api/communities/COMMUNITY_ID/users?projection=firstName,email,password" \
  -H "Authorization: Bearer USER_TOKEN"
```

#### Test Appeal Submission
```bash
# Regular user should be able to submit
curl -X POST "http://localhost:5000/api/appeals" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","description":"Test appeal"}'
```

#### Test News Access (SuperAdmin)
```bash
# SuperAdmin should access any community's news
curl -X GET "http://localhost:5000/api/news/community/ANY_COMMUNITY_ID" \
  -H "Authorization: Bearer SUPERADMIN_TOKEN"
```

---

### 📝 Documentation Updates

#### New Files Created
- ✅ `docs/API_DOCUMENTATION.md` - Complete API reference
- ✅ `docs/API_QUICK_REFERENCE.md` - Quick lookup guide
- ✅ `docs/CHANGELOG.md` - This file
- ✅ `docs/KULL_API.postman_collection.json` - Postman collection

#### Documentation Highlights
- All endpoints documented with examples
- Password management clearly explained
- Authorization levels detailed
- Query parser syntax reference
- Common patterns and best practices

---

### 🚀 Upgrade Guide

#### For Backend Developers
1. ✅ No code changes needed if using latest version
2. ✅ Remove old documentation references
3. ✅ Update any scripts using removed endpoints
4. ⚠️ Review security implications of plain text passwords

#### For Frontend/Mobile Developers
1. ⚠️ **Update route paths** (remove aliases if used)
2. ✅ **Appeal submission** now available to all users
3. ✅ **Password viewing** via user list endpoint (admins only)
4. ✅ **News access** - SuperAdmins can access all communities
5. ⚠️ **User creation** response includes password in `credentials` object

#### For API Consumers
1. Update endpoint URLs (use full paths, not aliases)
2. Adjust password retrieval logic (use projection on user list)
3. Test appeal submission with regular user accounts
4. Verify SuperAdmin news access works correctly

---

### 🎯 Next Steps

#### Recommended Actions
- [ ] Review and test all changed endpoints
- [ ] Update frontend/mobile apps
- [ ] Test password viewing permissions
- [ ] Verify appeal submission workflow
- [ ] Test SuperAdmin news access
- [ ] Security audit for password storage
- [ ] Update deployment documentation
- [ ] Train admins on new password viewing

#### Future Considerations
- Consider implementing password encryption (if security requires)
- Add audit logging for password views
- Implement password strength requirements
- Add password change functionality
- Consider two-factor authentication for admins

---

## Previous Versions

### Version 2.0 - October 18, 2025
- Implemented AES password encryption (later removed)
- Added route aliases (later removed)
- Added family tree search
- Added news headlines endpoint
- Fixed appeal submission for regular users
- Added referral code emails (later removed)

### Version 1.0 - Initial Release
- Core API functionality
- User management
- Community system
- Basic authentication

---

**Document Version:** 1.0  
**Last Updated:** October 21, 2025  
**Status:** Current
