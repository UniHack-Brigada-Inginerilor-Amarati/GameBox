# Testing League Score Calculation Service

This guide will help you test the League of Legends score calculation service that uses Gemini AI to analyze match performance.

## Prerequisites

1. **Backend server running**
2. **Riot API key** in `.env` file (`RIOT_API_KEY=...`)
3. **Gemini API key** in `.env` file (`GEMINI_API_KEY=...`)
4. **Authentication token** (Supabase access token)
5. **Riot username configured** in your user profile

## Step 1: Start the Backend Server

```bash
# From the project root
nx serve backend
```

The server should start on `http://localhost:3111` (or check the console output).

## Step 2: Configure Your Riot Username

Before testing, make sure your user profile has a Riot username configured:

1. **Via API** (if you have access):
   ```bash
   curl -X PATCH "http://localhost:3111/api/profiles/me" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"riot_username": "YourGameName#TagLine"}'
   ```

2. **Via Frontend**: Update your profile in the frontend application

## Step 3: Get Your Authentication Token

You need a valid Supabase access token to test the endpoints. You can get this by:

### Option A: From Browser DevTools (if logged in)
1. Open your frontend app in the browser
2. Open DevTools (F12)
3. Go to Application/Storage → Local Storage
4. Look for Supabase auth token (usually under `sb-<project-id>-auth-token` or similar)
5. Or check Network tab for API calls and copy the `Authorization` header value

### Option B: Login via Frontend
1. Start the frontend: `nx serve frontend`
2. Login to your account
3. The token will be stored in your browser's local storage

## Step 4: Test the Endpoint

### Using cURL

Replace `YOUR_TOKEN` with your actual Supabase access token.

```bash
# Basic request (uses default region: europe)
curl -X GET "http://localhost:3111/api/profiles/me/league-score" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

```bash
# With region parameter
curl -X GET "http://localhost:3111/api/profiles/me/league-score?region=europe" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Using the HTTP Test File

1. Open `apps/backend/src/app/profile/test-league-score.http` in VS Code
2. Install the "REST Client" extension if you haven't already
3. Replace `YOUR_SUPABASE_ACCESS_TOKEN` with your actual token
4. Click "Send Request" above each request

### Using Postman or Insomnia

1. Create a new GET request
2. URL: `http://localhost:3111/api/profiles/me/league-score`
3. Headers:
   - `Authorization: Bearer YOUR_TOKEN`
   - `Content-Type: application/json`
4. (Optional) Query Parameters:
   - `region`: `americas`, `europe`, or `asia` (default: `europe`)
5. Send the request

## Step 5: Expected Response

### Success Response

```json
{
  "mentalFortitudeComposure": 75,
  "adaptabilityDecisionMaking": 82,
  "aimMechanicalSkill": 68,
  "gameSenseAwareness": 90,
  "teamworkCommunication": 65,
  "strategy": 78
}
```

Each score ranges from **-100 to 100**, where:
- **Positive values** indicate good performance
- **Negative values** indicate poor performance
- **0** indicates neutral/average performance

### Error Responses

#### 401 Unauthorized (No Token)
```json
{
  "statusCode": 401,
  "message": "No token provided"
}
```

#### 400 Bad Request (No Riot Username)
```json
{
  "statusCode": 400,
  "message": "User does not have a Riot username configured. Please set your Riot username in your profile."
}
```

#### 404 Not Found (No Matches)
```json
{
  "statusCode": 404,
  "message": "No League of Legends matches found for YourGameName#TagLine"
}
```

#### 400 Bad Request (Gemini Not Configured)
```json
{
  "statusCode": 400,
  "message": "Gemini AI is not configured. Please set GEMINI_API_KEY environment variable."
}
```

## Step 6: Check Backend Logs

Watch the backend console for:
- ✅ Success: "Successfully calculated League match score"
- ⚠️ Warning: `GEMINI_API_KEY not found` or `RIOT_API_KEY not found`
- ❌ Error: API errors, rate limits, or invalid responses

## Troubleshooting

### "User does not have a Riot username configured"
- Make sure you've set your `riot_username` in your profile
- Use the PATCH endpoint to update your profile with a Riot username

### "GEMINI_API_KEY not found"
- Check that `.env` file exists in `apps/backend/` or project root
- Verify the key is named `GEMINI_API_KEY=...`
- Restart the backend server after adding the key

### "RIOT_API_KEY not found"
- Check that `.env` file exists in `apps/backend/` or project root
- Verify the key is named `RIOT_API_KEY=...`
- Restart the backend server after adding the key

### "No League of Legends matches found"
- The player may not have played any matches recently
- Verify the Riot username format is correct (`GameName#TagLine`)
- Check if the region parameter matches the player's region

### "Rate limit exceeded"
- Riot API has rate limits (100 requests per 2 minutes for development keys)
- Gemini API also has rate limits
- Wait a few minutes before trying again

### "AI analysis failed"
- Check that GEMINI_API_KEY is valid
- Check backend logs for detailed error messages
- Verify the match data is valid

## Example Test Flow

1. **Start backend**: `nx serve backend`
2. **Get auth token**: Login via frontend or get from browser DevTools
3. **Set Riot username** (if not already set):
   ```bash
   curl -X PATCH "http://localhost:3111/api/profiles/me" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"riot_username": "YourGameName#TagLine"}'
   ```
4. **Test score calculation**:
   ```bash
   curl -X GET "http://localhost:3111/api/profiles/me/league-score" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
5. **Check response**: You should receive a JSON object with 6 ability scores

## Notes

- The service automatically fetches your last League of Legends match
- It extracts your player data from the match
- Gemini AI analyzes your performance across 6 ability categories
- The analysis can take a few seconds depending on API response times
- Make sure you have played at least one League of Legends match recently

