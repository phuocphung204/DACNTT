const EmailRequest = require('../models/EmailRequest');

// Create a new email request
exports.createRequest = async (req, res) => {
  try {
    const { subject, category, description, priority } = req.body;

    const emailRequest = new EmailRequest({
      userId: req.user._id,
      subject,
      category,
      description,
      priority: priority || 'medium'
    });

    await emailRequest.save();

    res.status(201).json({
      message: 'Request created successfully',
      request: emailRequest
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create request', error: error.message });
  }
};

// Get all requests for current user
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await EmailRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('response.respondedBy', 'fullName email');

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
};

// Get all requests (admin only)
exports.getAllRequests = async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const requests = await EmailRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName email studentId department')
      .populate('response.respondedBy', 'fullName email');

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
};

// Get single request by ID
exports.getRequestById = async (req, res) => {
  try {
    const request = await EmailRequest.findById(req.params.id)
      .populate('userId', 'fullName email studentId department')
      .populate('response.respondedBy', 'fullName email');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if user is authorized to view this request
    if (req.user.role !== 'admin' && request.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ request });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch request', error: error.message });
  }
};

// Update request status (admin only)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status, responseMessage } = req.body;

    const request = await EmailRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = status;

    if (responseMessage) {
      request.response = {
        message: responseMessage,
        respondedBy: req.user._id,
        respondedAt: Date.now()
      };
    }

    await request.save();

    res.json({
      message: 'Request updated successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update request', error: error.message });
  }
};

// Delete request
exports.deleteRequest = async (req, res) => {
  try {
    const request = await EmailRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && request.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await EmailRequest.findByIdAndDelete(req.params.id);

    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete request', error: error.message });
  }
};

// Get statistics (admin only)
exports.getStatistics = async (req, res) => {
  try {
    const total = await EmailRequest.countDocuments();
    const pending = await EmailRequest.countDocuments({ status: 'pending' });
    const inProgress = await EmailRequest.countDocuments({ status: 'in-progress' });
    const resolved = await EmailRequest.countDocuments({ status: 'resolved' });
    const rejected = await EmailRequest.countDocuments({ status: 'rejected' });

    const byCategory = await EmailRequest.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      statistics: {
        total,
        byStatus: { pending, inProgress, resolved, rejected },
        byCategory
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
};
