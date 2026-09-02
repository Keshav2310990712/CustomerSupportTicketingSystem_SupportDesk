const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['client', 'agent'] },
    content: { type: String, required: true },
    attachments: [{ filename: String, path: String, mimetype: String }],
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'pending', 'resolved', 'closed'],
      default: 'open',
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    department: {
      type: String,
      enum: ['billing', 'technical', 'general', 'sales'],
      default: 'general',
    },
    tags: [{ type: String }],
    attachments: [{ filename: String, path: String, mimetype: String }],
    messages: [messageSchema],
    slaDeadline: { type: Date },
    escalated: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    firstResponseAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate ticket number before saving
ticketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
