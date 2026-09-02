#!/usr/bin/env bash
set -eux

echo "[postpack] restoring package.json"

restore_generated_file() {
	if [ -f "$1.bak" ]; then
		mv "$1.bak" "$1"
	elif [ -f "$1.generated" ]; then
		rm -rf "$1" "$1.generated"
	fi
}

# our prepack script makes the following changes we need to reverse
# - modifies the package.json, saving previous as package.json.bak
mv package.json.bak package.json
# - generates tldraw package documentation files
restore_generated_file DOCS.md
restore_generated_file RELEASE_NOTES.md
# - generates an index.d.ts file
rm -rf index.d.ts
