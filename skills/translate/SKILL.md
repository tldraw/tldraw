---
name: translate
description: Update tldraw's website and editor translations from English, using repository context and independent review. Maintain translations incrementally, review all existing translations, or retranslate from scratch; validate the catalogs and open a pull request. Use for translation maintenance or a full translation update, not for translating a standalone passage or reviewing an automated Lokalise strings PR (use review-translations for that).
---

# Translate

Produce a translation PR for the requested locales, or all supported non-English locales when none are specified. Cover both the website and editor catalogs. Choose the mode from the request:

| Mode                     | Scope and behavior                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Incremental (default)    | Review missing and changed entries; preserve current translations. Unverified entries (held back by an earlier review) wait for a full review. The weekly workflow runs this mode.                                                                      |
| Full review              | Judge every current English key against its existing translation and actual app behavior, including previously reviewed entries whose hashes still match. Retain correct text and generate replacements for contextual errors.    |
| Retranslate from scratch | Generate fresh candidates for every current English key before exposing the generator to existing translations. Independently review all candidates against the code, then compare with the baseline and integrate accepted text. |

Treat “full review” or “audit existing translations” as full review; “start over,” “fresh translation,” or “retranslate everything” selects retranslation. Never use matching hashes or previous approval as evidence of linguistic correctness in either comprehensive mode. These modes widen what gets reviewed; they are not permission to delete obsolete IDs or metadata.

**Lokalise is still connected.** `i18n-upload-strings` orders machine translations on every push to main, and the weekly `i18n-download-strings` overwrites whole catalogs with what Lokalise holds, which would undo this skill's work. Never run the Lokalise scripts from this workflow (they can buy translations). Before a PR from this skill merges, both Lokalise workflows must be disabled (`gh workflow list`); if they aren't, say so in the PR.

## Files

| What                      | Path                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| SDK English / targets     | `assets/translations/main.json` / `assets/translations/<locale>.json` (flat strings; `en.json` is an empty stub)           |
| Website English / targets | `apps/dotcom/client/public/tla/locales/en.json` / `…/locales/<locale>.json` (`{translation, …metadata}`, hash IDs)         |
| Supported locales         | `assets/translations/languages.json`; regional variants are separate languages; skip `main`, English and `xx-` debug files |
| Review ledger             | `internal/i18n/translation-state.json` ([references/incremental-state.md](references/incremental-state.md))                |
| Context notes             | `internal/i18n/context/<project>.json` ([references/context-notes.md](references/context-notes.md))                        |
| Glossaries                | `internal/i18n/glossary/<locale>.json` ([references/dispositions.md](references/dispositions.md))                          |

English is authored in source descriptors and extracted by `pnpm i18n-extract`; never edit the English catalogs or compiled outputs by hand. Catalogs, the ledger, notes and glossaries are written only by the scripts below, never by an agent editing JSON. `$SCRATCH` below is a task-specific scratch directory.

For incremental and full-review modes, `node skills/translate/scripts/run.mjs --mode <mode> [--locales es,pl] [--budget 25] [--limit n]` runs steps 1–6 unattended, each phase a separate `claude -p` with read-only tools, and stops starting work when the budget is spent. The `i18n translate` workflow runs it and opens a PR. The steps below are what it does, and how to do them by hand or for retranslation.

## 1. Plan

Work on a dedicated branch or worktree from the intended base, preserving unrelated edits, and check for open translation PRs that overlap. Run `pnpm i18n-extract` and commit any English change, so the English is current and in HEAD.

```sh
node skills/translate/scripts/translation-state.mjs plan [es,fr] [--all] > "$SCRATCH/plan.json"
node skills/translate/scripts/context.mjs plan [--all] > "$SCRATCH/context-plan.json"
```

`--all` on the translation plan includes current entries (full review, retranslation). `--all` on the context plan refreshes every note; use it for comprehensive modes and when call-site behavior changed without a copy change. Report `unsupported` and `obsolete` entries; don't translate or delete them.

## 2. Write context notes

For every pending note, read the message's descriptor and follow it into its call sites and handlers. Write a note per message (format in [references/context-notes.md](references/context-notes.md)): its UI role, what it does, what each placeholder holds, and constraints such as width, destructive actions or accessibility-only text. Follow the component into its handler when necessary: “Pin” is an action, “Padding” is export margin, and a style named “Draw” is not necessarily the drawing tool. Flag ambiguous English instead of guessing from the ID. Notes describe English and code only; never put a translation in one.

```sh
node skills/translate/scripts/context.mjs record "$SCRATCH/notes.json"
```

## 3. Triage existing translations

Skip in retranslation. Otherwise, have the reviewer (step 5's agent and checklist) judge every pending entry that already has text: retain it if it is right for how the app uses the message, or reject it with a reason. On the first run every existing translation is `unverified`: review it for retention, never assume it stale or bulk-approve it. Only rejected and missing entries go on to generation, so correct translations cost one review and no generation.

## 4. Generate, blind

```sh
node skills/translate/scripts/snapshot.mjs "$SCRATCH/snapshot" [--with-glossaries]
```

The snapshot is HEAD without any translation catalog, compiled copy, ledger, translated examples or (unless asked) glossary. It is a procedure, not a sandbox: restrict the generator to it explicitly. Pass `--with-glossaries` in incremental and full-review modes, never in retranslation, because glossaries are derived from existing translations.

Hand generation to a fresh agent (a separate subagent or `claude -p`) with no inherited conversation. Give it the keys to generate (step 3's rejected and missing entries, or every key in retranslation) with their English and context notes, and nothing from the existing translations or the triage reasons. Batch by key across all requested locales, splitting disjoint batches across parallel agents; only the coordinator merges results. Ask for `candidates.json` (format in [references/dispositions.md](references/dispositions.md)), and require:

- Placeholders, tags, select options and ICU keywords exactly as in English; plural forms the target language needs (`few`, `many`, `two`, `zero`), not English's set.
- The locale's conventional software terms and register; brands and product names untouched.
- A `note` on any candidate it is unsure of, and on important terminology choices.

## 5. Review

Hand review to a separate fresh agent with full repository access: the context notes, English, candidates, glossaries, and for each entry the existing translation and why triage rejected it. In retranslation, have it judge the candidates against English and code first, and only after those verdicts are frozen reveal the existing translations and glossaries for comparison. Review one key across all locales at a time: most mistakes repeat across languages and only stand out side by side.

Check each entry for:

1. **Word sense.** The commonest failure. From past runs: “Rhombus left” (a shape leaning left) as “the rhombus departed”; the “Copy” button as the noun “a copy”; “Changed page” (you are now on another page) as “modified page”; “Forget” (remove from a list) as “delete”; following someone's viewport as following on social media; clipboard Cut and Paste as cutting materials or glue. Judge what the handler does, not a banned-word list.
2. **Form for the UI.** Buttons and menu items take the form the language uses for controls (usually imperative or verbal noun), not an infinitive, first person or informal command. Tool names are nouns.
3. **References to other UI labels.** A string naming another part of the UI (“Preferences > Accessibility”) must use that locale's actual labels: find the label's key in the English catalog and read it in the same locale.
4. **Untranslated text.** English left inside a translation, including inside plural branches (`# other`). Brands and established loanwords are fine.
5. **Plural grammar.** Each form agrees with its count in that language; render a few counts (0, 1, 2, 5, 21) in your head for each branch. Don't require `many` for fr, es, it, pt or ca.
6. **Consistency.** Terms match the glossary and the rest of the locale; related actions stay distinct (duplicate vs copy, remove vs delete); one register throughout (de Sie/du, zh 您/你).
7. **Regressions.** When replacing an existing translation, check the old one wasn't better.
8. **Machine artifacts.** Hebrew niqqud, stray zero-width spaces (except Khmer word breaks), doubled punctuation, a full stop added to a short label.

A different phrase is not an error: distinguish a wrong sense from an acceptable variant. Give every reviewed entry a disposition (`retain`, `accept`, `revise`, `unresolved`) and a confidence. Mark `low` whenever the language is one the reviewer can't judge well; low-confidence entries are held back exactly like unresolved ones. Propose glossary entries for terms it verified. Output `dispositions.json` ([references/dispositions.md](references/dispositions.md)), combining step 3's retained entries with this step's.

## 6. Apply and validate

```sh
node skills/translate/scripts/apply.mjs "$SCRATCH/dispositions.json" --unresolved "$SCRATCH/unresolved.json"
pnpm i18n-extract && pnpm refresh-assets
pnpm i18n-validate && pnpm i18n-extract --check
```

`apply.mjs` checks the whole file first, then runs every proposed and retained text through `pnpm i18n-validate --entries`. It writes only valid, high-confidence text, in each catalog's format and key order, and records exactly those pairs in the ledger. Unresolved, low-confidence and invalid entries change nothing, lose any earlier approval, and come back on the next run. It touches no key outside the dispositions; check `git diff --stat` shows only catalogs, compiled locales, `packages/assets/translations` and `internal/i18n`. Send held-back entries back for a focused review pass rather than editing JSON. Only when an unsure fix beats what ships (a missing translation, or text the validator or a known bad string flags), pass `--accept-low` with a dispositions file listing just those entries: it writes their low-confidence text but leaves them unverified. For comprehensive modes, keep a scratch list with a disposition for every selected key and locale.

Where practical, look at longer labels in the running UI, including RTL locales. Report checks not performed; syntax validation never proves translation quality.

## 7. Deliver

Follow `skills/pr/SKILL.md`. Include the mode, locales, counts of new, revised, retained and held-back entries, notable terminology decisions, checks run and limitations. Partial batches go in a clearly labeled draft PR listing what's held back. If nothing changed, report the no-op instead of opening an empty PR. Don't merge unless asked.
