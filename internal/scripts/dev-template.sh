#!/bin/bash

template_name="$1"
shift || true
vite_args=("$@")
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

if [ ${#vite_args[@]} -eq 0 ]; then
    LAZYREPO_PRETTY_OUTPUT=0 lazy run dev --filter="templates/$template_name" --filter='packages/tldraw' --filter='apps/bemo-worker'
    exit $?
fi

# lazy does not forward extra args to package scripts, so run vite directly in the template.
# Run the shared deps in their own process group (set -m) so we can tear down lazy and
# everything it spawns on exit — lazy installs no signal handlers of its own, so killing
# just its pid would orphan the watchers it started.
set -m
LAZYREPO_PRETTY_OUTPUT=0 lazy run dev --filter='packages/tldraw' --filter='apps/bemo-worker' &
lazy_pid=$!
disown
cleanup() {
    # negative pid signals the whole process group
    kill -- "-$lazy_pid" 2>/dev/null
}
trap cleanup EXIT INT TERM

cd "$workspace_root/templates/$template_name" || exit 1
yarn dev "${vite_args[@]}"
