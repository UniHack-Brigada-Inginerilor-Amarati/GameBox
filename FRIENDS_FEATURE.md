# Friends Feature Implementation

This document describes the friends feature that has been implemented for the GameBox application.

## Overview

The friends feature allows users to:
- Search for other users by username or email
- Send friend requests to other users
- Accept or reject incoming friend requests
- View their list of friends
- Remove friends from their list

## Database Schema

The feature requires two new tables in Supabase:

1. **friend_requests** - Stores pending, accepted, and rejected friend requests
2. **friends** - Stores bidirectional friend relationships

### Setup Instructions

1. Open your Supabase SQL Editor
2. Run the SQL migration file: `database/friends_schema.sql`
3. This will create:
   - The `friend_requests` table
   - The `friends` table
   - Necessary indexes for performance
   - Row Level Security (RLS) policies
   - Triggers for auto-updating timestamps

## Backend Implementation

### Module Structure
- **Location**: `apps/backend/src/app/friends/`
- **Files**:
  - `friends.service.ts` - Business logic for friends operations
  - `friends.controller.ts` - REST API endpoints
  - `friends.module.ts` - NestJS module configuration

### API Endpoints

All endpoints require authentication (AuthGuard).

- `GET /friends/search?q={query}&limit={limit}` - Search for users
- `POST /friends/requests/:userId` - Send a friend request
- `POST /friends/requests/:requestId/accept` - Accept a friend request
- `POST /friends/requests/:requestId/reject` - Reject a friend request
- `DELETE /friends/requests/:requestId` - Cancel a sent friend request
- `GET /friends` - Get all friends
- `GET /friends/requests` - Get friend requests (sent and received)
- `DELETE /friends/:friendId` - Remove a friend

## Frontend Implementation

### Module Structure
- **Location**: `apps/frontend/src/app/friends/`
- **Components**:
  - `friends-page` - Main page with tabs
  - `user-search` - Search and add friends component
  - `friends-list` - Display list of friends
  - `friend-requests` - Manage friend requests

### Service
- **Location**: `apps/frontend/src/app/friends/services/friends.service.ts`
- Provides methods to interact with the friends API

### Routing
- **Route**: `/friends`
- **Guard**: Requires authentication (AuthGuard)
- Access the friends page at: `http://localhost:3112/friends`

## Features

### User Search
- Real-time search with debouncing (300ms)
- Search by username or email
- Shows friend status for each user:
  - Already friends
  - Pending request (sent by you)
  - Pending request (received from them)
  - Can send request

### Friends List
- Displays all friends with avatars
- Shows when friendship was created
- Option to remove friends

### Friend Requests
- Two tabs: "Received" and "Sent"
- Accept/Reject received requests
- Cancel sent requests
- Shows request timestamps

## Shared Types

New types added to `libs/shared/src/lib/friend.ts`:
- `FriendRequest` - Friend request data
- `FriendRequestStatus` - Enum: pending, accepted, rejected
- `Friend` - Friend relationship data
- `FriendWithProfile` - Friend with user profile info
- `FriendRequestWithProfile` - Request with user profile info
- `SearchUserResult` - Search result with friend status

## Next Steps

1. **Run the database migration**:
   ```sql
   -- Execute database/friends_schema.sql in Supabase SQL Editor
   ```

2. **Test the feature**:
   - Start the backend: `nx serve backend`
   - Start the frontend: `nx serve frontend`
   - Navigate to `/friends` in the browser
   - Test searching, sending requests, and managing friends

3. **Optional Enhancements**:
   - Add notifications for new friend requests
   - Add friend activity feed
   - Add ability to see mutual friends
   - Add friend suggestions based on common interests

## Notes

- The feature uses bidirectional friendships (both users have entries in the friends table)
- Friend requests are automatically cleaned up when accepted (status changes to 'accepted')
- All operations are protected by authentication
- The search requires at least 2 characters to prevent excessive queries

