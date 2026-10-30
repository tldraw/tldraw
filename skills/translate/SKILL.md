---
name: translate
description: Update tldraw's website and editor translations from English, using repository context and independent review. Maintain translations incrementally, review all existing translations, or retranslate from scratch; validate the catalogs and open a pull request. Use for translation maintenance or a full translation update, not a request to translate a standalone passage.
---

# Translate

Produce a translation PR for the requested locales, or all supported non-English locales when none are specified. Cover both the website and shared editor catalogs. Choose the mode from the user's request:

| Mode                     | Scope and behavior                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incremental (default)    | Review missing, unverified or changed entries; preserve current translations. A full update covers all locales without automatically rewriting every string.                                                                      |
| Full review              | Judge every current English key against its existing translation and actual app behavior, including previously reviewed entries whose hashes still match. Retain correct text and generate replacements for contextual errors.    |
| Retranslate from scratch | Generate fresh candidates for every current English key before exposing the generator to existing translations. Independently review all candidates against the code, then compare with the baseline and integrate accepted text. |

Treat “full review” or “audit existing translations” as full review; “start over,” “fresh translation,” or “retranslate everything” selects retranslation. If the user requests a review that may replace poor translations, use full review and regenerate the entries that fail it. Never use matching hashes or previous approval as evidence of linguistic correctness in either comprehensive mode. These modes expand the review/generation scope, not permission to delete obsolete IDs or metadata.

## Establish the source and pending work

1. Read `AGENTS.md` and `skills/pr/SKILL.md`. Work on a dedicated branch or worktree from the intended base, preserving unrelated edits. Inspect existing translation PRs before starting overlapping work.
2. Read `internal/scripts/i18n-extract.ts` and the package scripts before running them; use the current extraction path rather than commands copied from an older checkout. Today, run `pnpm i18n-extract` at the repo root to regenerate both English catalogs and website ASTs. English is authored in source descriptors, not edited directly in generated catalogs. Resolve extraction failures at their source; do not bypass a missing-ID or plural check to obtain output.
3. Use these catalogs:

   | Project    | English                                         | Targets                                                                                       |
   | ---------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
   | SDK/editor | `assets/translations/main.json`                 | `assets/translations/<locale>.json` (flat strings)                                            |
   | Website    | `apps/dotcom/client/public/tla/locales/en.json` | `apps/dotcom/client/public/tla/locales/<locale>.json` (structured objects with `translation`) |

   Editor `en.json` is an empty fallback, not the source. Compiled catalogs are outputs, not translator inputs. Derive supported locale codes from `assets/translations/languages.json`; retain regional variants as separate languages. Do not translate `main`, metadata, English, or debug pseudo-locales.

4. Snapshot the source and target catalogs before editing. Read [references/incremental-state.md](references/incremental-state.md), then generate the pending inventory:

   ```sh
   node skills/translate/scripts/translation-state.mjs plan > /tmp/tldraw-translation-plan.json
   # To limit the run:
   node skills/translate/scripts/translation-state.mjs plan es,fr > /tmp/tldraw-translation-plan.json
   # Full review or retranslation: include already-current keys too.
   node skills/translate/scripts/translation-state.mjs plan es,fr --all > /tmp/tldraw-translation-plan.json
   ```

   Use a task-specific scratch directory if other translation runs are active. The helper is read-only and reports missing, unverified, source-changed, externally changed, current, and obsolete entries. Newly added supported locales have missing entries for both catalogs. Report catalog files for unsupported locales separately; do not delete or silently include them.

5. For the first run, existing entries have no review state. Review them in locale batches and retain those still correct; never assume all are stale, or bulk-mark them current simply because they exist. Git history can supply the earlier English and show likely changes, but a target-file commit date does not establish that every key was translated against that source. A website copy change usually creates a new hash ID; an editor copy change keeps its named ID. Do not infer ID replacements from similar wording alone. Obsolete IDs remain intact unless removal is explicitly in scope.

## Analyze the app before translating

Do a repository-grounded pass over the messages selected by the mode before delegating translation. For each message or coherent group, supply:

- Exact key and English, source descriptor and rendering call sites, and relevant description/notes.
- UI role: action, state, heading, tooltip, accessible announcement, error, or explanatory copy; surrounding labels and the behavior it controls.
- Meaning and types of placeholders, rich-text slots, count variables, plural/select branches, and example runtime values.
- Relevant constraints: visible width, accessibility-only text, destructive actions, links, brand names, and terminology shared with other controls.
- For changed keys, previous English when known and what changed in meaning. Flag ambiguous source copy instead of guessing its function from the ID.

Follow the component into its handler when necessary: “Pin” is an action, “Padding” is export margin, and a style named “Draw” is not necessarily the drawing tool. Do not rename product concepts based only on implementation details. Compare call sites and descriptors with the last translation-review PR when available; on bootstrap, inspect their current meaning directly. Check changed call sites even when their English is unchanged; send any changed meaning to review explicitly because source hashes cannot detect it.

Establish a brief per-locale register and glossary of verified software terminology, keeping regional variants distinct. Existing translations are suggestions to validate, not an authoritative glossary. In retranslation mode, derive the glossary from English, app behavior and established locale software conventions without showing old translations to the generator. Preserve product names; replace established local terms when they demonstrably describe the wrong action. Check domain meaning explicitly: clipboard Cut, Copy and Paste must use the locale’s conventional application commands, not words selected for cutting materials, glue or crafts. A word can serve both domains; judge conventional UI usage and what the handler does, not a banned-word list. Check related actions together, such as duplicate versus copy, remove versus delete, and drawing versus font/stroke styles. Use authoritative localized software references when terminology is uncertain, and state any unresolved uncertainty. Do not impose the Spanish trial's vocabulary on other locales. Keep context packets and review notes in scratch space; put material terminology decisions in the PR.

## Generate independently, then review against the repo

Delegate candidate generation and review to separate agents. Bound parallelism to available capacity and assign disjoint locale/key batches. Only the coordinating agent merges catalog and state changes.

For generation, use a fresh agent without inherited comparison history and a source snapshot with the whole repo available for context, but without non-English catalogs, compiled/generated translation copies, Git history, node_modules, or embedded non-English translation examples. Do not use a worktree with accessible shared Git history as a purported clean copy. Exclude symlinks escaping the snapshot. Verify the snapshot before handing it over, and explicitly restrict reads to it and approved context packets. These restrictions are procedural unless the tools enforce filesystem confinement; do not claim a security sandbox.

In incremental or full-review mode, supply keys requiring new text or confirmed retranslation, English, grounded context, and the verified locale glossary/register. In retranslation mode, supply every current source key, even when a correct-looking translation already exists. Do not leak the baseline through glossaries, examples, review history or inherited conversation. Ask for candidate patches keyed by exact ID, not replacement catalogs; preserve placeholders, markup, brands, and message function. Allow the plural categories required by the target language. Require doubts and important terminology choices alongside the patch. Keep output frozen until the independent review is complete.

The review agent must have access to the working repository's code, not just English and Spanish-style parallel columns. Give it the context packet, source English, candidate and locale conventions. Include the existing target immediately for incremental and full-review modes. For retranslation, start a fresh reviewer without inherited baseline context and restrict its initial reads to English and code context, excluding non-English catalogs and translation history, until its assessment is frozen. Ask it to inspect actual call sites, evaluate semantic accuracy, fluency, consistency, regional usage, accessibility, plural branches and likely layout problems. It may inspect additional code or request missing context. Treat the existing translation as evidence, not ground truth. In retranslation mode, first judge the frozen candidate against English and code without the baseline; then reveal the existing target for comparison. In full-review mode, inspect every existing translation in context before deciding what needs generation. Explicitly distinguish a wrong domain sense from an acceptable wording variant.

On bootstrap, the reviewer can approve retaining an existing translation without requesting a generated candidate. For later changes, it can also retain the same wording if it still correctly conveys the new English. Require an explicit disposition for each reviewed key: retain, accept candidate, revise, or unresolved, with reasons for substantive changes. A different phrase alone is not an error. Do not auto-accept low-confidence reviews for unfamiliar languages. Resolve concrete issues with another focused pass; leave unresolved entries unchanged and unacknowledged, and report them as incomplete.

## Integrate and validate

Merge only accepted key-level changes into each existing catalog. Preserve all out-of-scope entries and non-translation metadata; for new structured keys, carry over applicable source metadata without translating notes. Keep the repository's JSON formatting. Do not copy a regenerated candidate catalog over an existing target file.

Before recording review state or creating the PR:

- Parse every touched JSON file. Check required keys, nonempty strings, and unexpected additions. Count remaining gaps explicitly; retaining obsolete IDs must not hide missing current IDs.
- Compare against the pre-run snapshot: target values and metadata outside the approved key set must be unchanged. Existing keys may be removed only when that cleanup was in scope and reviewed.
- Parse both English and target with the installed FormatJS ICU parser. Check named arguments and their value types, rich-text tag identities/nesting, select discriminators, plural offsets, explicit numeric branches and required `other` branches. Allow reordered arguments and target-language plural categories (`few`, `many`, `two`, etc.); do not demand English's exact branch set. Check arguments inside every branch, not just with a brace regex.
- Render representative values for each plural/select message, including zero, one, two, several, and locale-specific boundaries. Check branch text for untranslated English as well as formatting errors. Brands and shared words are legitimate exceptions, not automatic failures. Validate both SDK and website ICU messages.
- Review longer visible labels in the running UI where practical, including RTL locales. Character counts are triage, not proof of overflow. Report UI or native-speaker checks not performed; never claim syntax validation proves translation quality.

Regenerate with the owning commands: currently `pnpm i18n-extract` compiles website translations and `pnpm refresh-assets` refreshes editor assets. Run `pnpm i18n-extract --check` and the appropriate locale validation commands from the current repo workflow. Inspect generated diffs and retain only outputs caused by this work. Do not hand-edit compiled ASTs or generated types.

For full review and retranslation, maintain a scratch disposition list covering every selected source key and locale, including previously current keys. Completion requires an explicit reviewed disposition for each entry; an empty incremental plan does not prove full-review coverage. For unresolved previously current entries, use the helper’s `invalidate` command with their reviewed hashes to remove only those prior approvals. Preserve their target text so they remain visible as unverified in later incremental inventories; never reset the entire ledger.

After review and validation, record only accepted, nonempty entries using the state helper and the procedure in [references/incremental-state.md](references/incremental-state.md). Commit the state with its translations, so later runs can detect a reworded stable key or an external translation update. Re-run the plan and report any remaining pending work. Rebase/merge or source changes invalidate affected approvals; regenerate and re-review rather than blessing a changed input with fresh hashes.

## Deliver the translation PR

Follow `skills/pr/SKILL.md` to review, commit, push and open a PR; attach it to the task when the app supports this. Include the mode, locales, total selected/reviewed keys, new/changed/retained/unresolved counts, source baseline, meaningful glossary decisions, checks run and remaining review limitations. Partial batches may be delivered in a clearly labeled draft PR listing unresolved work; do not describe them as a completed full update. If there are no catalog or review-state changes, report the no-op instead of opening an empty PR.

Do not call the Lokalise upload/order/download scripts during this workflow: they can purchase translations or overwrite this work. Existing scheduled syncs may later overwrite repository translations. Identify that limitation in the PR; changing the service, credentials or CI ownership is a separate scope decision, not part of a routine translation update. Do not merge or deploy the PR unless requested.
