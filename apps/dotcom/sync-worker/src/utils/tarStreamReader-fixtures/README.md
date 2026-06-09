# Tar stream reader test fixtures

USTAR-format `.tar` files used by `tarStreamReader.test.ts`. Generated with `tar --format=ustar` (macOS bsdtar and GNU tar support this). On macOS, `COPYFILE_DISABLE=1` is set in the script to avoid AppleDouble `._*` entries.

To regenerate:

```bash
./apps/dotcom/sync-worker/src/utils/tarStreamReader-fixtures/generate-fixtures.sh
```

Then commit the updated `.tar` files.
