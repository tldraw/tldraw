#!/bin/sh
set -e

# Substitute FLY_MACHINE_ID into nginx config (only this var, preserve nginx $vars)
envsubst '${FLY_MACHINE_ID}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start supervisord which manages both nginx and zero-cache
exec supervisord -c /etc/supervisord.conf
