import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import jwt from "jsonwebtoken";
import { socketStore } from "./services/socket.js";

// Load environment variables
dotenv.config();

const app = express();

// 1. Tạo HTTP Server chung
const server = http.createServer(app);
// 2. Gắn Socket.io vào server này
const io = socketStore.init(server);
// --- PHẦN QUAN TRỌNG: Middleware xác thực WebSocket ---
// Chạy mỗi khi có client cố gắng kết nối
io.use((socket, next) => {
  // Client sẽ gửi token qua object "auth" lúc connect
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: Token missing"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.account = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});
// --- PHẦN XỬ LÝ KẾT NỐI ---
io.on("connection", (socket) => {
  const userId = socket.account._id; // Lấy từ middleware ở trên
  console.log(`User ${userId} đã kết nối (Socket ID: ${socket.id})`);
  // 3. Gom User vào "Room" riêng biệt
  // Room này đặt tên theo User ID để Backend dễ dàng tìm và gửi tin
  socket.join(`account_room_${userId}`);

  socket.on(SOCKET_EVENTS.JOIN_ROOM, (room_id) => {
    console.log(`User ${userId} tham gia room ${room_id}`);
    socket.join(room_id);
  });
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (room_id) => {
    console.log(`User ${userId} rời khỏi room ${room_id}`);
    socket.leave(room_id);
  });

  socket.on("disconnect", () => {
    console.log(`User ${userId} đã ngắt kết nối`);
  });
});

import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import departmentRoutes from "./routes/departments.js";
import requestRoutes from "./routes/requests.js";
import requestConversationRoutes from "./routes/request-conversation.js";
import dashboardRoutes from "./routes/dashboard.js";
import notificationRoutes from "./routes/notifications.js";
import { startListening } from "./services/gmail-chat.js";
import { SOCKET_EVENTS } from "./_variables.js";

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// CORS configuration
// console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
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
    // console.log(`MongoDB Connected: ${conn.connection.host}`);
    // console.log(`Database Name: ${conn.connection.name}`);
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
app.use("/api/requests", requestConversationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  // console.log("có lỗi")
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
  server.listen(PORT, async () => {
    // console.log(`Server running on port ${PORT}`);

    // Khởi động Model AI
    await initModel();
  });
});

startListening(); // Bắt đầu lắng nghe tin nhắn từ Pub/Sub
