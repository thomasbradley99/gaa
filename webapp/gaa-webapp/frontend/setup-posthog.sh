#!/bin/bash

# PostHog Setup Script for GAA Webapp
# This script helps you set up PostHog environment variables

echo "📊 PostHog Setup for GAA Webapp"
echo "================================"
echo ""
echo "You need a PostHog API key. Get it from:"
echo "https://us.i.posthog.com/project/settings"
echo ""
echo "1. Create a new project (name it 'GAA Webapp' or 'gaa.clannai.com')"
echo "2. Copy the Project API Key (starts with 'phc_')"
echo ""
read -p "Paste your PostHog API key here: " POSTHOG_KEY

if [ -z "$POSTHOG_KEY" ]; then
  echo "❌ No key provided. Exiting."
  exit 1
fi

# Check if .env.local already exists and preserve existing vars
ENV_FILE=".env.local"
TEMP_FILE=$(mktemp)

if [ -f "$ENV_FILE" ]; then
  echo ""
  echo "📝 Found existing .env.local - will preserve existing variables"
  echo ""
  
  # Read existing file and preserve all non-PostHog variables
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments (but preserve them)
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
      echo "$line" >> "$TEMP_FILE"
    # Skip existing PostHog variables (we'll add new ones)
    elif [[ ! "$line" =~ ^NEXT_PUBLIC_POSTHOG ]]; then
      echo "$line" >> "$TEMP_FILE"
    fi
  done < "$ENV_FILE"
  
  # Add PostHog section
  echo "" >> "$TEMP_FILE"
  echo "# PostHog Analytics" >> "$TEMP_FILE"
  echo "NEXT_PUBLIC_POSTHOG_KEY=$POSTHOG_KEY" >> "$TEMP_FILE"
  echo "NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com" >> "$TEMP_FILE"
  
  mv "$TEMP_FILE" "$ENV_FILE"
else
  # Create new .env.local
  cat > "$ENV_FILE" << EOF
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5011

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=$POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EOF
fi

echo ""
echo "✅ Created/updated .env.local with your PostHog key!"
echo ""
echo "Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Check browser console for: '✅ PostHog initialized successfully'"
echo ""
echo "For production, add these to Vercel environment variables:"
echo "  NEXT_PUBLIC_POSTHOG_KEY=$POSTHOG_KEY"
echo "  NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com"

