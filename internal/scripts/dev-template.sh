#!/bin/bash

template_name="$1"
workspace_root="$(git rev-parse --show-toplevel)"

if [ -z "$template_name" ]; then
    echo "Usage: yarn dev-template <template_name>"
    echo "Available templates: $(ls templates | awk 'ORS=", "' | sed 's/, $//')"
    exit 1
fi

if [ ! -d "templates/$template_name" ]; then
    echo "Template $template_name does not exist"
    echo "Available templates: $(ls templates | awk 'ORS=", "' | sed 's/, $//')"
    exit 1
fi

LAZYREPO_PRETTY_OUTPUT=0 lazy run dev --filter="templates/$template_name" --filter='packages/tldraw' --filter='apps/bemo-worker'
