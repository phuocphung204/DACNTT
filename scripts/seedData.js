const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../server/models/User');
const EmailRequest = require('../server/models/EmailRequest');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university_email_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✓ Connected to MongoDB'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Sample data
const sampleUsers = [
  {
    email: 'admin@university.edu',
    password: 'admin123',
    fullName: 'Admin System',
    role: 'admin',
    department: 'IT Department'
  },
  {
    email: 'student1@university.edu',
    password: 'student123',
    fullName: 'Nguyen Van A',
    studentId: 'SV001',
    role: 'student',
    department: 'Công nghệ thông tin'
  },
  {
    email: 'student2@university.edu',
    password: 'student123',
    fullName: 'Tran Thi B',
    studentId: 'SV002',
    role: 'student',
    department: 'Kinh tế'
  }
];

const sampleRequests = [
  {
    subject: 'Xin cấp bảng điểm học kỳ 1',
    category: 'transcript',
    description: 'Em cần bảng điểm học kỳ 1 năm học 2023-2024 để nộp hồ sơ học bổng.',
    priority: 'high',
    status: 'pending'
  },
  {
    subject: 'Xin giấy xác nhận sinh viên',
    category: 'certificate',
    description: 'Em cần giấy xác nhận sinh viên để làm thủ tục mở tài khoản ngân hàng.',
    priority: 'medium',
    status: 'resolved'
  },
  {
    subject: 'Đăng ký ký túc xá học kỳ 2',
    category: 'accommodation',
    description: 'Em muốn đăng ký phòng ký túc xá cho học kỳ 2 năm học 2023-2024.',
    priority: 'medium',
    status: 'in-progress'
  }
];

async function seedDatabase() {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await EmailRequest.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create users
    console.log('Creating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✓ Created user: ${user.email} (${user.role})`);
    }

    // Get student users for creating requests
    const students = createdUsers.filter(u => u.role === 'student');
    const admin = createdUsers.find(u => u.role === 'admin');

    // Create email requests
    console.log('Creating email requests...');
    for (let i = 0; i < sampleRequests.length; i++) {
      const requestData = {
        ...sampleRequests[i],
        userId: students[i % students.length]._id
      };

      // Add response to resolved request
      if (requestData.status === 'resolved') {
        requestData.response = {
          message: 'Giấy xác nhận đã được cấp. Sinh viên có thể đến phòng hành chính để nhận.',
          respondedBy: admin._id,
          respondedAt: new Date()
        };
      }

      const request = new EmailRequest(requestData);
      await request.save();
      console.log(`✓ Created request: ${request.subject}`);
    }

    console.log('\n=================================');
    console.log('✓ Database seeded successfully!');
    console.log('=================================');
    console.log('\nSample accounts:');
    console.log('\nAdmin:');
    console.log('  Email: admin@university.edu');
    console.log('  Password: admin123');
    console.log('\nStudent 1:');
    console.log('  Email: student1@university.edu');
    console.log('  Password: student123');
    console.log('\nStudent 2:');
    console.log('  Email: student2@university.edu');
    console.log('  Password: student123');
    console.log('=================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
