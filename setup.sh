#!/bin/bash

# LinkedIn Sales Navigator Integration - Setup Script

echo "🚀 Setting up LinkedIn Sales Navigator Integration Chrome Extension..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the extension
echo "🔨 Building extension for development..."
npm run dev

if [ $? -eq 0 ]; then
    echo "✅ Extension built successfully"
else
    echo "❌ Failed to build extension"
    exit 1
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Open Chrome and go to: chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist' folder from this project"
echo "5. The extension will appear in your extensions list"
echo ""
echo "📁 Extension files are in the 'dist' folder"
echo "📖 Read DEVELOPMENT.md for more information"
echo ""
echo "🔧 Development commands:"
echo "   npm run dev     - Build extension"
echo "   npm run watch   - Watch for changes and rebuild"
echo "   npm run package - Create zip file for distribution"
echo ""
