# Riot API Integration

This module provides integration with the Riot Games API to fetch match data for League of Legends and Valorant.

## Setup

1. **Set Environment Variable**

   Add the Riot API key to your environment variables:
   
   ```bash
   export RIOT_API_KEY=RGAPI-ef2f632e-d176-41ce-bbce-c7863f2e53e4
   ```
   
   Or create a `.env` file in the project root:
   ```
   RIOT_API_KEY=RGAPI-ef2f632e-d176-41ce-bbce-c7863f2e53e4
   ```

2. **Get Your API Key**

   If you need a new API key, visit: https://developer.riotgames.com/

## API Endpoints

### League of Legends

Get the last match for a player:

```
GET /api/riot/league/last-match?riotUsername=gameName#tagLine&region=americas
```

Or using path parameter:

```
GET /api/riot/league/last-match/gameName#tagLine?region=americas
```

**Parameters:**
- `riotUsername` (required): Riot username in format `gameName#tagLine` or `gameName-tagLine`
- `region` (optional): Region code (default: `americas`). Options: `americas`, `asia`, `europe`

### Valorant

Get the last match for a player:

```
GET /api/riot/valorant/last-match?riotUsername=gameName#tagLine&region=na
```

Or using path parameter:

```
GET /api/riot/valorant/last-match/gameName#tagLine?region=na
```

**Parameters:**
- `riotUsername` (required): Riot username in format `gameName#tagLine` or `gameName-tagLine`
- `region` (optional): Region code (default: `na`). Options: `na`, `eu`, `kr`, `ap`

## Authentication

All endpoints require authentication via the `AuthGuard`. Make sure to include your authentication token in the request headers.

## Example Usage

```bash
# League of Legends
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3111/api/riot/league/last-match?riotUsername=SummonerName#1234"

# Valorant
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3111/api/riot/valorant/last-match?riotUsername=PlayerName#5678"
```

## Response Format

### League of Legends Match

Returns a `LeagueMatch` object containing:
- `metadata`: Match metadata including match ID and participants
- `info`: Detailed match information including:
  - Game duration, creation time, end time
  - Game mode, type, version
  - Map ID, queue ID
  - Participants array with player stats
  - Teams array with team stats

### Valorant Match

Returns a `ValorantMatch` object containing:
- `metadata`: Match metadata including match ID, map, game version, etc.
- `players`: Player information (all players, red team, blue team)
- `teams`: Team statistics
- `rounds`: Round-by-round information

## Error Handling

The service handles various error cases:
- **404**: Player or match not found
- **403**: Invalid API key or insufficient permissions
- **400**: Invalid request format or missing parameters

## Notes

- The Riot API has rate limits. Be mindful of API usage.
- API keys expire after 24 hours for development keys.
- The service automatically handles username parsing (supports both `#` and `-` separators).

