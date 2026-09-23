# Product stable ids

Every published package in `packages/` declares which commercial component it belongs to via a `tldraw_product` field in its `package.json`. These stable ids are what legal and sales reference in order forms, so they must be unambiguous and durable: renaming, moving, or refactoring code never changes a stable id.

## The shape of the taxonomy

The taxonomy has exactly two levels, matching the order form's "Product in Scope" section:

- **Products** are the top-level line items — the checkboxes a customer ticks. Today: SDK and the Collaboration module.
- **Features** are parts of a product that can be licensed on their own, listed indented beneath their parent. Commenting is a feature of the Collaboration module.

```
[ ] SDK
      [ ] Sync, Driver, Mermaid, Create tldraw CLI   (included, not separately licensed)
[ ] Collaboration module
      [ ] Commenting
```

A feature that isn't premium is _included_ in its parent rather than separately licensable — it appears in the manifest so legal can see what a product contains, but it isn't its own checkbox.

Individual npm packages are not part of this taxonomy. A package declares the component it implements and inherits that component's entitlement; several packages can (and do) share one stable id. `@tldraw/commenting`, `@tldraw/mentions`, and `@tldraw/sync-collaboration` all implement `tldraw:commenting`, and none of them are order form line items.

## Why package.json

- npm publishes `package.json` verbatim and published versions are immutable, so every shipped version carries a permanent record of its stable id and premium status. "What did `@tldraw/commenting@5.3.0` claim to be" is answerable forever via the npm registry (for example `https://registry.npmjs.org/@tldraw/commenting/latest`).
- The metadata travels with the package through renames and moves.
- The release process already rewrites every package's `package.json`, so no separate manifest file can drift out of date.

## The `tldraw_product` field

```json
"tldraw_product": {
	"stableId": "tldraw:commenting",
	"name": "Commenting",
	"type": "feature",
	"parent": "tldraw:collaboration",
	"premium": true,
	"licenseFlag": "FEAT_COMMENTING"
}
```

- `stableId` — immutable commercial identifier, `tldraw:<kebab-case>`. This is what contracts reference.
- `name` — the customer-facing label, matching the wording on the order form. Unlike the stable id this may be reworded.
- `type` — `product` (top-level line item) or `feature` (part of a parent).
- `parent` — for features, the component they belong to.
- `premium` — whether the component is separately licensed rather than part of the standard SDK offering.
- `licenseFlag` — for premium components, the license key `FLAGS` bit in `packages/editor/src/lib/license/LicenseManager.ts` that entitles a customer to the component. This is the bridge between order forms and runtime enforcement: a license key whose flags include this bit grants the component.

## Rules

- A stable id never changes when code is renamed, moved, split, or refactored. If a package is renamed, the `tldraw_product` field moves with it unchanged.
- A new stable id is minted only for a genuinely new commercial component — something sales would list on an order form. Major version bumps do not mint new ids; the order form grants "all versions made available during the Order Form Term", so version entitlement is handled by the term and the license key's expiry, never by the id.
- Moving a package to a different component is the expensive operation, because customers have signed order forms citing the old one. When a package is likely to become separately licensable later, give it its own component up front.
- All packages sharing a stable id must have identical metadata.
- Every published package in `packages/` must have the field. `yarn check-packages` (run in CI) enforces this, validates `licenseFlag` values against `LicenseManager`, checks that every `parent` resolves, and checks that packages pointing at `LICENSE.md` actually ship one.

## How legal references a component

Reference components by stable id, for example: "SDK (`tldraw:sdk-core`) and the Collaboration module (`tldraw:collaboration`), including Commenting (`tldraw:commenting`)".

- `yarn product-manifest` prints the manifest as a JSON tree: products, their features, and the packages implementing each.
- For any published version, the npm registry copy of each package's `package.json` is the immutable record.

## Current components

Run `yarn product-manifest` for the authoritative list. As of the introduction of this convention:

| Stable id              | Name                 | Parent                 | Premium                    | Packages                                                                                                                                                                         |
| ---------------------- | -------------------- | ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tldraw:sdk-core`      | SDK                  | —                      | no                         | `tldraw`, `@tldraw/tldraw`, `@tldraw/editor`, `@tldraw/assets`, `@tldraw/state`, `@tldraw/state-react`, `@tldraw/store`, `@tldraw/tlschema`, `@tldraw/utils`, `@tldraw/validate` |
| `tldraw:sync`          | Sync                 | `tldraw:sdk-core`      | no                         | `@tldraw/sync`, `@tldraw/sync-core`                                                                                                                                              |
| `tldraw:driver`        | Driver               | `tldraw:sdk-core`      | no                         | `@tldraw/driver`                                                                                                                                                                 |
| `tldraw:mermaid`       | Mermaid              | `tldraw:sdk-core`      | no                         | `@tldraw/mermaid`                                                                                                                                                                |
| `tldraw:create-tldraw` | Create tldraw CLI    | `tldraw:sdk-core`      | no                         | `create-tldraw`                                                                                                                                                                  |
| `tldraw:collaboration` | Collaboration module | —                      | yes (`FEAT_COLLABORATION`) | `@tldraw/collaboration`                                                                                                                                                          |
| `tldraw:commenting`    | Commenting           | `tldraw:collaboration` | yes (`FEAT_COMMENTING`)    | `@tldraw/commenting`, `@tldraw/mentions`, `@tldraw/sync-collaboration`                                                                                                           |

Entitlement flows down the tree:

- `FEAT_COLLABORATION` — the umbrella flag; grants the whole Collaboration module.
- `FEAT_COMMENTING` — grants commenting.

`@tldraw/mentions` implements commenting today because `@tldraw/commenting` depends on it, so every customer entitled to commenting is entitled to mentions. If mentions later becomes usable on its own — in shape rich text, say — it will need its own component and license flag at that point.
