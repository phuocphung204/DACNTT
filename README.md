# DACNTT

> **Trạng thái:** Dự án hiện **chưa sẵn sàng để public / triển khai production**.
>
> - Do xây dựng nhanh trên mail cá nhân và phải cần có các secrets/credentials để chạy các dịch vụ gmail API của google.
> - Có tích hợp Email/Gmail, Pub/Sub, Socket.IO và các khóa bí mật (secrets/credentials) liên quan.
> - Chỉ nên chạy trong môi trường **local/dev** hoặc mạng nội bộ.
> - Nếu dùng gmail workspace thì có thể triển khai đơn giản hơn trong nội bộ.

## Giới thiệu

Hệ thống quản lý yêu cầu (requests/tickets) gồm:

- **Backend**: Node.js + Express, MongoDB, Socket.IO, tích hợp Gmail API / PubSub (watch), Supabase (lưu trữ), scheduler.
- **Frontend**: React (CRA) + Redux Toolkit, Socket.IO client.

## Cấu trúc dự án

```
backend/   # API + Socket.IO + tích hợp Gmail/PubSub
frontend/  # React UI
```

## Yêu cầu môi trường

- Node.js 18+ (khuyến nghị)
- npm
- MongoDB (local hoặc remote)

> Nếu bật các tính năng Email/Gmail/PubSub/Supabase: cần cấu hình Google OAuth, Google Cloud Pub/Sub, Supabase keys…

## Cài đặt

### 1) Backend

```bash
cd backend
npm install
```

Tạo file `backend/.env` (xem mục **Biến môi trường**).

Chạy backend:

```bash
# chạy server (nodemon)
npm run start

# chạy dev (concurrently: smee.js + server.js)
npm run dev
```

> Lưu ý: `npm run dev` chạy thêm `smee.js`. Nếu bạn chưa cấu hình Gmail watcher / smee, có thể cần tắt hoặc cấu hình đầy đủ để tránh lỗi.

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

## Biến môi trường (backend)

Backend đọc cấu hình qua `dotenv` trong `backend/.env`.

### Bắt buộc (để chạy API cơ bản)

```env
PORT=5000
FRONTEND_URL=http://localhost:3000

MONGODB_URI=mongodb://127.0.0.1:27017/dacntt

JWT_SECRET=replace_me
RESET_PASSWORD_SECRET=replace_me

DEFAULT_PASSWORD=123456
MY_APP_NAME=DACNTT
```

### Email (reset password / gửi mail)

```env
# SMTP auth (Gmail SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# From address dùng trong email reset (hiện code dùng biến này)
EMAIL_account=your_email@gmail.com
```

### Supabase (upload/attachments nếu có)

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace_me
```

### Gmail watcher (email_ggapi) (tuỳ chọn)

```env
GOOGLE_CLIENT_ID=replace_me
GOOGLE_CLIENT_SECRET=replace_me
GOOGLE_CALLBACK_URL_LINK=http://localhost:5000/api/auth/google/callback
GOOGLE_REFRESH_TOKEN=replace_me

PROJECT_ID=replace_me
TOPIC_NAME=replace_me
```

### Smee (forward webhook) (tuỳ chọn)

```env
SMEE_CLIENT_URL=https://smee.io/xxxx
SMEE_TARGET_URL=http://localhost:5000/api/your-webhook-endpoint
```

### Gmail chat/PubSub (gmail-chat service) (tuỳ chọn)

```env
SANG_CLIENT_ID=replace_me
SANG_CLIENT_SECRET=replace_me
SANG_REDIRECT_URI=replace_me
```

> Ghi chú:
>
> - Repo hiện có `backend/services/secret.json` (service account) được import trực tiếp. **Không nên public** khi còn chứa credentials.
> - Một số cấu hình Pub/Sub/topic/subscription đang hard-code trong code. Khi triển khai thật cần chuẩn hoá sang biến môi trường.

## Scripts

### Backend (`backend/package.json`)

- `npm run dev`: chạy đồng thời `node smee.js` và `nodemon server.js`

### Frontend (`frontend/package.json`)

- `npm start`: chạy dev server (CRA)

## Ghi chú quan trọng (chưa production-ready)

- **Secrets/credentials**: cần chuyển toàn bộ secrets sang `.env`/secret manager và đảm bảo không commit.
- **Bảo mật**: cần rà soát CORS, JWT, cấu hình OAuth, logging và các endpoint trước khi public.
- **Hạ tầng**: Pub/Sub + Gmail watch cần quy trình cấp quyền, rotate token.

## License

Internal / học tập. (Chưa tối ưu cho public distribution.)
