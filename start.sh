#!/bin/bash
# Start the dashboard on a fixed port so the URL never changes.
# Bookmark: http://localhost:8080/

cd "$(dirname "$0")"
echo "Starting at http://localhost:8080/"
echo "Bookmark this URL so it never changes. Press Ctrl+C to stop."
python3 -m http.server 8080
