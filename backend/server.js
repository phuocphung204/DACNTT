import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

// Load environment variables
dotenv.config();

const app = express();

import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import departmentRoutes from "./routes/departments.js";
import requestRoutes from "./routes/requests.js";
import dashboardRoutes from "./routes/dashboard.js";

// Services
import { initGmailWatcher } from "./services/email_ggapi.js";
import { initModel } from "./services/finetune.js";

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Morgan for logging
app.use(morgan("dev"));

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
};

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.log('có lỗi')
  res.status(statusCode).json({
    ec: statusCode,
    em: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Ecommerce API is running!" });
});

// Connect to database and start server
const PORT = process.env.PORT;

connectDB().then(() => {
  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Khởi động Gmail Watcher
    // await initGmailWatcher();

    // Khởi động Model AI
    // await initModel();
  });
});