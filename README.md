# Claw

[**Watch Demo Video**](https://drive.google.com/file/d/1m0GnKWsEB2v62Yfvt-0nliO3UThxiylF/view?usp=sharing)

**A mobile-first command center for solo practitioners. A CRM for solopreneurs.**

Claw is a full-stack Micro-SaaS application that unifies scheduling, client management, and business analytics into a single pocket-sized operations hub. Built for therapists, tutors, consultants, coaches, trainers, and freelancers who run their business solo.

---

## Problem Statement

### The Fragmented Reality of Solo Service Providers

The target user for Claw is what startup philosophy calls the "messy thinker" solopreneur—an individual optimistic about their capacity but bogged down by the operational chaos of running a one-person business.

Consider Sarah, a freelance math tutor. Her current workflow:

| Tool | Purpose | Problem |
|------|---------|---------|
| **WhatsApp** | Client communication & negotiation | No record of commitments made |
| **Google Calendar** | Tracking appointment dates | Disconnected from negotiation channel |
| **Excel/Notebook** | Client notes & payment tracking | Outdated, unsearchable, easy to lose |
| **Mental Memory** | Follow-ups & reminders | Unreliable and stressful |

This fragmented ecosystem leads to predictable operational failures:

**1. Double Bookings**
Because the negotiation channel (WhatsApp) is disconnected from the record channel (Calendar), Sarah often promises the same slot to two different clients. The embarrassment and rescheduling friction damages her professional reputation.

**2. Lost Revenue**
Without a dedicated tracking system, follow-ups for unpaid sessions slip through the cracks. "Ghost" bookings—where a client cancels but the slot isn't reopened—result in income that simply evaporates.

**3. Client Friction**
The back-and-forth negotiation of times ("Are you free Tuesday? How about Wednesday?") is unprofessional and high-friction. Each message exchange is a chance for the client to reconsider or ghost entirely.

**4. No Business Visibility & Missing Analytics**
Sarah cannot answer basic questions about her own business: "How much did I earn this month?" "Which clients haven't booked in a while?" "What's my busiest day?" This data exists nowhere.

### The Strategic Insight

Generic tools like Calendly exist but fail to address vertical-specific needs. They treat scheduling as an isolated problem rather than part of an integrated business workflow. The "riches are in the niches"—a specialized tool that understands the solopreneur workflow commands higher loyalty than a generic alternative.

**Claw is not just a calendar. It's a relational database of the user's entire business, accessible via a high-performance mobile interface.**

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React Native + Expo SDK 53 | Cross-platform mobile development |
| | TypeScript | Type safety and developer experience |
| | Expo Router | File-based navigation |
| | NativeWind | Tailwind CSS for React Native |
| | TanStack Query | Server state management & caching |
| **Backend** | Node.js + Express.js | RESTful API server |
| | JWT | Stateless authentication |
| | Nodemailer | Transactional emails (password reset) |
| | bcryptjs | Secure password hashing |
| **Database** | PostgreSQL via Supabase | Relational data with real-time capabilities |

### Why This Stack?

The architecture reflects the "market-first" philosophy: proven technologies that minimize execution risk. React Native enables a single codebase for iOS and Android. Express.js provides battle-tested API patterns. PostgreSQL handles the inherently relational data model (Users → Clients → Appointments → Services) with integrity constraints that prevent data corruption.

---

## Features Implemented

### Onboarding & Authentication

**Enables users to get started in under 30 seconds.**
- Account creation requires only email, password, and business name—no lengthy forms
- Secure JWT-based sessions persist across app restarts
- Password recovery via 6-digit email code (15-minute expiry) ensures users are never locked out

### Client Relationship Management

**Enables users to maintain a complete, searchable record of every client relationship.**
- Store client name, phone, email, and personal notes (preferences, allergies, important context)
- View the complete appointment history with any client in one tap
- Search clients instantly by name or phone number
- Initiate calls or WhatsApp messages directly from client profiles—no copying numbers

### Service Catalog Definition

**Enables users to define their offerings once and reuse them forever.**
- Create services with name, duration (minutes), and price (INR)
- Toggle services active/inactive without deleting historical data
- Services auto-populate during appointment booking—no retyping prices or durations

### Intelligent Appointment Scheduling

**Enables users to book appointments without the back-and-forth negotiation.**
- Select client → Pick service → Choose date & time in a single flow
- End time auto-calculates based on service duration
- Appointment status workflow: Pending → Confirmed → Completed/Cancelled
- Add contextual notes for special instructions or session prep

### Recurring Appointment Management

**Enables users to schedule regular clients without repetitive manual work.**
- Set recurrence frequency: Weekly, Bi-weekly, or Monthly
- Generate 2-12 future appointments in a single action
- Ideal for therapy sessions, tutoring schedules, coaching programs

### Daily Operations Dashboard

**Enables users to see their entire day at a glance.**
- Personalized greeting based on time of day and business name
- Today's appointments displayed as swipeable action cards
- Real-time revenue tracking: This week and this month
- Quick-action buttons for common tasks (add client, add service)

### Gesture-Based Appointment Management

**Enables users to update appointment status without leaving the dashboard.**
- Swipe right on any appointment card to mark as completed
- Swipe left to cancel
- Haptic feedback confirms every action
- Designed for one-handed, on-the-go operation

### WhatsApp-Native Client Reminders

**Enables users to send professional reminders without typing a single word.**
- One-tap reminder button on each appointment
- Pre-composed message includes client name, service, and appointment time
- Opens WhatsApp with message ready to send—just hit the arrow

### Business Analytics & Insights

**Enables users to answer "How is my business doing?" with actual data.**
- Revenue overview: This week, this month, all-time totals
- Trend comparison: Performance vs. last week/month (up or down?)
- Appointment completion rate percentage
- Total active clients and services count

### Inactive Client Recovery

**Enables users to identify and re-engage clients who've gone quiet.**
- Automatic list of clients with no appointments in 30+ days
- One-tap to initiate WhatsApp outreach
- Turns forgotten relationships into recovered revenue

### One-Handed Mobile-First Design

**Enables users to run their business while standing, walking, or between sessions.**
- Floating action buttons positioned at bottom-right for natural thumb reach
- Pull-to-refresh on every screen
- Haptic feedback on all interactions
- Tab-based navigation keeps everything within thumb's reach

---

## Project Structure

```
Claw/
├── app/                        # Screens (Expo Router file-based routing)
│   ├── (auth)/                 # Authentication flow
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   ├── (tabs)/                 # Main application tabs
│   │   ├── index.tsx           # Dashboard / Home
│   │   ├── clients/            # Client list and detail views
│   │   ├── services.tsx        # Service catalog
│   │   ├── analytics.tsx       # Business insights
│   │   └── settings.tsx        # Account settings
│   ├── appointments.tsx        # All appointments (filterable)
│   ├── new-appointment.tsx     # Appointment creation
│   ├── new-client.tsx          # Client creation/editing
│   ├── new-service.tsx         # Service creation/editing
│   └── help-support.tsx        # Contact and support
├── components/                 # Reusable UI components
├── context/                    # React Context (Authentication)
├── lib/                        # API client, query configuration
├── types/                      # TypeScript type definitions
├── backend/                    # Express.js API server
│   └── src/
│       ├── routes/             # API endpoint handlers
│       ├── middleware/         # Authentication middleware
│       ├── services/           # Email service
│       └── db.js               # Supabase client
└── README.md
```

---

## For contributors

New to the project? Read **[CONTRIBUTING.md](CONTRIBUTING.md)** — setup, the one command that runs
everything, what to do when it breaks, and the rules to keep in mind before changing code.

```bash
./scripts/dev.sh     # run the app on a USB-connected phone
```

## How to Run Locally

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Expo Go app installed on your mobile device
- A free Supabase account

### Step 1: Clone and Install Dependencies

```bash
git clone <repository-url>
cd Claw

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### Step 2: Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to the SQL Editor
3. Execute the following schema:

```sql
-- Core user accounts
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service offerings
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client records
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment bookings
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  date_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-app ratings
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Performance optimization
CREATE INDEX idx_appointments_user_date ON appointments(user_id, date_time);
CREATE INDEX idx_clients_user ON clients(user_id);
```

### Step 3: Configure Environment Variables

Create `backend/.env`:

```env
PORT=3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-secure-random-string

# For password reset emails (Gmail with App Password)
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

Update `lib/api.ts` with your machine's local IP address:

```typescript
const API_URL = 'http://YOUR_LOCAL_IP:3000/api';
```

Find your IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)

### Step 4: Start the Application

```bash
# Terminal 1: Start backend server
cd backend && npm run dev

# Terminal 2: Start Expo development server
npx expo start
```

Scan the QR code with Expo Go. Ensure your phone and computer are on the same WiFi network.

---

## API Documentation

**Base URL:** `http://localhost:3000/api`

**Authentication:** All protected endpoints require header:
```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Create new user account | No |
| POST | `/auth/login` | Authenticate and receive JWT | No |
| GET | `/auth/me` | Retrieve current user profile | Yes |
| PUT | `/auth/profile` | Update business name | Yes |
| PUT | `/auth/password` | Change account password | Yes |
| POST | `/auth/forgot-password` | Request password reset code | No |
| POST | `/auth/reset-password` | Reset password with code | No |

### Client Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/clients` | List all clients (supports `?search=`) | Yes |
| GET | `/clients/:id` | Get client with appointment history | Yes |
| POST | `/clients` | Create new client | Yes |
| PUT | `/clients/:id` | Update client details | Yes |
| DELETE | `/clients/:id` | Remove client | Yes |

### Service Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/services` | List all services | Yes |
| POST | `/services` | Create new service | Yes |
| PUT | `/services/:id` | Update service | Yes |
| DELETE | `/services/:id` | Remove service | Yes |

### Appointment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/appointments` | List all appointments | Yes |
| GET | `/appointments/today` | Get today's appointments | Yes |
| GET | `/appointments/stats` | Get revenue statistics | Yes |
| POST | `/appointments` | Create single appointment | Yes |
| POST | `/appointments/recurring` | Create recurring appointments | Yes |
| PATCH | `/appointments/:id/status` | Update appointment status | Yes |
| DELETE | `/appointments/:id` | Cancel/remove appointment | Yes |

### Analytics Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/analytics/overview` | Business performance summary | Yes |
| GET | `/analytics/inactive-clients` | Clients inactive 30+ days | Yes |

### Rating Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/ratings` | Submit app rating (1-5) | Yes |
| GET | `/ratings/me` | Get current user's rating | Yes |

---

## Design Philosophy

Claw follows the "market-first" methodology: rather than inventing new behaviors, it digitizes and optimizes existing ones—replacing the Excel spreadsheets, physical diaries, and fragmented WhatsApp threads that solo practitioners already use. By "copying" the fundamental utility of booking systems but refining them for mobile-first, one-handed operation, the project eliminates market risk and focuses entirely on execution excellence.

The application embodies the "boring but profitable" philosophy—solving a specific, tangible problem (scheduling + client context) rather than attempting broad innovation. Users pay for tools that help them make money or save time, and Claw does both.

---

## License

MIT
