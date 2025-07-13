const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// Import database connection
const connectDB = require("./config/database");

// Import routes
// const authRoutes = require("./routes/authRoutes");
// const userRoutes = require("./routes/userRoutes");
// const communityRoutes = require("./routes/communityRoutes");
// const contentRoutes = require("./routes/contentRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// const superAdminRoutes = require("./routes/superAdminRoutes");

// // Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { auth } = require("./middleware/auth");

const app = express();

// Trust proxy for rate limiting
app.set("trust proxy", 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(compression());
app.use(limiter);
app.use(morgan("combined"));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to database
connectDB();

// Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/communities", communityRoutes);
// app.use("/api/content", contentRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/superadmin", superAdminRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "KULL Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "KULL API",
    version: "1.0.0",
    description: "Multi-Community Platform Backend",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      communities: "/api/communities",
      content: "/api/content",
      admin: "/api/admin",
      superadmin: "/api/superadmin",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use('*', notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 KULL Backend server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
});
