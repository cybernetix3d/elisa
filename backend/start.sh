#!/bin/sh
# Start script for Railway - runs the backend as a non-root user
# Claude Code CLI refuses --dangerously-skip-permissions as root

# Create non-root user if it doesn't exist
id -u zea >/dev/null 2>&1 || adduser --disabled-password --gecos '' --home /home/zea zea

# Ensure temp directory is writable by zea user
mkdir -p /tmp/elisa-work
chown -R zea:zea /tmp/elisa-work /home/zea

# Give zea user access to the app directory
chown -R zea:zea /app/backend 2>/dev/null || true

# Configure git for the zea user (required by Claude Code CLI)
su zea -c 'git config --global user.email "zea@zea.app" && git config --global user.name "Zea"'

# Start the backend as the zea user
exec su zea -c "cd /app/backend && npm start"
