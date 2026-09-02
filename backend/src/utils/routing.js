const User = require('../models/User');
const Ticket = require('../models/Ticket');

/**
 * Auto-assign ticket to the agent in the right department
 * with the fewest open tickets (load balancing).
 */
async function assignAgent(department) {
  try {
    // Find all active agents in this department
    const agents = await User.find({ role: 'agent', department, isActive: true });
    if (!agents.length) {
      // Fallback: any available agent
      const anyAgents = await User.find({ role: 'agent', isActive: true });
      if (!anyAgents.length) return null;
      return pickLeastLoaded(anyAgents);
    }
    return pickLeastLoaded(agents);
  } catch {
    return null;
  }
}

async function pickLeastLoaded(agents) {
  // Count open tickets per agent
  const counts = await Promise.all(
    agents.map(async (agent) => {
      const count = await Ticket.countDocuments({
        assignedAgent: agent._id,
        status: { $in: ['open', 'in-progress', 'pending'] },
      });
      return { agent, count };
    })
  );
  counts.sort((a, b) => a.count - b.count);
  return counts[0].agent;
}

module.exports = { assignAgent };
