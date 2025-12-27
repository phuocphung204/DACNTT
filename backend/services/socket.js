import { Server } from "socket.io";

let io = null;

export const socketStore = {
  // Hàm này được gọi 1 lần duy nhất ở file server.js
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
    });
    console.log("Socket.IO đã khởi tạo!");
    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error("Socket.IO chưa được khởi tạo! Hãy gọi init() trước.");
    }
    return io;
  },
};