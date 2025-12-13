import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
// import SmeeClient from 'smee-client';
import cors from "cors";
import morgan from "morgan";
// import { setGlobalDispatcher, Agent } from 'undici';

// Load environment variables
dotenv.config();

const app = express();

import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import departmentRoutes from "./routes/departments.js";
import requestRoutes from "./routes/requests.js";

// Undici global agent configuration
// setGlobalDispatcher(
//   new Agent({
//     headersTimeout: 0, // TẮT timeout headers
//     bodyTimeout: 0,
//   })
// );

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

// Connect to watch Gmail
// const watch_Gmail = async () => {
//   // Smee Client setup để chuyển tiếp url từ smee.io về máy cục bộ
//     const smee = new SmeeClient({
//       source: process.env.SMEE_CLIENT_URL, // URL của kênh Smee.io
//       target: process.env.SMEE_TARGET_URL, // URL đích trên máy cục bộ của bạn
//       logger: console
//     });

//     smee.start();
//     // Chuyển địa chỉ để subscription Pub/Sub của Gmail dùng được http://localhost:5000/api/requests/pubsub
//     // console.log(`Smee client started, forwarding events from ${process.env.SMEE_CLIENT_URL} to ${process.env.SMEE_TARGET_URL}`);

//     // Khởi động Gmail Watcher
//     await initGmailWatcher();
// }
// khởi động mô hình AI

connectDB().then(() => {
  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Connect to watch Gmail
    // await watch_Gmail();
    // Khởi động Gmail Watcher
    await initGmailWatcher();

    // Khởi động Model AI
    await initModel();
  });
});