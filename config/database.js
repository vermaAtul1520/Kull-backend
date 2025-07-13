// config/database.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log(process.env.MONGODB_URI);
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/kull",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    // Fixed: was "ercorrectror"
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
