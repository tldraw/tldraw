#!/usr/bin/env bash
set -eux

echo "[postpack] restoring package.json"

# our prepack script makes the following changes we need to reverse
# - modifies the package.json, saving previous as package.json.bak
mv package.json.bak package.json
# - generates an index.d.ts file
rm -rf index.d.ts