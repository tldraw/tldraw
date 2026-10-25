# Incremental review state

`internal/i18n/translation-state.json` records which source and target entries were actually reviewed together. It lives outside catalog directories because the asset and compilation scripts treat their JSON files as locale inputs. The file is created on the first accepted batch; do not seed it from current HEAD without review.

The helper uses Node built-ins and runs from the repo root:

```sh
node skills/translate/scripts/translation-state.mjs plan es,fr > /tmp/tldraw-translation-plan.json
node skills/translate/scripts/translation-state.mjs record /tmp/tldraw-approved-translations.json
```

Omit the locale argument to plan every supported non-English locale. Both projects are always inspected. Locale names must exactly match `assets/translations/languages.json`. Read the current workflow's supported languages before adding a new locale; the helper does not register languages or change runtime configuration.

## Inventory meanings

- `missing`: no nonempty target text, regardless of review state. Generate a translation.
- `unverified`: existing text without review state. Review for retention first; absence of state is not evidence of a bad translation.
- `sourceChanged`: source text or metadata differs from the reviewed source. Review meaning and retranslate only when needed.
- `translationChanged`: source still matches, but target text or metadata was changed externally. Review the new value; do not silently overwrite a human or Lokalise edit.
- `current`: both hashes match the accepted pair. Preserve the entry; it is counted but omitted from pending entries.
- `unsupported`: locale catalog files outside the supported list, excluding known source, metadata and `xx-` debug files. Report without translating or deleting.
- `obsolete`: target key no longer appears in English. Report it separately and retain it unless cleanup was requested.

If both source and translation changed, the entry is reported as `sourceChanged`; inspect the existing target as well. The inventory is not a list of keys to overwrite. Every entry includes its English, current target text and destination path for coordinator/reviewer use. Do not pass that complete inventory to the independent generator, since it contains existing translations.

On bootstrap, use Git history and source context to prioritize likely stale translations, but retain the `unverified` category until review. A branch merge-base only identifies changes on that branch; it does not reveal older untranslated changes on main. Missing review state is never resolved by selecting an arbitrary recent commit as a trusted translation baseline.

Hashes cover `JSON.stringify` of the parsed entire source/target value (including metadata), not the file bytes. Whitespace outside strings does not invalidate review. Target edits by another workflow are detected even when English remains unchanged. Changes in code behavior without message changes require the separate context pass described in the skill.

## Record accepted pairs

After merging a reviewed candidate or deciding to keep the existing text, re-run `plan` to obtain the hashes of the actual values. The reviewer must have evaluated those exact values. Build an approval array by selecting only the accepted entries; do not transform every pending entry into an approval automatically.

Each approval has this shape; use the helper's actual hash values:

```json
[
	{
		"project": "sdk",
		"locale": "es",
		"key": "action.copy",
		"sourceHash": "<hash from the reviewed source>",
		"translationHash": "<hash from the reviewed final target>"
	}
]
```

Run `record` with that scratch file. It verifies all approvals against current catalogs before writing anything, rejects missing text, duplicate approvals, nonpending entries and changed inputs, and preserves state for all other entries. If an approval is rejected, inspect the intervening edit and repeat review; do not merely refresh its hashes. On successful recording, the accepted entries disappear from the pending plan. Retained translations can gain review state without modifying their text.

Commit state together with catalog and required generated changes. Never advance state for a language or key that failed validation, was deferred, or has not been reviewed. Keep unresolved entries in the next inventory. Source deletion/reintroduction and external syncs must not be hidden by bulk ledger rewrites.

To verify the helper itself:

```sh
node --test skills/translate/scripts/translation-state.test.mjs
```
