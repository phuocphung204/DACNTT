# Tổng quan Hệ thống - System Overview

## 📌 Mô tả Project

Hệ thống xử lý yêu cầu email sinh viên cho trường đại học được xây dựng bằng **Node.js**, **React**, và **MongoDB**. Hệ thống cho phép sinh viên gửi các yêu cầu hỗ trợ và quản trị viên quản lý, xử lý các yêu cầu đó.

## 🏗️ Kiến trúc Hệ thống

```
┌─────────────────┐
│   React Client  │  (Port 3000)
│   - Login UI    │
│   - Dashboard   │
└────────┬────────┘
         │ HTTP/REST API
         ▼
┌─────────────────┐
│  Express Server │  (Port 5000)
│   - Auth API    │
│   - Request API │
└────────┬────────┘
         │ Mongoose
         ▼
┌─────────────────┐
│    MongoDB      │  (Port 27017)
│   - users       │
│   - requests    │
└─────────────────┘
```

## 📊 Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  fullName: String,
  studentId: String,
  role: String (enum: 'student', 'admin'),
  department: String,
  createdAt: Date
}
```

### EmailRequest Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  subject: String,
  category: String (enum: 'academic', 'administrative', 'scholarship', 'accommodation', 'transcript', 'certificate', 'other'),
  description: String,
  priority: String (enum: 'low', 'medium', 'high', 'urgent'),
  status: String (enum: 'pending', 'in-progress', 'resolved', 'rejected'),
  response: {
    message: String,
    respondedBy: ObjectId (ref: User),
    respondedAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

## 🔄 Luồng hoạt động (Workflow)

### Luồng Sinh viên:
1. Đăng ký tài khoản mới hoặc đăng nhập
2. Truy cập dashboard sinh viên
3. Tạo yêu cầu mới với thông tin:
   - Tiêu đề
   - Danh mục (Học vụ, Hành chính, etc.)
   - Mô tả chi tiết
   - Mức độ ưu tiên
4. Theo dõi trạng thái yêu cầu
5. Xem phản hồi từ quản trị viên

### Luồng Quản trị viên:
1. Đăng nhập với tài khoản admin
2. Xem dashboard với thống kê tổng quan
3. Lọc yêu cầu theo trạng thái/danh mục
4. Xem chi tiết yêu cầu
5. Cập nhật trạng thái và gửi phản hồi
6. Quản lý tất cả yêu cầu trong hệ thống

## 🔐 Security Features

1. **Password Hashing**: Sử dụng bcryptjs với salt rounds
2. **JWT Authentication**: Token-based authentication với expiration
3. **Protected Routes**: Middleware kiểm tra authentication
4. **Role-Based Access Control**: Phân quyền admin/student
5. **CORS Configuration**: Giới hạn cross-origin requests
6. **Input Validation**: Validate dữ liệu đầu vào

## 📁 Cấu trúc File chi tiết

```
DACNTT/
│
├── server/                          # Backend source code
│   ├── controllers/                 # Request handlers
│   │   ├── authController.js        # Authentication logic
│   │   └── requestController.js     # Request management logic
│   │
│   ├── models/                      # MongoDB schemas
│   │   ├── User.js                  # User model
│   │   └── EmailRequest.js          # Request model
│   │
│   ├── routes/                      # API routes
│   │   ├── auth.js                  # Auth endpoints
│   │   └── requests.js              # Request endpoints
│   │
│   ├── middleware/                  # Custom middleware
│   │   └── auth.js                  # JWT verification
│   │
│   └── index.js                     # Express server entry point
│
├── client/                          # Frontend source code
│   ├── public/                      # Static files
│   │   ├── index.html
│   │   └── favicon.ico
│   │
│   └── src/
│       ├── components/              # Reusable components
│       │   ├── Navbar.js            # Navigation bar
│       │   └── Navbar.css
│       │
│       ├── pages/                   # Page components
│       │   ├── Login.js             # Login/Register page
│       │   ├── Login.css
│       │   ├── StudentDashboard.js  # Student view
│       │   ├── StudentDashboard.css
│       │   ├── AdminDashboard.js    # Admin view
│       │   └── AdminDashboard.css
│       │
│       ├── context/                 # Context providers
│       │   └── AuthContext.js       # Authentication context
│       │
│       ├── services/                # API services
│       │   └── api.js               # Axios configuration
│       │
│       ├── App.js                   # Main app component
│       ├── App.css                  # Global styles
│       └── index.js                 # React entry point
│
├── scripts/                         # Utility scripts
│   └── seedData.js                  # Database seeding
│
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
├── package.json                     # Backend dependencies
├── README.md                        # Main documentation
├── QUICKSTART.md                    # Quick start guide
└── DEPLOYMENT.md                    # Deployment guide
```

## 🚀 API Endpoints

### Authentication
```
POST   /api/auth/register     - Đăng ký user mới
POST   /api/auth/login        - Đăng nhập
GET    /api/auth/me           - Lấy thông tin user (protected)
```

### Requests (Student)
```
POST   /api/requests                    - Tạo yêu cầu mới (protected)
GET    /api/requests/my-requests        - Lấy yêu cầu của mình (protected)
GET    /api/requests/:id                - Xem chi tiết yêu cầu (protected)
DELETE /api/requests/:id                - Xóa yêu cầu (protected)
```

### Requests (Admin)
```
GET    /api/requests                    - Lấy tất cả yêu cầu (admin)
PUT    /api/requests/:id/status         - Cập nhật trạng thái (admin)
GET    /api/requests/statistics/overview - Thống kê (admin)
```

## 🎨 UI/UX Features

### Login/Register Page
- Toggle giữa đăng nhập và đăng ký
- Form validation
- Error messaging
- Gradient background

### Student Dashboard
- Card-based request display
- Color-coded status badges
- Priority indicators
- Request creation form
- Response viewing

### Admin Dashboard
- Statistics overview cards
- Filter by status/category
- Tabular request list
- Expandable detail rows
- Status update interface
- Response messaging system

## ⚙️ Configuration

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/university_email_system
PORT=5000
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 📦 Dependencies

### Backend
- express: Web framework
- mongoose: MongoDB ODM
- bcryptjs: Password hashing
- jsonwebtoken: JWT authentication
- cors: CORS middleware
- dotenv: Environment variables

### Frontend
- react: UI library
- react-router-dom: Routing
- axios: HTTP client

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration works
- [ ] User login works
- [ ] JWT token is stored and used
- [ ] Student can create requests
- [ ] Student can view own requests
- [ ] Admin can view all requests
- [ ] Admin can update request status
- [ ] Admin can send responses
- [ ] Filters work correctly
- [ ] Statistics display correctly

### Sample Test Users
```
Admin:
  Email: admin@university.edu
  Password: admin123

Student 1:
  Email: student1@university.edu
  Password: student123
```

## 🔧 Development Commands

```bash
# Install dependencies
npm install
cd client && npm install

# Run development mode
npm run dev

# Run backend only
npm run server

# Run frontend only
cd client && npm start

# Seed database
npm run seed

# Build frontend
npm run build
```

## 📈 Future Enhancements

Tính năng có thể mở rộng:
- [ ] Upload file đính kèm
- [ ] Email notifications
- [ ] Real-time updates (WebSocket)
- [ ] Request comments/discussion
- [ ] Request assignment to specific admins
- [ ] Advanced search và filtering
- [ ] Export reports (PDF, Excel)
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Request templates
- [ ] Analytics dashboard
- [ ] Automated responses cho common requests

## 🐛 Known Issues & Limitations

1. File upload chưa được implement
2. Email notification chưa active
3. Chưa có pagination cho danh sách yêu cầu
4. Chưa có rate limiting
5. Chưa có comprehensive error logging

## 📞 Support & Contact

Để được hỗ trợ hoặc báo lỗi, vui lòng tạo issue trên GitHub repository.

---

**Last Updated**: 2024
**Version**: 1.0.0
**License**: MIT
