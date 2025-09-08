const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const MONGO_URI = "mongodb+srv://parmanandprajapati006:vNr37YTR7pufyxPD@cluster0.3tsblyf.mongodb.net/Kull?retryWrites=true&w=majority&appName=Cluster0"
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
