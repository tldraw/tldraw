#!/bin/bash

template_name="$1"
shift || true
vite_args=("$@")
workspace_root="$(git rev-parse --show-toplevel)"

if [ -z "$template_name" ]; then
    echo "Usage: pnpm dev-template <template_name>"
    echo "Available templates: $(ls templates | awk 'ORS=", "' | sed 's/, $//')"
    exit 1
fi

if [ ! -d "templates/$template_name" ]; then
    echo "Template $template_name does not exist"
    echo "Available templates: $(ls templates | awk 'ORS=", "' | sed 's/, $//')"
    exit 1
fi

if [ ${#vite_args[@]} -eq 0 ]; then
    pnpm exec turbo run dev --filter="./templates/$template_name" --filter='./packages/tldraw' --filter='./apps/bemo-worker'
    exit $?
fi

# Running vite directly skips turbo's `dev` prerequisites. Only refresh-assets feeds templates, so
# run it here first and bail on failure like the normal `turbo run dev` path.
pnpm refresh-assets || exit 1

# turbo would forward extra args to every task in the run, so run vite directly in the template
# below. Run the shared deps in their own process group (set -m) so cleanup kills turbo and its
# watchers together.
set -m
pnpm exec turbo run dev --filter='./packages/tldraw' --filter='./apps/bemo-worker' &
turbo_pid=$!
disown
cleanup() {
    # negative pid signals the whole process group
    kill -- "-$turbo_pid" 2>/dev/null
}
trap cleanup EXIT INT TERM

cd "$workspace_root/templates/$template_name" || exit 1
# Args are appended to the template's `dev` script, so they only reach vite for plain-vite templates.
# For concurrently-wrapped or next.js templates they hit the wrapper/next instead.
pnpm dev "${vite_args[@]}"
