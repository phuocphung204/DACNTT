# Hệ thống xử lý yêu cầu email cho Đại học

Hệ thống quản lý và xử lý yêu cầu từ email sinh viên cho hệ thống trường đại học, được xây dựng bằng **Node.js**, **React**, và **MongoDB**.

## 🚀 Tính năng

### Dành cho Sinh viên:
- ✅ Đăng ký và đăng nhập tài khoản
- ✅ Tạo yêu cầu hỗ trợ với nhiều danh mục (Học vụ, Hành chính, Học bổng, v.v.)
- ✅ Theo dõi trạng thái yêu cầu của mình
- ✅ Xem phản hồi từ quản trị viên
- ✅ Quản lý mức độ ưu tiên yêu cầu

### Dành cho Quản trị viên:
- ✅ Xem tất cả yêu cầu từ sinh viên
- ✅ Lọc yêu cầu theo trạng thái, danh mục
- ✅ Cập nhật trạng thái yêu cầu (Chờ xử lý, Đang xử lý, Đã giải quyết, Từ chối)
- ✅ Gửi phản hồi cho sinh viên
- ✅ Xem thống kê tổng quan

## 🛠️ Công nghệ sử dụng

### Backend:
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend:
- **React** - UI Library
- **React Router** - Navigation
- **Axios** - HTTP client
- **CSS3** - Styling

## 📋 Yêu cầu hệ thống

- Node.js >= 14.x
- MongoDB >= 4.x
- npm hoặc yarn

## ⚙️ Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/phuocphung204/DACNTT.git
cd DACNTT
```

### 2. Cài đặt dependencies

```bash
# Cài đặt dependencies cho backend
npm install

# Cài đặt dependencies cho frontend
cd client
npm install
cd ..
```

### 3. Cấu hình môi trường

Tạo file `.env` trong thư mục gốc và thêm các biến môi trường:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/university_email_system

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key_here

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_password

# CORS
CLIENT_URL=http://localhost:3000
```

### 4. Khởi động MongoDB

Đảm bảo MongoDB đang chạy trên máy của bạn:

```bash
# Linux/Mac
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 5. Chạy ứng dụng

#### Chạy Backend và Frontend riêng biệt:

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
cd client
npm start
```

#### Hoặc chạy đồng thời:
```bash
npm run dev
```

## 📱 Sử dụng

### Truy cập ứng dụng:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Tài khoản mẫu:

Để tạo tài khoản admin, bạn cần tạo user và thay đổi role trong database:

```javascript
// Kết nối MongoDB và chạy:
db.users.updateOne(
  { email: "admin@university.edu" },
  { $set: { role: "admin" } }
)
```

## 🗂️ Cấu trúc thư mục

```
DACNTT/
├── server/                 # Backend code
│   ├── controllers/        # Request handlers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   └── index.js           # Entry point
├── client/                # Frontend code
│   ├── public/            # Static files
│   └── src/
│       ├── components/    # React components
│       ├── pages/         # Page components
│       ├── context/       # Context providers
│       ├── services/      # API services
│       └── App.js         # Main app component
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore file
├── package.json          # Dependencies
└── README.md             # Documentation
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Requests
- `POST /api/requests` - Tạo yêu cầu mới
- `GET /api/requests/my-requests` - Lấy yêu cầu của user
- `GET /api/requests` - Lấy tất cả yêu cầu (Admin)
- `GET /api/requests/:id` - Lấy chi tiết yêu cầu
- `PUT /api/requests/:id/status` - Cập nhật trạng thái (Admin)
- `DELETE /api/requests/:id` - Xóa yêu cầu
- `GET /api/requests/statistics/overview` - Lấy thống kê (Admin)

## 🎨 Danh mục yêu cầu

- **academic** - Học vụ (đăng ký môn học, điểm số, lịch thi)
- **administrative** - Hành chính (giấy xác nhận, chứng minh)
- **scholarship** - Học bổng
- **accommodation** - Ký túc xá
- **transcript** - Bảng điểm
- **certificate** - Giấy chứng nhận
- **other** - Khác

## 📊 Trạng thái yêu cầu

- **pending** - Chờ xử lý
- **in-progress** - Đang xử lý
- **resolved** - Đã giải quyết
- **rejected** - Từ chối

## 🔒 Bảo mật

- Mật khẩu được hash bằng bcryptjs
- Authentication sử dụng JWT
- Protected routes với middleware
- CORS configuration
- Input validation

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo issue hoặc pull request.

## 📝 License

MIT License

## 👨‍💻 Tác giả

Phát triển bởi đội ngũ DACNTT

## 📞 Liên hệ

Nếu bạn có bất kỳ câu hỏi nào, vui lòng tạo issue trên GitHub.