#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Front-End (Angular)
gnome-terminal --title="Angular Frontend" -- bash -c "cd '$ROOT_DIR/restaurant' && ng serve; exec bash"

# Back-End (Django)
gnome-terminal --title="Django Backend" -- bash -c "cd '$ROOT_DIR/backend' && source .venv/bin/activate && python manage.py runserver 8001; exec bash"