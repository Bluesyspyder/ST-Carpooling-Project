# AGENTS.md - Carpooling ST Project

## Quick Start
```bash
# Server (API)
cd server && npm run dev

# Client (React + Vite)
cd client && npm run dev
```

## Architecture
- **Monorepo**: `client/` (React 18 + Vite) + `server/` (Node + Express + Mongoose)
- **Location System**: Smart address flow → Autocomplete (Mapbox) → MapPreview (Leaflet, draggable marker) → User confirms → Verified coordinates stored
- **Key principle**: Addresses are display data. Coordinates are authoritative. Never use raw address strings for routing.

## Critical Files
| Purpose | File |
|---------|------|
| Address autocomplete (reusable) | `client/src/components/AddressAutocomplete.jsx` |
| Single-location map with draggable marker | `client/src/components/MapPreview.jsx` |
| Legacy multi-field form (REMOVE) | `client/src/pages/Home/PincodeDirectionsMap.jsx` |
| Server geocoding/autocomplete | `server/src/modules/locations/` |
| Ride/Booking models (verified coords) | `server/src/modules/rides/ride.model.js`, `booking.model.js` |
| User saved/recent/frequent locations | `server/src/modules/users/user.model.js` |

## Location Flow (all pages)
```
AddressAutocomplete (search)
  → onChange returns {address, latitude, longitude}
  → MapPreview shows marker (interactive=true)
  → User drags marker → coordinates update live
  → User clicks "Confirm Location" → verified: true
  → Verified coords sent to backend
```

## Backend Validation Rules
- `ride.pickupLocation.verified === true` required for create ride
- `booking.pickupLocation.verified === true` required for booking
- Search rides: verification OPTIONAL
- Server validates: lat ∈ [-90,90], lng ∈ [-180,180]

## Environment Variables
```
server/.env:
  MAPBOX_TOKEN=pk.xxx
  MONGODB_URI=...
  JWT_SECRET=...
  VITE_ORS_API_KEY=... (optional, routing fallback)

client/.env:
  VITE_API_URL=http://localhost:5000/api
  VITE_MAPBOX_TOKEN=pk.xxx
  VITE_ORS_API_KEY=... (optional)
```

## Commands
```bash
# Server
cd server && npm run dev        # dev with nodemon
cd server && npm run lint       # eslint
cd server && npm test           # jest (if configured)

# Client
cd client && npm run dev        # Vite dev server
cd client && npm run build      # production build
cd client && npm run lint       # eslint
```

## Do Not Modify
- `server/src/modules/locations/map-providers.js` (Mapbox wrappers)
- `server/src/modules/users/user.service.js` (recordLocationUsage)
- `client/src/components/AddressAutocomplete.jsx` (works correctly)
- `client/src/components/MapPreview.jsx` (works correctly)
- `client/src/hooks/useCurrentLocation.js` (works correctly)

## Legacy Code to Remove
- `client/src/components/LocationConfirmationMap.jsx` (duplicate, react-leaflet)
- `mapbox.js` (root, legacy axios-based Mapbox service)
- `PincodeDirectionsMap.jsx` multi-field form (house/street/city/state/pincode)

## Testing Notes
- No test suite currently configured
- Manual verification: run both dev servers, test autocomplete → map → confirm flow