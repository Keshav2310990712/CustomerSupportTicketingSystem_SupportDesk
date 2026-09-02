const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const Ticket   = require('../models/Ticket');
const { protect, requireRole } = require('../middleware/auth');
const { classifyTicket } = require('../utils/triage');
const { assignAgent }    = require('../utils/routing');

// ── Multer setup ─────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt)$/i.test(path.extname(file.originalname))
      ? cb(null, true)
      : cb(new Error('File type not allowed'));
  },
});

// Safe multer wrappers — never crash the server on bad multipart
const multerTicket = (req, res, next) => upload.array('attachments', 5)(req, res, (err) => { if (err) req.files = []; next(); });
const multerMsg    = (req, res, next) => upload.array('attachments', 3)(req, res, (err) => { if (err) req.files = []; next(); });

// ── STATIC routes (must be before /:id) ──────────────────────────────────────

// GET /api/tickets/my  — client's own tickets
router.get('/my', protect, requireRole('client'), async (req, res) => {
  try {
    const { status, urgency, page = 1, limit = 10 } = req.query;
    const filter = { client: req.user._id };
    if (status)  filter.status  = status;
    if (urgency) filter.urgency = urgency;
    const tickets = await Ticket.find(filter)
      .populate('assignedAgent', 'name email department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Ticket.countDocuments(filter);
    res.json({ tickets, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/tickets/agent  — agent's assigned queue
router.get('/agent', protect, requireRole('agent'), async (req, res) => {
  try {
    const { status, urgency, department, page = 1, limit = 20 } = req.query;
    const filter = { assignedAgent: req.user._id };
    if (status)     filter.status     = status;
    if (urgency)    filter.urgency    = urgency;
    if (department) filter.department = department;
    const tickets = await Ticket.find(filter)
      .populate('client', 'name email')
      .populate('assignedAgent', 'name email department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Ticket.countDocuments(filter);
    res.json({ tickets, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/tickets/all  — all tickets (agent)
router.get('/all', protect, requireRole('agent'), async (req, res) => {
  try {
    const { status, urgency, department, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)     filter.status     = status;
    if (urgency)    filter.urgency    = urgency;
    if (department) filter.department = department;
    const tickets = await Ticket.find(filter)
      .populate('client', 'name email')
      .populate('assignedAgent', 'name email department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Ticket.countDocuments(filter);
    res.json({ tickets, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/tickets/stats/overview  — dashboard stats
router.get('/stats/overview', protect, requireRole('agent'), async (req, res) => {
  try {
    const [total, open, inProgress, resolved, critical, escalated] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in-progress' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.countDocuments({ urgency: 'critical' }),
      Ticket.countDocuments({ escalated: true }),
    ]);
    const byDept = await Ticket.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }]);
    res.json({ total, open, inProgress, resolved, critical, escalated, byDept });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/tickets  — create ticket ───────────────────────────────────────
router.post('/', protect, requireRole('client'), multerTicket, async (req, res) => {
  try {
    const { subject, description } = req.body;
    if (!subject || !description)
      return res.status(400).json({ message: 'Subject and description are required' });

    const { urgency, department, tags, slaDeadline } = classifyTicket(subject, description);
    const agentDoc = await assignAgent(department);

    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname, path: f.path, mimetype: f.mimetype,
    }));

    const ticket = await Ticket.create({
      subject, description,
      client: req.user._id,
      assignedAgent: agentDoc?._id || null,
      urgency, department, tags, slaDeadline, attachments,
      status: 'open',
    });

    await ticket.populate(['client', 'assignedAgent']);

    res.status(201).json({
      ticket,
      acknowledgement: {
        message: `Your ticket #${ticket.ticketNumber} has been received and classified as ${urgency.toUpperCase()} priority. Our ${department} team will respond within the SLA window.`,
        ticketNumber: ticket.ticketNumber,
        urgency, department,
        assignedTo: agentDoc?.name || 'Unassigned',
        slaDeadline,
      },
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Dynamic /:id routes (AFTER all statics) ──────────────────────────────────

// GET /api/tickets/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('client', 'name email')
      .populate('assignedAgent', 'name email department')
      .populate('messages.sender', 'name role');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const isOwner = ticket.client._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'agent')
      return res.status(403).json({ message: 'Access denied' });
    res.json(ticket);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/tickets/:id/status
router.patch('/:id/status', protect, requireRole('agent'), async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    ticket.status = status;
    if (status === 'resolved') ticket.resolvedAt = new Date();
    await ticket.save();
    res.json({ message: 'Status updated', ticket });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH /api/tickets/:id/assign
router.patch('/:id/assign', protect, requireRole('agent'), async (req, res) => {
  try {
    const { agentId } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { assignedAgent: agentId },
      { new: true }
    ).populate('assignedAgent', 'name email department');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/tickets/:id/messages
router.post('/:id/messages', protect, multerMsg, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Message content is required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const isOwner = ticket.client.toString() === req.user._id.toString();
    const isAgent = req.user.role === 'agent';
    if (!isOwner && !isAgent) return res.status(403).json({ message: 'Access denied' });

    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname, path: f.path, mimetype: f.mimetype,
    }));

    ticket.messages.push({ sender: req.user._id, senderRole: req.user.role, content: content.trim(), attachments });

    if (isAgent && !ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
      if (ticket.status === 'open') ticket.status = 'in-progress';
    }

    await ticket.save();
    await ticket.populate('messages.sender', 'name role');
    res.status(201).json(ticket.messages[ticket.messages.length - 1]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
