#!/bin/bash

# ClannAI Video Player Package Installation Script
# This script helps set up the video player package in a new Next.js project

echo "🚀 ClannAI Video Player Package Installer"
echo "=========================================="

# Check if we're in a Next.js project
if [ ! -f "package.json" ]; then
    echo "❌ Error: No package.json found. Please run this script from your Next.js project root."
    echo "💡 To create a new Next.js project, run:"
    echo "   npx create-next-app@latest my-video-player --typescript --tailwind --eslint --app"
    exit 1
fi

# Check if src directory exists
if [ ! -d "src" ]; then
    echo "❌ Error: No src directory found. This script is designed for Next.js projects with src/ directory."
    exit 1
fi

echo "✅ Next.js project detected!"

# Install dependencies
echo "📦 Installing dependencies..."
npm install @tanstack/react-query hls.js lucide-react sonner @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toggle @radix-ui/react-separator class-variance-authority clsx tailwind-merge tailwindcss-animate

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Trying with --legacy-peer-deps..."
    npm install --legacy-peer-deps @tanstack/react-query hls.js lucide-react sonner @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toggle @radix-ui/react-separator class-variance-authority clsx tailwind-merge tailwindcss-animate
fi

echo "📁 Copying files..."

# Copy components
echo "  - Copying video player components..."
cp -r components/* src/components/ 2>/dev/null || echo "    ⚠️  Some component files may not exist"

# Copy hooks
echo "  - Copying hooks..."
cp -r hooks/* src/hooks/ 2>/dev/null || echo "    ⚠️  Some hook files may not exist"

# Copy types
echo "  - Copying types..."
cp -r types/* src/types/ 2>/dev/null || echo "    ⚠️  Some type files may not exist"

# Copy contexts
echo "  - Copying contexts..."
cp -r contexts/* src/contexts/ 2>/dev/null || echo "    ⚠️  Some context files may not exist"

# Copy lib
echo "  - Copying library files..."
cp -r lib/* src/lib/ 2>/dev/null || echo "    ⚠️  Some library files may not exist"

# Copy events to project root
echo "  - Copying event schemas..."
cp -r events/* ./ 2>/dev/null || echo "    ⚠️  Some event files may not exist"

# Copy config files
echo "  - Copying configuration files..."
cp config/components.json ./ 2>/dev/null || echo "    ⚠️  components.json not found"

echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update your tailwind.config.js with the configuration from README.md"
echo "2. Add the CSS variables to your globals.css (see README.md)"
echo "3. Wrap your app with QueryProvider from src/contexts/query-provider.tsx"
echo "4. Update API client configuration in src/lib/api-client.ts"
echo "5. Check README.md for detailed setup instructions"
echo ""
echo "🎮 Usage example:"
echo "import { VideoPlayerWithEvents } from '@/components/video-player/VideoPlayerWithEvents'"
echo ""
echo "Happy coding! 🚀" 