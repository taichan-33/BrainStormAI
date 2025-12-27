#!/bin/bash

echo "🚀 Starting BrainStormAI..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
  echo "⚠️  .env file not found. Creating from template..."
  echo "OPENAI_API_KEY=your_key_here" > .env
  echo "GOOGLE_API_KEY=your_key_here" >> .env
  echo "Please edit .env file with your API keys!"
  open .env
  exit 1
fi

echo "📦 Building and starting containers..."
docker-compose up -d --build

echo "✅ System started!"
echo "👉 Frontend: http://localhost:3000"
echo "👉 Backend:  http://localhost:8000"
echo ""
echo "Type './logs.sh' to view output."
