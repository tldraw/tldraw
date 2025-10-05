#!/usr/bin/env bash

# Capture all arguments as the bug description
BUG_DESCRIPTION="$*"

# If no arguments provided, show usage
if [ -z "$BUG_DESCRIPTION" ]; then
  echo "Usage: yarn bug <bug description>"
  echo "Example: yarn bug the profile page should alert me if I try to navigate away when i have unsaved changes"
  exit 1
fi

# Execute Claude Code with the bug-report-generator agent
claude --dangerously-skip-permissions "@agent-bug-report-generator $BUG_DESCRIPTION"
