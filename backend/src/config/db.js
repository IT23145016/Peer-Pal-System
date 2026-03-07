const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    const isSrvLookupFailure =
      typeof error?.message === "string" &&
      (error.message.includes("querySrv") || error.message.includes("ENOTFOUND"));

    if (isSrvLookupFailure && process.env.MONGO_URI_DIRECT) {
      console.warn("MongoDB SRV lookup failed. Retrying with direct connection URI...");
      try {
        await mongoose.connect(process.env.MONGO_URI_DIRECT);
        console.log("MongoDB connected");
        return;
      } catch (fallbackError) {
        console.error("MongoDB direct fallback failed:", fallbackError.message);
      }
    }

    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
