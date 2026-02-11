const mongoose = require("mongoose");

// Cache connection for Lambda reuse across invocations
let cachedDb = null;

const connectDB = async () => {
  // Return cached connection if available and connected
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log("Using cached MongoDB connection");
    return cachedDb;
  }

  try {
    const MONGO_URI = process.env.MONGO_URI;
    
    // Lambda-optimized connection options
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: isLambda ? 10 : 50, // Smaller pool for Lambda
      minPoolSize: isLambda ? 1 : 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      // Lambda-specific: buffer commands until connection is ready
      bufferCommands: !isLambda,
    };

    cachedDb = await mongoose.connect(MONGO_URI, connectionOptions);
    
    console.log("MongoDB connected successfully");
    console.log(`Connection pool: min=${connectionOptions.minPoolSize}, max=${connectionOptions.maxPoolSize}`);
    console.log(`Environment: ${isLambda ? 'AWS Lambda' : 'Standard'}`);
    
    return cachedDb;
  } catch (err) {
    console.error("MongoDB connection error:", err);
    // Don't exit process in Lambda - throw error instead
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      throw err;
    }
    process.exit(1);
  }
};

module.exports = connectDB;
