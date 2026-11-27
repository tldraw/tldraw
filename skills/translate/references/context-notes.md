# Context notes

`internal/i18n/context/sdk.json` and `dotcom.json` hold one note per English message, written once and reused by every later run, so translators and reviewers start from what the message does rather than rediscovering it from the code.

```json
{
	"tool.rhombus-left": {
		"sourceHash": "<from context.mjs plan>",
		"role": "label",
		"meaning": "Name of a geo shape: a rhombus leaning to the left. 'Left' is a direction, not a verb.",
		"callSites": ["packages/tldraw/src/lib/ui/hooks/useTools.tsx"],
		"constraints": ["Toolbar tooltip; keep short"]
	},
	"68240daa8f": {
		"sourceHash": "<…>",
		"role": "body",
		"meaning": "Summary of who reacted to a comment with an emoji.",
		"callSites": ["apps/dotcom/client/src/tla/components/comments/Reactions.tsx"],
		"placeholders": {
			"a": "Display name of the first person who reacted",
			"b": "Display name of the second person",
			"count": "How many others reacted, 1 or more"
		}
	}
}
```

`role` is one of `action` (buttons, menu items, commands), `label` (names of tools, shapes, settings), `state`, `heading`, `tooltip`, `announcement` (screen-reader only), `error` or `body`.

Write the note from the descriptor, its call sites and the handler it triggers. Say what the user sees and what happens, in plain English. Name the trap when there is one (a word with a likelier wrong sense, a placeholder whose type isn't obvious). Never include a translation.

Record notes with `context.mjs record <notes.json>`, passing an array of `{project, key, sourceHash, role, meaning, callSites, placeholders?, constraints?}`. It checks every note against the current English and that every call site exists, writes nothing if any check fails, and drops notes for messages that no longer exist.

A note goes stale when its English or metadata changes or a call site it names disappears. A change in behavior behind an unchanged call site isn't detected; refresh with `context.mjs plan --all` in comprehensive modes or when a feature's behavior changed.
