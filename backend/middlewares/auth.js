import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';
import multer from "multer";

export const protect = async (req, res, next) => {
  let token;
//   if (process.env.DEV_KEY === 'true') { next(); return; }
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.account = await Account.findById(decoded._id).select('-password');
      req.account.token = token;
      next();
    } else {
      res.status(401).json({ ec: 401, em: 'Not authorized, no token' });
    }
  }
  catch (error) {
    console.error(error);
    res.status(401).json({ ec: 401, em: 'Not authorized, token failed' });
  }
};

export const admin = (req, res, next) => {
//   if (process.env.DEV_KEY === 'true') { next(); return; }
  if (req.account && req.account.role === 'Admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

export const staff = (req, res, next) => {
//   if (process.env.DEV_KEY === 'true') { next(); return; }
  if (req.account && req.account.role === 'Staff') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a staff' });
  }
};

export const staff_or_admin = (req, res, next) => {
//   if (process.env.DEV_KEY === 'true') { next(); return; }
  if (req.account && (req.account.role === 'Staff' || req.account.role === 'Admin')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a staff or admin' });
  }
};

export const staff_or_officer = (req, res, next) => {
//   if (process.env.DEV_KEY === 'true') { next(); return; }
  if (req.account && (req.account.role === 'Staff' || req.account.role === 'Officer')) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as a staff or officer' });
  }
};

export const officer = (req, res, next) => {
//   if (process.env.DEV_KEY === 'true') { next(); return; }
  if (req.account && req.account.role === 'Officer') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an officer' });
  }
};

// dùng memory để upload trực tiếp lên Supabase
const storage = multer.memoryStorage(); 
export const upload = multer({ storage });