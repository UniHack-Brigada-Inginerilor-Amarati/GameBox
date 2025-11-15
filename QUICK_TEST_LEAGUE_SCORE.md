# Quick Test Guide - League Score Page

## Prerequisites
1. Backend running: `nx serve backend`
2. Frontend running: `nx serve frontend`
3. Your profile has a Riot username configured

## Steps

### 1. Set Riot Username (if not set)
```bash
# Via API
curl -X PATCH "http://localhost:3111/api/profiles/me" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"riot_username": "YourGameName#TagLine"}'
```

Or update it in the frontend profile page.

### 2. Test the Page
1. Open browser: `http://localhost:3112/lol-score`
2. Login if needed
3. The page will automatically fetch and display your League score

### 3. Test via API (optional)
```bash
curl -X GET "http://localhost:3111/api/profiles/me/league-score" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Expected Result
- Page displays 6 ability scores (Mental Fortitude, Adaptability, Aim, Game Sense, Teamwork, Strategy)
- Scores range from -100 to 100
- Color-coded (green=good, blue=average, red=poor)
- Progress bars show visual representation

## Troubleshooting
- **No Riot username**: Set it in your profile first
- **No matches found**: Make sure you've played League recently
- **API errors**: Check that `RIOT_API_KEY` and `GEMINI_API_KEY` are set in backend `.env`

