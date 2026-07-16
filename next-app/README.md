# ST Carpooling Project

Welcome to the ST Carpooling Project! This is a modern, full-stack carpooling application built with Next.js (unified frontend and backend architecture), MongoDB, and Tailwind CSS. The app features intelligent route mapping, a custom "Green Impact" gamification system, dual-role user modes (Rider and Co-Rider), and a highly polished UI.

---

## 🛠 Tech Stack Overview
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Custom `server.js` (for Socket.io), Mongoose
- **Database:** MongoDB
- **Real-Time:** Socket.io (WebSockets)
- **Mobile & Location:** Capacitor, Leaflet, Ola Maps API

---

## 📂 Folder Structure

The project follows a modular, unified monorepo structure where the frontend (Next.js App Router) and backend (API routes + business logic modules) coexist.

```text
next-app/
├── package.json             # Project dependencies and npm scripts
├── server.js                # Custom Next.js server configuration (for Socket.io integration)
├── .env.local               # Environment variables (API keys, DB connection, Secrets)
├── src/
│   ├── app/                 # Next.js App Router (Frontend Pages & Backend APIs)
│   │   ├── (auth)/          # Authentication pages (Login, Register, Forgot Password)
│   │   ├── (protected)/     # Authenticated pages (Dashboard, Search, Ride Details, Bookings)
│   │   ├── api/v1/          # Backend REST API Routes (Unified within Next.js)
│   │   │   ├── auth/        # Auth endpoints (login, register, verify, OTPs)
│   │   │   ├── bookings/    # Booking management endpoints
│   │   │   ├── locations/   # Geocoding, map configurations, route calculations
│   │   │   ├── rides/       # Ride creation, search, and optimization
│   │   │   ├── users/       # User profiles, saved addresses, stats
│   │   │   └── vehicles/    # Vehicle registration and management
│   │   ├── globals.css      # Global stylesheet and Tailwind directives
│   │   └── layout.jsx       # Root layout component
│   │
│   ├── components/          # Reusable React UI Components
│   │   ├── mobile/          # Mobile-specific UI components (TicketCard, MobileNav, etc.)
│   │   └── ui/              # Generic UI elements (Buttons, Modals, Inputs)
│   │
│   ├── context/             # React Context Providers
│   │   └── AuthContext.jsx  # Manages user session, JWT tokens, and role modes
│   │
│   ├── hooks/               # Custom React Hooks
│   │   ├── useAuth.js       # Hook to access AuthContext easily
│   │   ├── useDebounce.js   # Debounce hook for search inputs
│   │   └── useDemoAnimation.js # Hook for rendering live map animations
│   │
│   ├── lib/                 # Core Library & Utilities
│   │   ├── db.js            # MongoDB connection logic
│   │   ├── api-wrapper.js   # Higher-Order wrapper for API error handling & validation
│   │   └── genderTheme.js   # Utility for dynamic UI theming based on user gender
│   │
│   ├── modules/             # Backend Business Logic & MongoDB Models
│   │   ├── auth/            # Auth services & token logic
│   │   ├── bookings/        # Booking model & service (booking requests, cancellations)
│   │   ├── locations/       # Location services (Mapbox/Ola Maps wrappers)
│   │   ├── rides/           # Ride model & service (Ride logic, search filtering)
│   │   ├── users/           # User model & service (Profile logic, Green Credits)
│   │   └── vehicles/        # Vehicle model & service
│   │
│   ├── scripts/             # Utility scripts
│   │   └── seedAdmin.ts     # Script to generate default admin accounts
│   │
│   └── socket/              # WebSockets
│       └── socketHandler.js # Socket.io configuration for real-time notifications
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ 
- MongoDB cluster (Atlas or local)
- API Keys (See Appendix below)

### Installation

1. Install all dependencies:
   ```bash
   npm install
   ```

2. Configure your Environment Variables:
   Create a `.env.local` file in the root directory and fill it out according to the API key references below.

3. **Database Seeding (Optional):**
   If you want to populate your database with initial admin data, run:
   ```bash
   npm run seed:admin
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   > **⚠️ WebSockets & Real-Time Setup Note:** You *must* use `npm run dev` (which executes `node server.js`) rather than the standard `next dev`. The custom `server.js` is required to run Socket.io alongside Next.js for real-time notifications.

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### 📱 Mobile App Build Instructions (Capacitor)
This project is equipped with Capacitor for native mobile app generation.
1. Make sure you have Android Studio (for Android) or Xcode (for iOS) installed.
2. Build the Next.js static export (ensure `output: 'export'` is set in `next.config.mjs` if doing a full native build):
   ```bash
   npm run build
   ```
3. Sync the web code to the native projects:
   ```bash
   npx cap sync
   ```
4. Open the respective IDE to run the app on an emulator or physical device:
   ```bash
   npx cap open android
   # or
   npx cap open ios
   ```

### 🐛 Common Troubleshooting
- **MongoDB Timeout Error?** Ensure your current IP address is whitelisted in your MongoDB Atlas Network Access settings.
- **Map Not Loading?** Verify that your `NEXT_PUBLIC_OLA_MAPS_API_KEY` is correct, hasn't expired, and doesn't have domain restrictions blocking `localhost`.
- **Real-Time Notifications Failing?** Make sure you started the app with `npm run dev` and not `next dev`.

---

## 🗺 User Guide & UI Walkthrough

When a user first logs in, the application is designed to smoothly guide them through the carpooling experience depending on whether they intend to drive (Rider) or catch a ride (Co-Rider).

### 1. First Login & Onboarding (`/welcome-setup`)
- **Initial Setup:** After creating an account, users are prompted to set up their Home and Office locations, and optionally upload a profile picture.
- **Role Selection:** Users declare if they have a car. If they do, they are granted a `hybrid` role (can drive AND ride). If not, they are restricted to the `passenger` role.

### 2. The Dashboard (`/drive`)
- **Green Impact Scoreboard:** The top of the dashboard highlights the user's "Green Impact"—displaying total CO2 emissions saved and their current level (e.g., "Seed", "Sapling", "Oak"). 
- **Quick Actions:** Large, accessible buttons prompt users to either **"Offer a Ride"** or **"Find a Ride"**.
- **Upcoming Activity:** A summary of upcoming confirmed rides so users immediately know their schedule.

### 3. Dual-Mode Interface (Rider vs Co-Rider)
The application distinctly separates the experience based on the user's current goal:
- **RIDER MODE (Offering a Ride):** 
  - Navigating to `/create-ride`, the user inputs their pickup and destination using the interactive map.
  - They set their departure time, date, and available seats. 
  - Once created, they monitor **"Incoming Requests"** on the Bookings page to approve or reject passengers.
- **CO-RIDER MODE (Finding a Ride):** 
  - Navigating to `/search`, the user sets their pickup point. The map displays available drivers nearby.
  - Users can filter by time and request a seat. They monitor the status (Pending/Confirmed/Waitlisted) in their Bookings tab.

### 4. Managing Bookings (`/bookings`)
The Bookings page is split into two modes (toggleable at the top):
- **Co-Rider Mode:** Shows the passenger's own requests (Upcoming, Pending, History). Passengers can cancel requests here.
- **Rider Mode:** Shows requests from other people wanting to join the driver's car. Drivers can accept or reject requests, and view the "Impact Analysis" (how much extra driving a detour will cost them) before making a decision.

---

## 🛠 Core Features & Code Architecture

This application is built with a highly interactive and gamified UX. Below is a breakdown of how the major features are implemented under the hood:

### 1. Route Mapping & Location Services
- **How it works:** When a Rider creates a ride, they input a pickup point and a destination. The system accurately maps the route and calculates the distance/duration.
- **Code Execution Flow:** 
  - The frontend (`AddressAutocomplete.jsx`) queries the backend API (`/api/v1/locations/autocomplete`) which securely forwards the request to **Ola Maps API**.
  - Once coordinates are confirmed via the `MapPreview` component (using `react-leaflet`), the frontend calls `/api/v1/routes/calculate`.
  - The backend calculates the polyline, distance, and time. This data is rigorously validated before saving to MongoDB in the `Ride` model. Addresses are treated only as display data; coordinates are the authoritative source of truth.

### 2. Ride Searching & Filtering (Co-Rider Mode)
- **How it works:** Co-riders search for rides matching their desired route and time.
- **Code Execution Flow:** 
  - The frontend sends the Co-rider's coordinates and search radius to `/api/v1/rides`.
  - In `ride.service.ts`, the backend performs a `$geoNear` spatial query using MongoDB's GeoJSON indexing to find rides starting near the user's pickup point.
  - The system dynamically filters out past rides by combining and parsing `journeyDate` and `journeyTime` into a Javascript Date object, ensuring only valid, upcoming rides are displayed.

### 3. Bookings & Impact Analysis
- **How it works:** When a Co-rider requests a seat, the Rider can review the request and see the "Impact" (how much extra distance/time the detour will take) before accepting.
- **Code Execution Flow:** 
  - A Booking is created in MongoDB (`booking.model.js`) with a `pending` status.
  - On the Rider's dashboard (`bookings/page.jsx`), the `calculateImpact` function dynamically calls `/api/v1/routes/calculate-multipoint`. 
  - The backend queries Ola Maps to compare the original route (Driver -> Office) against the detour route (Driver -> Passenger -> Office) and returns the differential (extra km / extra mins). 
  - Upon acceptance, `booking.service.ts` atomically decreases `availableSeats` in the Ride model and automatically cancels any other pending requests from that passenger to prevent duplicate bookings.

### 4. Green Credits Gamification System
- **How it works:** Users earn "Green Credits" for carpooling, directly tied to the amount of CO2 emissions saved.
- **Code Execution Flow:**
  - In `user.service.ts`, when a ride is completed, the system calculates the distance traveled.
  - This distance is multiplied by a predefined CO2 emission factor to calculate `carbonSaved`. 
  - These values are credited to both the Rider and the Co-rider's profiles, updating their lifetime stats and unlocking UI gamification elements.

### 5. Live Real-Time Animations (Demo Mode)
- **How it works:** For demonstration purposes, users can trigger a live simulation of a ride on the map.
- **Code Execution Flow:**
  - The custom React hook `useDemoAnimation.js` manages the animation loop using `requestAnimationFrame`.
  - It takes the encoded polyline of the route, decodes it into geographic points, and uses the Haversine formula to calculate distances between segments.
  - It linearly interpolates a fake car's position along the polyline based on elapsed time and updates the `react-leaflet` marker's latitude/longitude state, pausing for 4 seconds if it detects the car is within 50 meters of a passenger's pickup coordinates.

---

## 📖 Appendix

### 1. Authentication Information

The application uses **JWT (JSON Web Tokens)** for secure, stateless authentication.

**Authentication Flow:**
- **Login/Register**: When a user registers or logs in, the `/api/v1/auth/login` endpoint validates the credentials against MongoDB (using `bcrypt` to verify hashed passwords).
- **Token Generation**: A JWT is generated containing the user's `id` and `role`. 
- **Storage**: The token is sent to the client and stored in `localStorage` as `token`. 
- **Client Handling**: The `AuthContext` reads this token, fetches the user's profile (`/api/v1/users/me`), and wraps the entire application, providing user data and `roleMode` state (Passenger vs Driver) to all protected routes.
- **API Protection**: Every protected API route is wrapped with `apiHandler(..., { protect: true })`. This wrapper intercepts the request, checks the `Authorization: Bearer <token>` header, verifies it using `JWT_SECRET`, and attaches the decoded `user` object to the request context.

**Roles & Permissions:**
- `passenger`: Can only search for and book rides.
- `hybrid`: Can book rides (Co-Rider) AND create their own rides (Rider/Driver).
- `admin`: Superuser access (reserved for future admin dashboards).

---

### 2. Environment Variables & API Key References

The application requires specific environment variables to function properly. Below is the reference table of required keys and their purposes. 

> **Important**: Do not commit your actual passwords or production secrets to Git.

| Variable Name | Description | Example / Passcode |
|--------------|-------------|--------------------|
| `NEXT_PUBLIC_API_URL` | The base URL for client-side API requests during development. | `http://localhost:3000/api/v1` |
| `NEXT_PUBLIC_PROD_API_URL` | The base URL for client-side API requests in production. | `https://your-deployment.vercel.app/api/v1` |
| `MONGODB_URI` | Connection string for MongoDB. Must include credentials and database name. | `mongodb+srv://db_user:PYGf8dJpvS3IdE17@cluster0...` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens. Must be long and secure. | `super_secret_carpool_jwt_key_12345` |
| `JWT_EXPIRES_IN` | Duration until the user's token expires. | `7d` |
| `NODE_ENV` | Environment flag (`development` or `production`). | `development` |
| `OLA_MAPS_API_KEY` | Backend API Key for Ola Maps (Used for backend Geocoding & Routing). | `vwJ3eDhtcXs7m6sbReBSzLTL7ZOMMSDy1Nd7ilDU` |
| `NEXT_PUBLIC_OLA_MAPS_API_KEY` | Frontend API Key for Ola Maps (Used by client-side maps & autocomplete). | `vwJ3eDhtcXs7m6sbReBSzLTL7ZOMMSDy1Nd7ilDU` |
| `EMAIL_USER` | The SMTP email address used to send verification and notification emails. | `your_actual_email@gmail.com` |
| `EMAIL_PASSWORD` | The SMTP App Password (usually a 16-letter passcode without spaces). | `the_16_letter_code_without_spaces` |
| `DEMO_MODE_SECRET` | Secret passcode to unlock special demo features/animations on the backend. | `st-demo-2024` |
| `NEXT_PUBLIC_DEMO_MODE_SECRET` | Client-side passcode to trigger frontend demo mode UI features. | `st-demo-2024` |
| `FIRE_API_KEY` | External service integration key (if applicable to your configuration). | `d0c3d0b8-f518-4eac-8281-30ca436cc510` |

---

### 3. Features in Use & Current Limitations

**Disabled Features:**
- **Email-Based Verification:** Currently, the email verification system is disabled/bypassed. This is because the application lacks authorization to send automated emails to `@st.com` domain addresses (the corporate spam/security filters block them). Accounts can currently be used without going through the email OTP/verification loop until an official SMTP relay or domain whitelist is established.

---

### 4. 🚀 Future Roadmap / To-Do
- **SMTP Whitelisting:** Implement the official ST domain SMTP whitelist to re-enable secure email OTP verification.
- **Push Notifications:** Configure `@capacitor/push-notifications` to send native push notifications to mobile devices when a ride request is received.
- **Payment Gateway Integration:** Add an internal credit purchasing system or tie Green Credits to real-world rewards.
