#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/work/core/shared/js/tldraw"
PACKAGES=(tldraw editor)

mkdir -p "$DEST"

for pkg in "${PACKAGES[@]}"; do
	pkg_dir="$REPO_ROOT/packages/$pkg"
	pkg_json="$pkg_dir/package.json"

	name=$(node -e "console.log(require('$pkg_json').name)")
	version=$(node -e "console.log(require('$pkg_json').version)")

	# strip the @tldraw/ scope to get the short name
	short_name="${name#@tldraw/}"

	echo "==> Packing $name@$version"
	(cd "$pkg_dir" && yarn pack-tarball)

	src="$pkg_dir/package.tgz"
	dest_file="$DEST/tldraw-${short_name}-${version}.tgz"

	echo "    Copying -> $dest_file"
	cp "$src" "$dest_file"
done

echo ""
echo "Done. Files in $DEST:"
ls "$DEST"
