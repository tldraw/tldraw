#!/bin/sh
set -e

# Substitute FLY_MACHINE_ID into nginx config (only this var, preserve nginx $vars)
envsubst '${FLY_MACHINE_ID}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Give every machine a distinct OTel instance identity.
#
# Grafana Cloud's OTLP ingestion only promotes a fixed set of resource
# attributes to Prometheus labels: service.name, service.namespace,
# deployment.environment and service.instance.id. host.name is not among them —
# it lands in target_info instead — so OTEL_NODE_RESOURCE_DETECTORS="...,host,..."
# is not enough to tell two machines apart in a metric query.
#
# Without a distinct instance label every machine writes to the *same* series.
# Prometheus then sees one series being overwritten by several independent
# cumulative counters, reads each downward jump as a counter reset, and rate()
# adds up every apparent increase. The result is a rate inflated by orders of
# magnitude that climbs steadily since the last deploy and drops to zero when
# the machines restart together. Ratios and histogram quantiles survive it
# (the inflation is common-mode and cancels); every absolute counter rate does
# not.
#
# This must be set here rather than in the fly.toml [env] block, because
# FLY_MACHINE_ID only exists at runtime. supervisord passes its own environment
# through to child programs, so exporting before exec is enough for zero-cache
# to pick it up.
if [ -n "$FLY_MACHINE_ID" ]; then
	if [ -n "$OTEL_RESOURCE_ATTRIBUTES" ]; then
		OTEL_RESOURCE_ATTRIBUTES="$OTEL_RESOURCE_ATTRIBUTES,service.instance.id=$FLY_MACHINE_ID"
	else
		OTEL_RESOURCE_ATTRIBUTES="service.instance.id=$FLY_MACHINE_ID"
	fi
	export OTEL_RESOURCE_ATTRIBUTES
fi

# Start supervisord which manages both nginx and zero-cache
exec supervisord -c /etc/supervisord.conf
