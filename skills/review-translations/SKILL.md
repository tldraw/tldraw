---
name: review-translations
description: Review new and changed translations in an automated i18n strings PR (or any range of commits) for wrong meaning, wrong register, untranslated text and inconsistent terms, and propose fixes as i18n-fix-strings entries. Use when asked to review translations, review an "[automated] update i18n strings" PR, check machine translations from Lokalise, or when the i18n download workflow runs its review step.
---

# Review translations

Machine translations arrive from Lokalise (Google, tier 1) through `internal/scripts/i18n-download-strings.ts`. `pnpm i18n-check` already rejects structural breakage — ICU that won't parse, renamed placeholders, dropped tags, lost plurals — so the job here is meaning: what a translator would catch and a parser can't.

**Target**: $ARGUMENTS (a PR number, a `base head` ref pair, or a prepared changed-strings file; defaults to `HEAD~1 HEAD`)

## Gather the changes

Run the bundled script, or read the file it already wrote if you were given one:

```bash
node skills/review-translations/scripts/changed-strings.mjs <base> <head>
```

For a PR, `base` is its merge base with `main` and `head` is the PR's head commit. The output groups every changed translation by key, with the English and each locale's before and after. Review it key by key, across all languages at once: most mistakes repeat in many languages and only stand out side by side.

## What to look for

Check every new or changed translation for:

1. **Wrong word sense.** The classic machine-translation failure. Examples from past runs:
   - "Rhombus left" (a shape leaning left) as "the rhombus departed".
   - "Copy" on a button as the noun "a copy" instead of the verb.
   - "Changed page" (you are now on another page) as "modified page".
   - "Note:" as a memo or notebook rather than "N.B.".
   - "Comment" as "article" or "critique".
   - "Following" someone's viewport as following on social media.
   - "Forget" (remove from a list) as "delete".
2. **Wrong form for the UI.** Button labels and menu items need the form the language uses for controls — usually the imperative or a verbal noun, not an infinitive, a first-person verb ("I go back"), or an informal command. Tool names are nouns, not imperatives.
3. **References to other UI labels.** A string that names another part of the UI ("Preferences > Accessibility", "the File menu", "'Import file'") must use that locale's actual labels. Look them up in the same locale file (`menu.preferences`, `menu.accessibility`, `menu.file`, …) and grep for the labels the English names.
4. **Untranslated or half-translated text.** English left inside a translation, such as `# other` / `# others` inside a plural, or a whole string left in English. Brand names, product names and common loanwords (PNG, SVG, Discord, tldraw, often "laser", "frame") are fine.
5. **Plural grammar.** In an ICU plural, each form must agree with its count in that language — for example Russian `one {# ответ} few {# ответа} many {# ответов}`. Never require `many` for fr, es, it, pt or ca; it only applies to large round numbers there.
6. **Consistency.** A term should match how the same locale already says it elsewhere: grep the locale file for the English word's other translations. Flag a mix of formal and informal address (zh 您 and 你, de Sie and du) within one change.
7. **Regressions.** A changed translation that was better before. Check the before column, not just the after.
8. **Machine artifacts.** Hebrew vowel marks (niqqud), stray zero-width spaces (`U+200B`; Khmer uses them between words, so leave Khmer alone), doubled punctuation, a full stop added to a short label.

Do not flag style preferences where the translation is already correct and natural, and say plainly when you aren't sure about a language rather than guessing.

## How fixes are applied

Translations are fixed in Lokalise, never by editing the repo's locale files: the next download would overwrite them. Fixes go into `FIXES` in `internal/scripts/i18n-fix-strings.ts` and are applied with `pnpm i18n-fix-strings --project=<sdk|dotcom> --apply`.

Each entry looks like this:

```ts
{
	project: 'sdk', // 'sdk' for assets/translations, 'dotcom' for apps/dotcom/client/public/tla/locales
	key: 'toast.moved-to-page.action', // the key name exactly as in the locale file
	english: 'Go back',
	translations: {
		pl: { value: 'Wróć', note: 'Was the infinitive "Wracać"; a button needs the imperative.' },
	},
},
```

Value rules:

- **Placeholders.** Write plain placeholders in Lokalise's native form, `[%1$s:name]`, in both `english` and `value`, keeping the English name: `{page}` in the repo is `[%1$s:page]` here.
- **Whole-string plurals.** When the English is one plural that is the whole string (`{count, plural, one {# reply} other {# replies}}`), the key is a plural key in Lokalise, and `value` is a map of forms: `{ one: '# ответ', few: '# ответа', many: '# ответов', other: '# ответа' }`. Include every form the language needs.
- **Plurals inside a sentence, exact matches (`=1`) or nested plurals.** The key is a plain key and `value` is the full ICU string, written as in the repo.
- **Keys and English.** Never translate ICU keywords, placeholder names or tag names.

## Output

Write the review as Markdown, for a PR comment:

1. One line with the verdict: how many translations you checked and how many need fixing, or that none do.
2. The problems, most serious first, grouped by key. For each, give the locales it affects, the current text, the suggested text and a short reason.
3. A collapsed `<details>` block with the `FIXES` entries for everything you'd change, ready to paste into `i18n-fix-strings.ts`.
4. A short list of languages you were less sure about, if any.

Keep it to what needs action. Don't restate translations that are fine.
