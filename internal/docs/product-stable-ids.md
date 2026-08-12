# Product stable ids

Every published package in `packages/` declares which commercial component it belongs to via a `tldraw_product` field in its `package.json`. These stable ids are what legal and sales reference in order forms, so they must be unambiguous and durable: renaming, moving, or refactoring code never changes a stable id.

## Why package.json

- npm publishes `package.json` verbatim and published versions are immutable, so every shipped version carries a permanent record of its stable id and premium status. "What did `@tldraw/commenting@5.3.0` claim to be" is answerable forever via the npm registry (for example `https://registry.npmjs.org/@tldraw/commenting/latest`).
- The metadata travels with the package through renames and moves.
- The release process already rewrites every package's `package.json`, so no separate manifest file can drift out of date.

## The `tldraw_product` field

```json
"tldraw_product": {
	"stableId": "tldraw:commenting",
	"type": "premium_module",
	"premium": true,
	"licenseFlag": "FEAT_COMMENTING"
}
```

- `stableId` — immutable commercial identifier, `tldraw:<kebab-case>`. Identifies the commercial component, not the npm package: several packages can (and do) share one stable id. For example, all core SDK packages share `tldraw:sdk-core`.
- `type` — `sdk_core`, `module` (standard add-on), `premium_module` (separately licensed), or `tool`.
- `premium` — whether the component is separately licensed rather than part of the standard SDK offering.
- `licenseFlag` — for premium components, the license key `FLAGS` bit in `packages/editor/src/lib/license/LicenseManager.ts` that entitles a customer to the component. This is the bridge between order forms and runtime enforcement: a license key whose flags include this bit grants the component.

## Rules

- A stable id never changes when code is renamed, moved, split, or refactored. If a package is renamed, the `tldraw_product` field moves with it unchanged.
- A new stable id is minted only for a genuinely new commercial component — something sales would license separately or list separately on an order form. Major version bumps do not mint new ids; version entitlement is handled by the license key expiry and publish-date mechanism, not the id.
- All packages sharing a stable id must have identical `type`, `premium`, and `licenseFlag` values.
- Every published package in `packages/` must have the field. `yarn check-packages` (run in CI) enforces this, validates `licenseFlag` values against `LicenseManager`, and checks that packages pointing at `LICENSE.md` actually ship one.

## How legal references a component

Reference components by stable id, for example: "SDK core (`tldraw:sdk-core`) and Commenting module (`tldraw:commenting`)". The current list of components and their packages:

- `yarn product-manifest` prints the aggregate manifest as JSON (components, their packages, and the current version).
- For any published version, the npm registry copy of each package's `package.json` is the immutable record.

## Current components

Run `yarn product-manifest` for the authoritative list. As of the introduction of this convention:

| Stable id              | Type           | Premium                    | Packages                                                                                                                                                                         |
| ---------------------- | -------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tldraw:sdk-core`      | sdk_core       | no                         | `tldraw`, `@tldraw/tldraw`, `@tldraw/editor`, `@tldraw/assets`, `@tldraw/state`, `@tldraw/state-react`, `@tldraw/store`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate` |
| `tldraw:sync`          | module         | no                         | `@tldraw/sync`, `@tldraw/sync-core`                                                                                                                                              |
| `tldraw:collaboration` | premium_module | yes (`FEAT_COLLABORATION`) | `@tldraw/collaboration`                                                                                                                                                          |
| `tldraw:commenting`    | premium_module | yes (`FEAT_COMMENTING`)    | `@tldraw/commenting`, `@tldraw/mentions`, `@tldraw/sync-collaboration`                                                                                                           |
| `tldraw:driver`        | module         | no                         | `@tldraw/driver`                                                                                                                                                                 |
| `tldraw:mermaid`       | module         | no                         | `@tldraw/mermaid`                                                                                                                                                                |
| `tldraw:create-tldraw` | tool           | no                         | `create-tldraw`                                                                                                                                                                  |

`FEAT_COLLABORATION` is the umbrella flag: a license key carrying it grants all collaboration sub-features, including commenting. `FEAT_COMMENTING` grants commenting alone. A package belongs to the smallest component whose entitlement requires it — `@tldraw/mentions` sits under `tldraw:commenting` because `@tldraw/commenting` depends on it, so every customer entitled to commenting must also be entitled to mentions.
