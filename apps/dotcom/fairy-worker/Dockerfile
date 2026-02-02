# Cloudflare Sandbox container image for fairy agents
# This defines the runtime environment available inside each sandbox instance

FROM python:3.11-slim

# Install Node.js for JavaScript execution capability
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Create a non-root user for security
RUN useradd -m -s /bin/bash sandbox
USER sandbox
