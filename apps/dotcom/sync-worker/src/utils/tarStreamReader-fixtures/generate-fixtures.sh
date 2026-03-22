#!/usr/bin/env bash
# Generate USTAR .tar fixtures for tarStreamReader tests.
# Requires tar with --format=ustar (macOS bsdtar and GNU tar support this).
# Use COPYFILE_DISABLE=1 on macOS to avoid AppleDouble ._ entries.
set -e
cd "$(dirname "$0")"
export COPYFILE_DISABLE=1

( TD=$(mktemp -d); trap "rm -rf $TD" EXIT
  echo -n 'hello' > "$TD/a.txt"
  tar --format=ustar -cf single-file.tar -C "$TD" a.txt )

( TD=$(mktemp -d); trap "rm -rf $TD" EXIT
  echo -n '{}' > "$TD/meta.json"
  mkdir -p "$TD/records"
  echo -n '{"id":"1"}' > "$TD/records/doc1.json"
  tar --format=ustar -cf multi-file.tar -C "$TD" meta.json records records/doc1.json )

( TD=$(mktemp -d); trap "rm -rf $TD" EXIT
  mkdir -p "$TD/path/to"
  echo -n 'content' > "$TD/path/to/file.json"
  tar --format=ustar -cf with-prefix.tar -C "$TD" path path/to path/to/file.json )

( TD=$(mktemp -d); trap "rm -rf $TD" EXIT
  mkdir -p "$TD/records"
  tar --format=ustar -cf directory-only.tar -C "$TD" records )

( TD=$(mktemp -d); trap "rm -rf $TD" EXIT
  dd if=/dev/zero bs=1 count=600 2>/dev/null | tr '\0' 'a' > "$TD/big.bin"
  tar --format=ustar -cf large-body.tar -C "$TD" big.bin )

echo "Generated: single-file.tar, multi-file.tar, with-prefix.tar, directory-only.tar, large-body.tar"
