# Candidates, dispositions and glossaries

## Candidates (generator output)

```json
[
	{ "project": "sdk", "locale": "es", "key": "action.paste", "text": "Pegar" },
	{
		"project": "dotcom",
		"locale": "pl",
		"key": "68240daa8f",
		"text": "<name>{a}</name>, <name>{b}</name> i {count, plural, one {# inna osoba} few {# inne osoby} many {# innych osób} other {# innej osoby}} zareagowali",
		"note": "Third-person plural past tense; gender-neutral where Polish allows"
	}
]
```

Candidates are proposals only; nothing reads them except the reviewer.

## Dispositions (reviewer output, input to `apply.mjs`)

```json
{
	"entries": [
		{ "project": "sdk", "locale": "es", "key": "action.copy", "decision": "retain", "confidence": "high" },
		{ "project": "sdk", "locale": "es", "key": "action.paste", "decision": "accept", "text": "Pegar", "confidence": "high" },
		{
			"project": "sdk",
			"locale": "de",
			"key": "tool.rhombus-left",
			"decision": "revise",
			"text": "Raute links",
			"confidence": "high",
			"reason": "Candidate read 'left' as a verb"
		},
		{
			"project": "sdk",
			"locale": "so",
			"key": "action.flip-horizontal",
			"decision": "accept",
			"text": "…",
			"confidence": "low",
			"reason": "Can't verify Somali UI conventions"
		},
		{ "project": "dotcom", "locale": "ja", "key": "887479cb61", "decision": "unresolved", "confidence": "high", "reason": "English is ambiguous; see note" }
	],
	"glossary": {
		"es": {
			"register": "Usted; imperative for actions",
			"terms": [{ "term": "Paste", "translation": "Pegar", "note": "Clipboard command, not glue" }]
		}
	}
}
```

| `decision`   | Meaning                                              | `text`   |
| ------------ | ---------------------------------------------------- | -------- |
| `retain`     | The existing translation is correct; keep it.        | omit     |
| `accept`     | Use the candidate as is.                             | required |
| `revise`     | Use the reviewer's corrected text.                   | required |
| `unresolved` | Needs another pass or a human; change nothing.       | omit     |

`confidence` is required on every entry. `low` means the reviewer can't vouch for the result, usually because it doesn't know the language's software conventions well enough. `apply.mjs` treats `low` exactly like `unresolved`: nothing is written or recorded, the entry stays pending, and the weekly workflow won't auto-merge. Give a `reason` for every `revise`, `unresolved` and `low` entry.

`apply.mjs` validates the whole file before writing anything: unknown keys, `retain` on a missing translation, text on `retain`, or missing text on `accept`/`revise` fail the run.

## Glossaries

`internal/i18n/glossary/<locale>.json` holds the locale's register and the terms a reviewer verified against app behavior:

```json
{
	"register": "Usted; imperative for actions",
	"terms": [
		{ "term": "Copy", "translation": "Copiar" },
		{ "term": "Paste", "translation": "Pegar", "note": "Clipboard command, not glue" }
	]
}
```

Updates merge by term (case-insensitive); a new translation replaces the old one. Keep it to terms that recur or that past runs got wrong; it isn't a copy of the catalog. A glossary is evidence, not authority: if a term is wrong for how the app behaves, the reviewer replaces it and says why.
