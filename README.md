# 🛡 ResolveHub — Customer Support Ticketing System

A full-stack MERN customer support platform where clients raise tickets and agents triage and resolve them.

## Tech Stack
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.IO, Multer, JWT
- **Frontend**: React 18, Vite, React Router v6, Axios, Socket.IO Client

---

## Features

### Core
| Feature | Details |
|---------|---------|
| **Auth & Roles** | JWT-based auth with `client` and `agent` roles. Protected routes per role. |
| **Ticket Intake** | Subject, description, file attachments. Auto-acknowledgement with ticket number on submit. |
| **Auto-Triage** | Keyword-based urgency (`critical/high/medium/low`) and department classification on submit. |
| **Auto-Routing** | Assigns ticket to least-loaded agent in the right department. |
| **SLA Deadlines** | Auto-computed: critical=2h, high=8h, medium=24h, low=72h. Breached tickets highlighted in red. |
| **REST API** | Full CRUD: create, list, detail, status update, reassign, messages, stats. |
| **Client Dashboard** | View own tickets, filter by status/urgency, paginated. |
| **Agent Dashboard** | My Queue + All Tickets view, filter by status/urgency/dept, quick status actions. |
| **Ticket Conversation** | Threaded messages between client and agent, with file attachments. |
| **Real-Time Updates** | Socket.IO emits `ticket:new`, `ticket:updated`, `ticket:message` live to all dashboards. |

---

## Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally on `mongodb://127.0.0.1:27017`

### 1. Install dependencies
```bash
# From project root
npm run install:all
```

### 2. Configure environment
Edit `backend/.env` if needed (default values work for local dev):
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/supportdesk
JWT_SECRET=supersecretjwt2024supportdesk
```

### 3. Start the backend
```bash
npm run dev:backend
# Runs on http://localhost:5000
```

### 4. Start the frontend (new terminal)
```bash
npm run dev:frontend
# Runs on http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | public | Register client or agent |
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/auth/me` | any | Current user profile |
| POST | `/api/tickets` | client | Submit ticket (multipart) |
| GET | `/api/tickets/my` | client | Client's own tickets |
| GET | `/api/tickets/agent` | agent | Agent's assigned tickets |
| GET | `/api/tickets/all` | agent | All tickets |
| GET | `/api/tickets/stats/overview` | agent | Dashboard stats |
| GET | `/api/tickets/:id` | any | Ticket detail |
| PATCH | `/api/tickets/:id/status` | agent | Update status |
| PATCH | `/api/tickets/:id/assign` | agent | Reassign agent |
| POST | `/api/tickets/:id/messages` | any | Add reply |
| GET | `/api/users/agents` | agent | List all agents |

---

## Auto-Triage Logic

Keywords in subject + description determine:
- **Urgency**: `critical` → outage/breach/crash, `high` → payment/bug, `medium` → question/issue, `low` → feedback
- **Department**: `billing` → invoice/refund, `technical` → bug/error/login, `sales` → pricing/upgrade
- **Tags**: auto-applied (priority, billing, bug, access, refund)
- **SLA**: deadline auto-set based on urgency

---

## Demo Flow

1. Register as a **Client** → Submit a ticket with "payment failed, urgent refund needed"
2. See acknowledgement with urgency=HIGH, dept=billing, assigned agent, SLA deadline
3. Register as an **Agent** (department: billing) → See ticket appear in dashboard
4. Click into ticket → Update status → Reply → Resolve
5. Client refreshes — sees "resolved" in real-time via Socket.IO
