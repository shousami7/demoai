#!/bin/bash
cd "$(dirname "$0")/demo"
echo "Starting server in demo directory..."
echo "Access the demo at: http://localhost:8000/index.html"
echo ""
python3 -m http.server 8000
