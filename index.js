// index.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// Middleware
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const communityRoutes = require("./routes/communityRoutes");
const postRoutes = require("./routes/postRoutes");
const donationRoutes = require("./routes/donationRoutes");


// MongoDB connection
const connectDB = require("./config/database");
connectDB(); // Connect to MongoDB Atlas

const app = express();

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});

app.set("trust proxy", 1); // For rate limiter behind proxy

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(morgan("dev")); // Cleaner for dev, use "combined" in prod
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/donations", donationRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "KULL Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

// API Info
app.get("/api", (req, res) => {
  res.json({
    name: "KULL API",
    version: "1.0.0",
    description: "Multi-Community Platform Backend",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      communities: "/api/communities",
      posts: "/api/posts",
      donations: "/api/donations",
      content: "/api/content",
      admin: "/api/admin",
      superadmin: "/api/superadmin",
    },
  });
});

// Not Found Handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// Global Error Handler
app.use(notFound);
app.use(errorHandler);

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  const baseURL =
    process.env.NODE_ENV === "production"
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || "your-domain.com"}`
      : `http://localhost:${PORT}`;

  console.log(`KULL Backend running at ${baseURL}/api`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
