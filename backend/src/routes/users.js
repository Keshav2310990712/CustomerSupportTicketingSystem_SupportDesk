const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/users/agents — list all agents (for reassignment dropdown)
router.get('/agents', protect, requireRole('agent'), async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent', isActive: true }).select('name email department');
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
