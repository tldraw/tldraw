---
name: translate
description: Update tldraw's website and editor translations from English, using repository context and independent review. Maintain translations incrementally, review all existing translations, or retranslate from scratch; validate the catalogs and open a pull request. Also reviews translation changes in a PR. Use for translation maintenance, a full translation update, reviewing translations, or when the weekly i18n workflow runs; not for translating a standalone passage.
---

# Translate

Translations live in the repo. This skill, run locally or by `.github/workflows/i18n-translate.yml`, translates and reviews them there. Produce a translation PR for the requested locales, or all supported non-English locales when none are specified. Cover both the website and editor catalogs. Choose the mode from the request:

| Mode                     | Scope and behavior                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incremental (default)    | Review missing, unverified or changed entries; preserve current translations. A full update covers all locales without automatically rewriting every string.                                                                      |
| Full review              | Judge every current English key against its existing translation and actual app behavior, including previously reviewed entries whose hashes still match. Retain correct text and generate replacements for contextual errors.    |
| Retranslate from scratch | Generate fresh candidates for every current English key before exposing the generator to existing translations. Independently review all candidates against the code, then compare with the baseline and integrate accepted text. |

Treat “full review” or “audit existing translations” as full review; “start over,” “fresh translation,” or “retranslate everything” selects retranslation. Never use matching hashes or previous approval as evidence of linguistic correctness in either comprehensive mode. These modes widen what gets reviewed; they are not permission to delete obsolete IDs or metadata.

**Lokalise is still connected.** `i18n-upload-strings` orders machine translations on every push to main, and the weekly `i18n-download-strings` overwrites whole catalogs with what Lokalise holds, which would undo this skill's work. Never run the Lokalise scripts from this workflow (they can buy translations). Before merging a PR from this skill, check that both Lokalise workflows are disabled (`gh workflow list`); if they aren't, say so in the PR.

To review someone else's translation edits in a PR without generating anything, skip to [Review](#4-review) and apply its checks to the changed entries.

## Files

| What                     | Path                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| SDK English / targets    | `assets/translations/main.json` / `assets/translations/<locale>.json` (flat strings; `en.json` is an empty stub, not the source)       |
| Website English / targets | `apps/dotcom/client/public/tla/locales/en.json` / `…/locales/<locale>.json` (`{translation, …metadata}`, hash IDs)                    |
| Supported locales        | `assets/translations/languages.json`. Regional variants are separate languages. Never translate `main`, metadata, English or `xx-` debug locales. |
| Review ledger            | `internal/i18n/translation-state.json` ([references/incremental-state.md](references/incremental-state.md))                            |
| Context notes            | `internal/i18n/context/<project>.json` ([references/context-notes.md](references/context-notes.md))                                    |
| Glossaries               | `internal/i18n/glossary/<locale>.json` ([references/dispositions.md](references/dispositions.md))                                      |

English is authored in source descriptors and extracted by `pnpm i18n-extract`; never edit the English catalogs or compiled outputs by hand. Catalogs, the ledger, notes and glossaries are written only by the scripts below, never by an agent editing JSON.

## 1. Plan

Work on a dedicated branch or worktree from the intended base, preserving unrelated edits. Run `pnpm i18n-extract` first so the English is current.

```sh
node skills/translate/scripts/translation-state.mjs plan [es,fr] [--all] > "$SCRATCH/plan.json"
node skills/translate/scripts/context.mjs plan [--all] > "$SCRATCH/context-plan.json"
```

`--all` on the translation plan includes current entries (full review, retranslation). `--all` on the context plan refreshes every note; use it for comprehensive modes and when call-site behavior changed without a copy change. On the first run every existing translation is `unverified`: review it for retention, never assume it stale or bulk-approve it. Report `unsupported` and `obsolete` entries; don't translate or delete them.

## 2. Write context notes

For every pending note, read the message's descriptor and follow it into its call sites and handlers. Write a note per message (format in [references/context-notes.md](references/context-notes.md)): its UI role, what it does, what each placeholder holds, and constraints such as width, destructive actions or accessibility-only text. Follow the component into its handler when necessary: “Pin” is an action, “Padding” is export margin, and a style named “Draw” is not necessarily the drawing tool. Flag ambiguous English instead of guessing from the ID. Record them:

```sh
node skills/translate/scripts/context.mjs record "$SCRATCH/notes.json"
```

Notes describe English and code only; never put a translation in one.

## 3. Generate, blind

```sh
node skills/translate/scripts/snapshot.mjs "$SCRATCH/snapshot" [--with-glossaries]
```

The snapshot is HEAD without any translation catalog, compiled copy, ledger or (unless asked) glossary. Commit English changes before snapshotting; uncommitted work isn't included. Pass `--with-glossaries` in incremental and full-review modes, never in retranslation: glossaries are derived from existing translations.

Hand candidate generation to a fresh agent (a separate subagent locally, a separate `claude -p` in CI) restricted to the snapshot, with no inherited conversation. Give it the pending keys with their English and context notes, and nothing from the existing translations. Ask for one call per batch of keys covering all requested locales, returning `candidates.json` (format in [references/dispositions.md](references/dispositions.md)). Require:

- Placeholders, tags, select options and ICU keywords exactly as in English; plural forms the target language needs (`few`, `many`, `two`, `zero`), not English's set.
- The locale's conventional software terms and register; brands and product names untouched.
- A `note` on any candidate it is unsure of, and on important terminology choices.

## 4. Review

Hand review to a separate fresh agent with full repository access: the context notes, English, candidates, existing translations, and glossaries. For retranslation, have it judge the candidates against English and code first, and only then reveal the existing translation for comparison. Review one key across all locales at a time: most mistakes repeat across languages and only stand out side by side.

Check each entry for:

1. **Word sense.** The commonest failure. From past runs: “Rhombus left” (a shape leaning left) as “the rhombus departed”; the “Copy” button as the noun “a copy”; “Changed page” (you are now on another page) as “modified page”; “Forget” (remove from a list) as “delete”; following someone's viewport as following on social media; clipboard Cut and Paste as cutting materials or glue. Judge what the handler does, not a banned-word list.
2. **Form for the UI.** Buttons and menu items take the form the language uses for controls (usually imperative or verbal noun), not an infinitive, first person or informal command. Tool names are nouns.
3. **References to other UI labels.** A string naming another part of the UI (“Preferences > Accessibility”) must use that locale's actual labels: find the label's key in the English catalog and read it in the same locale.
4. **Untranslated text.** English left inside a translation, including inside plural branches (`# other`). Brands and established loanwords are fine.
5. **Plural grammar.** Each form agrees with its count in that language. Don't require `many` for fr, es, it, pt or ca.
6. **Consistency.** Terms match the glossary and the rest of the locale; related actions stay distinct (duplicate vs copy, remove vs delete); one register throughout (de Sie/du, zh 您/你).
7. **Regressions.** When replacing an existing translation, check the old one wasn't better.
8. **Machine artifacts.** Hebrew niqqud, stray zero-width spaces (except Khmer word breaks), doubled punctuation, a full stop added to a short label.

A different phrase is not an error: distinguish a wrong sense from an acceptable variant. Give every reviewed entry a disposition (`retain`, `accept`, `revise`, `unresolved`) and a confidence. Mark `low` whenever the language is one the reviewer can't judge well; low-confidence entries are held back exactly like unresolved ones. Propose glossary entries for terms it verified. Output `dispositions.json` ([references/dispositions.md](references/dispositions.md)).

## 5. Apply and validate

```sh
node skills/translate/scripts/apply.mjs "$SCRATCH/dispositions.json" --unresolved "$SCRATCH/unresolved.json"
pnpm i18n-extract && pnpm refresh-assets
pnpm i18n-validate && pnpm i18n-extract --check
```

`apply.mjs` writes accepted text in each catalog's format, records exactly those pairs in the ledger, merges glossary updates and leaves unresolved and low-confidence entries pending for the next run. If `i18n-validate` fails on an applied entry, send it back for a focused review pass rather than editing JSON. For comprehensive modes, keep a scratch list with a disposition for every selected key and locale; for a previously current entry left unresolved, run `translation-state.mjs invalidate` with its reviewed hashes so it shows as unverified next time.

Where practical, look at longer labels in the running UI, including RTL locales. Report checks not performed; syntax validation never proves translation quality.

## 6. Deliver

Follow `skills/pr/SKILL.md`. Include the mode, locales, counts of new, revised, retained and unresolved entries, notable terminology decisions, checks run and limitations. Partial batches go in a clearly labeled draft PR listing what's unresolved. If nothing changed, report the no-op instead of opening an empty PR. Don't merge unless asked; the weekly workflow decides auto-merge itself.
