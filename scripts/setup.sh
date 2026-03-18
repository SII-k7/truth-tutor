#!/bin/bash
# One-command setup script

set -e

echo "=========================================="
echo "Truth Tutor Setup"
echo "=========================================="
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js 18 or higher is required"
    exit 1
fi
echo "✓ Node.js version OK"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Create directories
echo ""
echo "Creating directories..."
mkdir -p data uploads backups logs

# Initialize database
echo ""
echo "Initializing database..."
if [ -f "data/truth-tutor.db" ]; then
    echo "Database already exists. Skipping initialization."
else
    node -e "
    const { initDatabase } = require('./src/database/db.mjs');
    initDatabase().then(() => console.log('✓ Database initialized'));
    "
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file..."
    cat > .env << EOF
# Server Configuration
HOST=127.0.0.1
PORT=3474
NODE_ENV=development

# Security
JWT_SECRET=$(openssl rand -hex 32)

# AI Models (add your API keys)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Database
DATABASE_PATH=./data/truth-tutor.db
EOF
    echo "✓ .env file created. Please add your API keys."
else
    echo ".env file already exists. Skipping."
fi

# Run tests
echo ""
echo "Running tests..."
npm test

echo ""
echo "=========================================="
echo "Setup completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Add your API keys to .env file"
echo "2. Start the server: npm start"
echo "3. Open http://localhost:3474 in your browser"
echo ""
