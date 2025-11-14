# Internet Cafe Integration - Implementation Plan

## Project Description

**GameBox Internet Cafe** extends the existing GameBox gaming platform to support physical internet cafe locations. This integration allows players to:

- **Browse and discover** internet cafes in their area
- **Reserve gaming stations** at specific venues with time slots
- **Check in** when arriving at the cafe using QR codes
- **Track active sessions** with automatic time-based billing
- **Manage reservations** with real-time availability

For cafe owners, the system provides:

- **Venue management** dashboard to manage locations and stations
- **Real-time monitoring** of active gaming sessions
- **Reservation management** and availability tracking
- **Billing automation** with time-based cost calculation

This transforms GameBox from a purely digital gaming platform into a hybrid solution that bridges online reservations with physical gaming experiences at internet cafes.

## Overview

Extend GameBox to support physical internet cafe locations where players can reserve computers/stations, check in, and play games with time-based billing.

## Core Features

### 1. **Venue/Location Management**

- Multiple internet cafe locations
- Each location has:
  - Name, address, contact info
  - Operating hours
  - Pricing (per hour rates)
  - Available stations/computers
  - Amenities (food, drinks, etc.)

### 2. **Computer/Station Management**

- Track individual computers/stations at each location
- Station status: `available`, `reserved`, `in_use`, `maintenance`
- Station specifications (hardware, capabilities)
- Real-time availability tracking

### 3. **Location-Based Reservations**

- Extend existing reservation system to include:
  - Selected venue/location
  - Selected computer/station (optional)
  - Duration (hours)
  - Estimated cost
- Check-in system with QR codes
- Time tracking (start/end time)

### 4. **Check-in & Session Management**

- QR code generation for reservations
- Check-in when arriving at cafe
- Automatic session start/end tracking
- Overtime handling

### 5. **Billing & Payment**

- Time-based billing calculation
- Payment status tracking
- Receipt generation
- Payment integration (future)

### 6. **Admin Dashboard for Cafe Owners**

- Manage their location(s)
- View reservations and active sessions
- Manage stations/computers
- View analytics and revenue

## Database Schema

### Venues Table

```sql
CREATE TABLE gamebox.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  owner_id UUID REFERENCES auth.users(id),
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  operating_hours JSONB, -- { "monday": {"open": "09:00", "close": "22:00"}, ... }
  amenities TEXT[], -- ["wifi", "food", "drinks", "parking"]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Stations Table

```sql
CREATE TABLE gamebox.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES gamebox.venues(id) ON DELETE CASCADE,
  station_number TEXT NOT NULL, -- "Station 1", "PC-01", etc.
  name TEXT, -- Optional friendly name
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'in_use', 'maintenance')),
  specifications JSONB, -- {"cpu": "...", "gpu": "...", "ram": "..."}
  qr_code TEXT UNIQUE, -- Generated QR code for check-in
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id, station_number)
);
```

### Extended Reservations

Add to existing `reservations` table:

```sql
ALTER TABLE gamebox.reservations
  ADD COLUMN venue_id UUID REFERENCES gamebox.venues(id),
  ADD COLUMN station_id UUID REFERENCES gamebox.stations(id),
  ADD COLUMN duration_hours INTEGER DEFAULT 1,
  ADD COLUMN estimated_cost DECIMAL(10,2),
  ADD COLUMN check_in_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN check_out_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN actual_cost DECIMAL(10,2),
  ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded'));
```

### Active Sessions Table

```sql
CREATE TABLE gamebox.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES gamebox.reservations(id),
  venue_id UUID REFERENCES gamebox.venues(id),
  station_id UUID REFERENCES gamebox.stations(id),
  user_id UUID REFERENCES auth.users(id),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### Venues

- `GET /venues` - List all active venues
- `GET /venues/:id` - Get venue details
- `POST /venues` - Create venue (admin/owner only)
- `PUT /venues/:id` - Update venue (owner only)
- `GET /venues/:id/stations` - Get stations for venue

### Stations

- `GET /stations?venue_id=:id` - List stations for venue
- `GET /stations/:id` - Get station details
- `POST /stations` - Create station (owner/admin)
- `PUT /stations/:id` - Update station (owner/admin)
- `PATCH /stations/:id/status` - Update station status

### Extended Reservations

- `POST /reservations` - Create reservation (with venue/station)
- `POST /reservations/:id/check-in` - Check in to reservation
- `POST /reservations/:id/check-out` - Check out from reservation
- `GET /reservations/availability?venue_id=:id&date=:date` - Get available stations

### Active Sessions

- `GET /sessions/active?venue_id=:id` - Get active sessions
- `GET /sessions/active/:id` - Get session details
- `POST /sessions/active/:id/end` - End session

## Frontend Features

### For Players

1. **Venue Browser** - Browse available internet cafes
2. **Location-Based Reservation** - Select venue and station when booking
3. **Check-in Page** - Scan QR code or enter code to check in
4. **Active Session View** - See current session, time remaining, cost
5. **Check-out** - End session and view receipt

### For Cafe Owners

1. **Venue Dashboard** - Manage their venue(s)
2. **Station Management** - Add/edit/remove stations
3. **Reservations View** - See all reservations for their venue
4. **Active Sessions Monitor** - Real-time view of active sessions
5. **Analytics** - Revenue, popular times, station utilization

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)

- [ ] Database migrations for venues, stations, extended reservations
- [ ] Backend API for venues and stations
- [ ] Basic venue listing in frontend
- [ ] Extend reservation form to include venue selection

### Phase 2: Check-in System

- [ ] QR code generation for reservations
- [ ] Check-in/check-out endpoints
- [ ] Active session tracking
- [ ] Check-in UI for players

### Phase 3: Time Tracking & Billing

- [ ] Automatic time tracking
- [ ] Cost calculation
- [ ] Session management
- [ ] Receipt generation

### Phase 4: Admin Dashboard

- [ ] Venue owner registration
- [ ] Station management UI
- [ ] Active sessions monitor
- [ ] Basic analytics

### Phase 5: Enhancements

- [ ] Real-time availability updates (WebSockets)
- [ ] Payment integration
- [ ] Mobile app for check-in
- [ ] Advanced analytics

## Technical Considerations

### QR Code Generation

- Generate unique QR codes for each reservation
- Include reservation ID and check-in token
- Expire after reservation time

### Real-time Updates

- Use WebSockets for live station availability
- Update active sessions in real-time
- Notify users of reservation reminders

### Security

- RLS policies for venue/station data
- Owner verification for venue management
- Check-in token validation
- Prevent double check-ins

### Performance

- Index on venue_id, station_id, status
- Cache venue/station availability
- Optimize reservation queries

## Success Metrics

- Number of venues onboarded
- Reservations with venue selection
- Check-in success rate
- Average session duration
- Revenue per venue
