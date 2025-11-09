# Deployment Guide - Hướng dẫn triển khai

## Triển khai lên Production

### 1. Triển khai trên Heroku

#### Backend (API):

1. Tạo tài khoản Heroku và cài đặt Heroku CLI
2. Tạo file `Procfile` trong thư mục gốc:
```
web: node server/index.js
```

3. Deploy backend:
```bash
heroku create your-app-name-api
heroku addons:create mongolab:sandbox
heroku config:set JWT_SECRET=your_production_secret
git push heroku main
```

#### Frontend:

1. Build React app:
```bash
cd client
npm run build
```

2. Deploy lên Netlify hoặc Vercel:
   - Drag and drop folder `build` vào Netlify
   - Hoặc connect GitHub repo với Vercel

3. Cập nhật biến môi trường:
```
REACT_APP_API_URL=https://your-app-name-api.herokuapp.com/api
```

### 2. Triển khai trên VPS (Ubuntu)

#### Cài đặt môi trường:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
sudo apt install -y mongodb

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

#### Clone và setup project:

```bash
# Clone repository
git clone https://github.com/phuocphung204/DACNTT.git
cd DACNTT

# Install dependencies
npm install
cd client && npm install && cd ..

# Create .env file
cp .env.example .env
# Edit .env với thông tin production
nano .env

# Build frontend
cd client && npm run build && cd ..
```

#### Chạy với PM2:

```bash
# Start backend với PM2
pm2 start server/index.js --name university-api

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Cấu hình Nginx:

```bash
sudo nano /etc/nginx/sites-available/university-email-system
```

Thêm nội dung:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /home/user/DACNTT/client/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/university-email-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Setup SSL với Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Triển khai trên Docker

#### Tạo Dockerfile cho Backend:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server ./server
COPY .env .env
EXPOSE 5000
CMD ["node", "server/index.js"]
```

#### Tạo Dockerfile cho Frontend:

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: .
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/university_email_system

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo-data:
```

Deploy:
```bash
docker-compose up -d
```

## Checklist trước khi deploy

- [ ] Cập nhật JWT_SECRET mạnh trong production
- [ ] Kiểm tra CORS configuration
- [ ] Set NODE_ENV=production
- [ ] Backup database trước khi deploy
- [ ] Test tất cả API endpoints
- [ ] Test frontend trên production build
- [ ] Setup monitoring và logging
- [ ] Configure firewall rules
- [ ] Setup SSL certificate
- [ ] Configure database backups
- [ ] Set up error tracking (Sentry)
- [ ] Configure rate limiting

## Environment Variables cho Production

```env
# MongoDB (Production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# Server
PORT=5000
NODE_ENV=production

# JWT
JWT_SECRET=super_strong_secret_key_minimum_32_characters

# CORS
CLIENT_URL=https://your-frontend-domain.com

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@university.edu
EMAIL_PASSWORD=app_specific_password
```

## Monitoring và Logs

### PM2 Logs:
```bash
pm2 logs university-api
pm2 monit
```

### Nginx Logs:
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### MongoDB Logs:
```bash
sudo tail -f /var/log/mongodb/mongod.log
```

## Backup Database

### Backup:
```bash
mongodump --uri="mongodb://localhost:27017/university_email_system" --out=/backup/$(date +%Y%m%d)
```

### Restore:
```bash
mongorestore --uri="mongodb://localhost:27017/university_email_system" /backup/20240101
```

## Troubleshooting

### Port already in use:
```bash
sudo lsof -ti:5000 | xargs kill -9
```

### PM2 not starting:
```bash
pm2 delete all
pm2 start server/index.js --name university-api
```

### Nginx configuration error:
```bash
sudo nginx -t
sudo systemctl status nginx
```
