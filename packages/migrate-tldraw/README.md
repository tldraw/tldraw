# @tldraw/migrate

A CLI for migrating tldraw projects between SDK majors.

## Usage

Run with `npx` from the root of your project:

```sh
npx @tldraw/migrate
```

With no arguments, the CLI auto-detects the installed tldraw version, picks the
matching transform set, and walks through it interactively.

Run an explicit transform:

```sh
npx @tldraw/migrate v4-to-v5 .
```

### Options

```
Usage: tldraw-migrate [TRANSFORM] [DIRECTORY] [OPTIONS]

Transforms:
  v4-to-v5             tldraw 4.x → 5.0 migration

Options:
  -h, --help           Display this help message
  -v, --version        Print the CLI version
  --dry-run            Report changes without writing files
  --no-css             Skip .css/.scss/.less files
  --json               Emit a machine-readable JSON report (no auto-fixes)
  --yes                Skip confirmation prompts
```

### Exit codes

- `0` — clean run, no flags reported
- `1` — flags reported (manual review required)
- `2` — error

## What this CLI does

Each transform pairs deterministic auto-fixes (mechanical renames) with flagged
manual-review items (renames whose semantics changed, removed APIs, signature
changes, removed CSS variables, and so on). After running, the CLI points at
the bundled SKILL.md / `.agent` files for an LLM-driven pass over the flagged
lines.

Transforms are import-scope aware: a flag named after a tldraw symbol only
fires in files that actually import it from `tldraw` or `@tldraw/*`, so
unrelated identifiers in your codebase aren't reported.

## Development

From this folder:

```sh
yarn dev v4-to-v5 ../some/project --dry-run
```

`yarn dev` builds the bundle and runs the CLI in one step.

To regenerate the LLM-facing skill files after changing transforms or section
prose:

```sh
yarn run -T tsx ./scripts/generate-skills.ts
```

The bundle build runs this automatically as a `prebuild` step. CI also asserts
that the committed `skills/` directory is up to date with the generator
output.

## Adding a new transform

1. Create `src/transforms/<from>-to-<to>/`.
2. Add `autoFixes.ts`, `tsFlags.ts`, `cssFlags.ts`, and a `sections/` folder of
   prose for non-deterministic fixes.
3. Export a `Transform` from `index.ts` and register it in
   `src/transforms/index.ts`.
4. Add fixtures under `src/transforms/<from>-to-<to>/__tests__/__fixtures__/`.
5. Run `yarn run -T tsx ./scripts/generate-skills.ts` and commit the
   regenerated `skills/`.

## License

This project is part of the tldraw SDK. It is provided under the
[tldraw SDK license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

You can use the tldraw SDK in commercial or non-commercial projects so long as
you preserve the "Made with tldraw" watermark on the canvas. To remove the
watermark, you can purchase a [business license](https://tldraw.dev/pricing).
Visit [tldraw.dev](https://tldraw.dev) to learn more.

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw) or email us at
[hello@tldraw.com](mailto:hello@tldraw.com).
