#!/usr/bin/env bash
set -eux

# a function called 'goodbye' that takes a string as an argument

function goodbye() {
  rm -rf $1
  rm -rf */$1
  rm -rf */*/$1
  rm -rf */*/*/$1
  rm -rf */*/*/*/$1
  rm -rf */*/*/*/*/$1
  rm -rf **/$1
}

rm -rf node_modules
goodbye node_modules
goodbye .turbo
goodbye tmp-assets
goodbye tsconfig.tsbuildinfo
goodbye tsconfig.build.tsbuildinfo
goodbye tsconfig.build.json
goodbye .lazy
goodbye dist-esm
goodbye dist-cjs
goodbye .tsbuild
goodbye .tsbuild-pub
goodbye .tsbuild-dev
goodbye .tsbuild-api
goodbye .next

rm -rf {packages,bublic/packages}/*/api
rm -rf {packages,apps,bublic/packages,bublic/apps}/*/*.tgz
rm -rf {packages,apps,bublic/packages,bublic/apps}/vscode/extension/temp
rm -rf {packages,apps,bublic/packages,bublic/apps}/vscode/extension/editor
rm -rf bublic/apps/docs/content.json

# need to run yarn directly
# because yarn messes with the PATH, aliasing itself to some tmp dir 
# which is apparently deleted by our clean script
node "$(dirname -- "$0")/../.yarn/releases/yarn-3.5.0.cjs"
