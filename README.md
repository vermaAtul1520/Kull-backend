# Kull-backend# KULL Backend - Multi-Community Platform

A comprehensive Node.js backend for the KULL multi-community platform with advanced authentication, role-based access control, and community-specific content management.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone and setup:**
   ```bash
   git clone <your-repo-url>
   cd kull-backend
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create directories:**
   ```bash
   mkdir -p uploads/{communities,content,avatars,temp}
   mkdir -p logs
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## 🏘️ **Key Features**

### **Multi-Community Architecture**
- **Community Isolation**: Each community's content is completely isolated
- **Unique Join Keys**: 8-character unique keys for community access
- **Admin Approval System**: Configurable approval process for new members
- **Role-Based Access**: SuperAdmin → Admin → User hierarchy

### **Authentication Flow**

#### **1. Join Community (Primary Method)**
```bash
POST /api/auth/join-community
{
  "joinKey": "ABC12345",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!"
}
```

#### **2. Request New Community**
```bash
POST /api/auth/request-community
# Multipart form with:
# - Community details
# - Admin details
# - Documents (PDF/DOC up to 5MB)
# - Logo image
```

#### **3. Login**
```bash
POST /api/auth/login
{
  "emailOrPhone": "john@example.com",  # or phone number
  "password": "SecurePass123!"
}
```

#### **4. Password Reset**
```bash
# Request reset
POST /api/auth/forgot-password
{
  "emailOrPhone": "john@example.com"
}

# Reset with token
POST /api/auth/reset-password
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

## 🗃️ **Database Models**

### **User Model**
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  role: ['user', 'admin', 'superadmin'],
  communities: [{
    community: ObjectId,
    role: ['member', 'admin'],
    status: ['pending', 'approved', 'rejected'],
    joinedAt: Date
  }],
  // ... other fields
}
```

### **Community Model**
```javascript
{
  name: String (unique),
  description: String,
  category: Enum,
  location: {
    address, city, state, country, zipCode
  },
  contactInfo: {
    email, phone, website
  },
  joinKey: String (unique, 8 chars),
  admin: ObjectId,
  status: ['pending', 'approved', 'rejected'],
  settings: {
    requireApproval: Boolean,
    maxMembers: Number
  },
  // ... other fields
}
```

### **Content Model**
```javascript
{
  title: String,
  content: String,
  contentType: ['announcement', 'news', 'event', etc.],
  community: ObjectId,
  author: ObjectId,
  visibility: ['public', 'members', 'admins'],
  attachments: [FileInfo],
  comments: [CommentInfo],
  reactions: [ReactionInfo],
  // ... other fields
}
```

## 🛡️ **Security Features**

### **Authentication & Authorization**
```javascript
// Middleware usage examples
router.get('/content', auth, communityMemberAuth, getContent);
router.post('/content', auth, communityAdminAuth, createContent);
router.get('/admin/users', auth, superAdminAuth, getUsers);
```

### **Rate Limiting**
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 attempts per 15 minutes
- Password reset: 3 attempts per hour

### **File Upload Security**
- File type validation (PDF, DOC, images)
- Size limits (5MB documents, 50MB videos)
- Virus scanning ready
- Secure file naming

## 📁 **File Upload System**

### **Community Registration**
```bash
POST /api/auth/request-community
Content-Type: multipart/form-data

# Files:
documents[]: PDF/DOC files (max 5, 5MB each)
logo: Image file (max 1, 2MB)
```

### **Content Attachments**
```bash
POST /api/admin/content
Content-Type: multipart/form-data

# Files:
attachments[]: Various file types (max 10)
```

## 🔐 **Permission Matrix**

| Action | User | Community Admin | Super Admin |
|--------|------|-----------------|-------------|
| View community content | ✅ (own communities) | ✅ (own community) | ✅ (all) |
| Post content | ❌ | ✅ (own community) | ✅ (all) |
| Approve join requests | ❌ | ✅ (own community) | ✅ (all) |
| Approve communities | ❌ | ❌ | ✅ |
| Manage users | ❌ | ✅ (community users) | ✅ (all) |

## 🚦 **API Endpoints**

### **Authentication**
```
POST   /api/auth/login                    # User login
POST   /api/auth/join-community           # Join with key
POST   /api/auth/request-community        # Request new community
POST   /api/auth/forgot-password          # Password reset
POST   /api/auth/reset-password           # Reset with token
GET    /api/auth/me                       # Current user
GET    /api/auth/community/:joinKey       # Community info
```

### **Community Management**
```
GET    /api/communities                   # User's communities
GET    /api/communities/:id/content       # Community content
POST   /api/communities/:id/join          # Join request
```

### **Admin Operations**
```
GET    /api/admin/pending-joins           # Pending join requests
POST   /api/admin/approve-join            # Approve join
POST   /api/admin/content                 # Create content
GET    /api/admin/analytics               # Community analytics
```

### **Super Admin Operations**
```
GET    /api/superadmin/community-requests # Pending communities
POST   /api/superadmin/approve-community  # Approve community
GET    /api/superadmin/communities        # All communities
GET    /api/superadmin/users              # All users
```

## 🏃‍♂️ **Running the Application**

### **Development**
```bash
npm run dev          # Start with nodemon
npm test             # Run tests
npm run test:watch   # Watch mode tests
```

### **Production**
```bash
npm start            # Production server
```

### **Environment Variables**
Key variables to configure:
```env
MONGODB_URI=mongodb://localhost:27017/kull
JWT_SECRET=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
SUPER_ADMIN_EMAIL=admin@kull.com
```

## 📧 **Email Features**

The system sends emails for:
- Welcome messages
- Community join requests
- Community approvals/rejections
- Password resets
- Admin notifications

Configure your email service in `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## 🧪 **Testing**

### **Manual Testing with Postman**

1. **Test Community Registration:**
   ```bash
   POST /api/auth/request-community
   # Include form data with community details and files
   ```

2. **Test User Join:**
   ```bash
   POST /api/auth/join-community
   # Use the community's join key
   ```

3. **Test Admin Approval:**
   ```bash
   POST /api/admin/approve-join
   # As community admin, approve pending users
   ```

## 🔧 **Customization**

### **Adding New Content Types**
```javascript
// In models/Content.js
contentType: {
  enum: ['announcement', 'news', 'event', 'your-new-type']
}
```

### **Custom Community Categories**
```javascript
// In models/Community.js
category: {
  enum: ['Educational', 'Professional', 'Your-Category']
}
```

## 📊 **Monitoring & Logging**

- Request logging with Morgan
- Error tracking
- Performance monitoring ready
- Custom logging available

## 🚀 **Deployment**

### **Environment Setup**
1. Set production environment variables
2. Configure MongoDB connection
3. Set up email service
4. Configure file storage (local/cloud)

### **Security Checklist**
- [ ] Change default JWT secrets
- [ ] Set up HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable request logging
- [ ] Set up backup strategy

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📝 **License**

MIT License - see LICENSE file for details.

---

**KULL Backend** - Powering community-driven platforms with security and scalability in mind.