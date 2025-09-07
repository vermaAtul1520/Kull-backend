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
const newsRoutes = require("./routes/newsRoutes");
const appealRoutes = require("./routes/appealRoutes");
const dukaanRoutes = require("./routes/dukaanRoutes");
const educationResourceRoutes = require("./routes/educationResourceRoutes");
const jobPostRoutes = require("./routes/jobPostRoutes");
const kartavyaRoutes = require("./routes/kartavyaRoutes");


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
  origin: true,        // Reflects the request origin
  credentials: true,   // Allows cookies and Authorization headers
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
app.use("/api/news", newsRoutes);
app.use("/api/appeals", appealRoutes);
app.use("/api/dukaans", dukaanRoutes);
app.use("/api/educationResources", educationResourceRoutes);
app.use("/api/jobPosts", jobPostRoutes);
app.use("/api/kartavya", kartavyaRoutes);

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
      news: "/api/news",
      content: "/api/content",
      bhajan: "/api/communities",
      admin: "/api/admin",
      superadmin: "/api/superadmin",
      appeals: "/api/appeals",
      dukaans: "/api/dukaans",
      educationResources: "/api/educationResources",
      jobPosts: "/api/jobPosts",
      kartavya: "/api/kartavya",
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
