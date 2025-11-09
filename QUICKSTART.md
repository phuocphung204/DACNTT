# Quick Start Guide

## Hướng dẫn khởi động nhanh

### 1. Cài đặt MongoDB

#### Windows:
1. Tải MongoDB Community Server từ https://www.mongodb.com/try/download/community
2. Cài đặt và khởi động MongoDB service

#### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### 2. Clone và cài đặt project

```bash
git clone https://github.com/phuocphung204/DACNTT.git
cd DACNTT

# Cài đặt dependencies cho backend
npm install

# Cài đặt dependencies cho frontend
cd client
npm install
cd ..
```

### 3. Cấu hình môi trường

Tạo file `.env` trong thư mục gốc (copy từ .env.example):

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn:
```
MONGODB_URI=mongodb://localhost:27017/university_email_system
PORT=5000
JWT_SECRET=your_super_secret_key_here
CLIENT_URL=http://localhost:3000
```

### 4. Khởi động ứng dụng

#### Option 1: Chạy đồng thời Backend và Frontend
```bash
npm run dev
```

#### Option 2: Chạy riêng biệt
Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

### 5. Truy cập ứng dụng

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### 6. Tạo tài khoản Admin

Sau khi đăng ký tài khoản thông thường, kết nối MongoDB và chạy:

```javascript
// Sử dụng MongoDB Compass hoặc mongo shell
use university_email_system

// Cập nhật user thành admin
db.users.updateOne(
  { email: "admin@university.edu" },
  { $set: { role: "admin" } }
)
```

## Giải quyết lỗi thường gặp

### Lỗi: MongoDB connection failed
- Kiểm tra MongoDB đã được khởi động chưa
- Kiểm tra MONGODB_URI trong file .env

### Lỗi: Port already in use
- Thay đổi PORT trong file .env
- Hoặc kill process đang sử dụng port: `lsof -ti:5000 | xargs kill -9`

### Lỗi: Cannot find module
- Xóa folder node_modules và package-lock.json
- Chạy lại `npm install`

## Tính năng chính

### Sinh viên:
1. Đăng ký/Đăng nhập
2. Tạo yêu cầu mới
3. Xem danh sách yêu cầu của mình
4. Theo dõi trạng thái và phản hồi

### Admin:
1. Xem tất cả yêu cầu
2. Lọc theo trạng thái, danh mục
3. Cập nhật trạng thái yêu cầu
4. Gửi phản hồi cho sinh viên
5. Xem thống kê tổng quan

## API Testing

Sử dụng Postman hoặc curl để test API:

### Register:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "password123",
    "fullName": "Nguyen Van A",
    "studentId": "SV001",
    "department": "CNTT"
  }'
```

### Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "password123"
  }'
```

### Create Request (cần token):
```bash
curl -X POST http://localhost:5000/api/requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "subject": "Xin cấp bảng điểm",
    "category": "transcript",
    "description": "Em cần bảng điểm học kỳ 1 năm học 2023-2024",
    "priority": "medium"
  }'
```
