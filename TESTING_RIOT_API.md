# Testing Riot API Integration

This guide will help you test the Riot API integration for fetching League of Legends and Valorant match data.

## Prerequisites

1. **Backend server running**
2. **Riot API key in `.env` file** (already done)
3. **Authentication token** (Supabase access token)

## Step 1: Start the Backend Server

```bash
# From the project root
nx serve backend
```

The server should start on `http://localhost:3111` (or check the console output).

## Step 2: Get Your Authentication Token

You need a valid Supabase access token to test the endpoints. You can get this by:

### Option A: From Browser DevTools (if logged in)
1. Open your frontend app in the browser
2. Open DevTools (F12)
3. Go to Application/Storage → Local Storage
4. Look for Supabase auth token or check Network tab for API calls

### Option B: Login via Frontend
1. Start the frontend: `nx serve frontend`
2. Login to your account
3. The token will be stored in your browser's local storage

### Option C: Use Supabase Client (for testing)
You can use the Supabase client to get a session token programmatically.

## Step 3: Test the Endpoints

### Using cURL

Replace `YOUR_TOKEN` with your actual Supabase access token and `GameName#TagLine` with a real Riot username.

#### Test League of Legends

```bash
curl -X GET "http://localhost:3111/api/riot/league/last-match?riotUsername=GameName%23TagLine" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Note:** Replace `%23` with `#` in the URL, or use `-` instead of `#` in the username.

#### Test Valorant

```bash
curl -X GET "http://localhost:3111/api/riot/valorant/last-match?riotUsername=GameName%23TagLine" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Using the HTTP Test File

1. Open `apps/backend/src/app/riot/test-riot.http` in VS Code
2. Install the "REST Client" extension if you haven't already
3. Replace `YOUR_SUPABASE_ACCESS_TOKEN` with your actual token
4. Replace `YourGameName#TagLine` with a real Riot username
5. Click "Send Request" above each request

### Using Postman or Insomnia

1. Create a new GET request
2. URL: `http://localhost:3111/api/riot/league/last-match?riotUsername=GameName#TagLine`
3. Headers:
   - `Authorization: Bearer YOUR_TOKEN`
   - `Content-Type: application/json`
4. Send the request

## Step 4: Expected Responses

### Success Response (League of Legends)

```json
{
  "metadata": {
    "matchId": "AMERICAS_1234567890",
    "participants": ["puuid1", "puuid2", ...]
  },
  "info": {
    "gameCreation": 1234567890000,
    "gameDuration": 1800,
    "gameEndTimestamp": 1234567891800,
    "gameId": 1234567890,
    "gameMode": "CLASSIC",
    "gameName": "teambuilder-match-1234567890",
    "gameStartTimestamp": 1234567890000,
    "gameType": "MATCHED_GAME",
    "gameVersion": "13.24.1",
    "mapId": 11,
    "participants": [...],
    "platformId": "AMERICAS",
    "queueId": 420,
    "teams": [...]
  }
}
```

### Success Response (Valorant)

```json
{
  "metadata": {
    "matchid": "abc123-def456-ghi789",
    "map": "Ascent",
    "game_version": "release-08.01",
    "game_length": 1800,
    "game_start_patched": "2024-01-15T10:30:00Z",
    "rounds": [...],
    "season_id": "episode8-act1",
    "mode": "Competitive",
    "region": "na",
    "cluster": "na-central"
  },
  "players": {
    "all_players": [...],
    "red": [...],
    "blue": [...]
  },
  "teams": {
    "red": {...},
    "blue": {...}
  },
  "rounds": [...]
}
```

### Error Responses

#### 401 Unauthorized (No Token)
```json
{
  "statusCode": 401,
  "message": "No token provided"
}
```

#### 400 Bad Request (Invalid Username Format)
```json
{
  "statusCode": 400,
  "message": "Invalid Riot username format. Expected: gameName#tagLine or gameName-tagLine"
}
```

#### 404 Not Found (No Matches)
```json
{
  "statusCode": 404,
  "message": "No League of Legends matches found for GameName#TagLine"
}
```

#### 403 Forbidden (Invalid API Key)
```json
{
  "statusCode": 400,
  "message": "Invalid Riot API key or insufficient permissions"
}
```

## Step 5: Check Backend Logs

Watch the backend console for:
- ✅ Success: Match data retrieved
- ⚠️ Warning: `RIOT_API_KEY not found in environment variables` (means .env not loaded)
- ❌ Error: API errors, rate limits, or invalid responses

## Quick Test Without Authentication (Temporary)

If you want to test without authentication first, you can temporarily remove the `@UseGuards(AuthGuard)` decorator from the controller methods. **Remember to add it back for production!**

## Troubleshooting

### "RIOT_API_KEY not found"
- Check that `.env` file exists in `apps/backend/` or project root
- Verify the key is named `RIOT_API_KEY=...`
- Restart the backend server after adding the key

### "Invalid Riot API key"
- Your API key may have expired (development keys expire after 24 hours)
- Get a new key from https://developer.riotgames.com/
- Check if the key has the correct permissions

### "No matches found"
- The player may not have played any matches recently
- Verify the Riot username format is correct (`GameName#TagLine`)
- Check if the region parameter matches the player's region

### "Rate limit exceeded"
- Riot API has rate limits (100 requests per 2 minutes for development keys)
- Wait a few minutes before trying again

## Example Riot Usernames for Testing

You can use any valid Riot username in the format:
- `GameName#TagLine` (with #)
- `GameName-TagLine` (with -)

Make sure the player has played at least one match in the game you're testing!

