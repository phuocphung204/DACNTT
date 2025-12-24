import { BASE_URL } from "services/axios-config";
import { io } from "socket.io-client";

// // Giả sử bạn đã login và có token
// const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTE2MzM0NGRkZjgyYmJlNTM1NWM1YzAiLCJpYXQiOjE3NjYyNTYzNzAsImV4cCI6MTc2NjM0Mjc3MH0.u9StnZZ26tXgMI501t4zI__fDzbsgUq61EcpYGETncQ";

// const socket = io(BASE_URL, {
//   auth: {
//     token: token
//   },
//   transports: ['websocket'] // Ép dùng websocket ngay lập tức để giảm độ trễ
// });

// socket.on("connect_error", (err) => {
//   console.log("Lỗi kết nối:", err.message); // Sẽ log ra "Authentication error..." nếu token sai
// });

// socket.on("new_notification", (data) => {
//   console.log("Có thông báo mới:", data);
//   // Code hiển thị popup/toast notification ở đây
// });

const SocketIoSetupPage = () => {
  return (
    <div>Socket.io Setup Page</div>
  );
}

export default SocketIoSetupPage;