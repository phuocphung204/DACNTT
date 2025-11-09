const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { auth, isAdmin } = require('../middleware/auth');

// Protected routes (all users)
router.post('/', auth, requestController.createRequest);
router.get('/my-requests', auth, requestController.getMyRequests);
router.get('/:id', auth, requestController.getRequestById);
router.delete('/:id', auth, requestController.deleteRequest);

// Admin only routes
router.get('/', auth, isAdmin, requestController.getAllRequests);
router.put('/:id/status', auth, isAdmin, requestController.updateRequestStatus);
router.get('/statistics/overview', auth, isAdmin, requestController.getStatistics);

module.exports = router;
