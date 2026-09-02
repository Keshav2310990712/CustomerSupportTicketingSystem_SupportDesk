/**
 * Auto-triage engine: classifies urgency, department, and tags
 * based on keyword analysis of subject + description.
 */

const URGENCY_KEYWORDS = {
  critical: [
    'down', 'outage', 'breach', 'hacked', 'cannot login', 'data loss',
    'production', 'emergency', 'urgent', 'critical', 'broken', 'failure',
    'not working', 'crash', 'error 500', 'security',
  ],
  high: [
    'slow', 'performance', 'payment failed', 'charge', 'overcharged',
    'bug', 'wrong', 'incorrect', 'missing', 'lost', 'expired',
  ],
  medium: [
    'question', 'help', 'how to', 'confused', 'update', 'change',
    'modify', 'feature', 'request', 'problem', 'issue',
  ],
  low: ['feedback', 'suggestion', 'general', 'inquiry', 'info', 'thank'],
};

const DEPARTMENT_KEYWORDS = {
  billing: [
    'invoice', 'payment', 'charge', 'refund', 'subscription', 'billing',
    'price', 'cost', 'fee', 'receipt', 'overcharged', 'credit card',
  ],
  technical: [
    'bug', 'error', 'crash', 'login', 'password', 'api', 'integration',
    'server', 'database', 'code', 'deploy', 'outage', 'slow', 'performance',
    'not working', 'broken', 'feature',
  ],
  sales: [
    'pricing', 'plan', 'upgrade', 'downgrade', 'trial', 'demo',
    'purchase', 'buy', 'license', 'discount',
  ],
};

function classifyTicket(subject, description) {
  const text = `${subject} ${description}`.toLowerCase();

  // Urgency
  let urgency = 'low';
  for (const level of ['critical', 'high', 'medium', 'low']) {
    if (URGENCY_KEYWORDS[level].some((kw) => text.includes(kw))) {
      urgency = level;
      break;
    }
  }

  // Department
  let department = 'general';
  let maxMatches = 0;
  for (const [dept, keywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    const matches = keywords.filter((kw) => text.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      department = dept;
    }
  }

  // Tags
  const tags = [];
  if (urgency === 'critical' || urgency === 'high') tags.push('priority');
  if (text.includes('refund')) tags.push('refund');
  if (text.includes('password') || text.includes('login')) tags.push('access');
  if (text.includes('bug') || text.includes('error')) tags.push('bug');
  if (text.includes('billing') || text.includes('payment')) tags.push('billing');

  // SLA deadline based on urgency
  const slaHours = { critical: 2, high: 8, medium: 24, low: 72 };
  const slaDeadline = new Date(Date.now() + slaHours[urgency] * 60 * 60 * 1000);

  return { urgency, department, tags, slaDeadline };
}

module.exports = { classifyTicket };
