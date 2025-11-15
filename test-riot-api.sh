#!/bin/bash

# Test script for Riot API endpoints
# Usage: ./test-riot-api.sh <riotUsername>
# Example: ./test-riot-api.sh "YourGameName#TagLine"

ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsImtpZCI6InU2NDRISWRJS1RQaW53RzYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2N1bHNwZmRwY2Z5YnpyaGp5dHZmLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4NWE4MWZkNy1kYzVkLTQ2NTgtYWIwZi04MGRiNDM5NTU2NDkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzYzMjIzMzAzLCJpYXQiOjE3NjMyMTk3MDMsImVtYWlsIjoiYWxleHhwZXJpYW5AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9hcGkuZGljZWJlYXIuY29tLzYueC9hdmF0YWFhcnMvc3ZnP3NlZWQ9Z1Izbm4iLCJlbWFpbCI6ImFsZXh4cGVyaWFuQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6Ijg1YTgxZmQ3LWRjNWQtNDY1OC1hYjBmLTgwZGI0Mzk1NTY0OSIsInVzZXJuYW1lIjoiZ1Izbm4ifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc2MzIwMjQ4M31dLCJzZXNzaW9uX2lkIjoiMzliZDA1NjgtMjJkMi00MWY1LWE0M2MtMGQwN2NiZWU4NmVlIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.qkN406pVI57GsSlGfQzBP3ohiln123IUWLShCrHTkkc"
BASE_URL="http://localhost:3111/api"

if [ -z "$1" ]; then
    echo "Usage: $0 <riotUsername>"
    echo "Example: $0 'YourGameName#TagLine'"
    exit 1
fi

RIOT_USERNAME="$1"
# URL encode the username (replace # with %23)
ENCODED_USERNAME=$(echo "$RIOT_USERNAME" | sed 's/#/%23/g')

echo "=========================================="
echo "Testing Riot API Integration"
echo "=========================================="
echo "Riot Username: $RIOT_USERNAME"
echo ""

echo "1. Testing League of Legends Last Match..."
echo "-------------------------------------------"
curl -s -X GET "${BASE_URL}/riot/league/last-match?riotUsername=${ENCODED_USERNAME}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | jq '.' || echo "Error: Make sure jq is installed, or remove '| jq' to see raw JSON"

echo ""
echo ""
echo "2. Testing Valorant Last Match..."
echo "-------------------------------------------"
curl -s -X GET "${BASE_URL}/riot/valorant/last-match?riotUsername=${ENCODED_USERNAME}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | jq '.' || echo "Error: Make sure jq is installed, or remove '| jq' to see raw JSON"

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="

