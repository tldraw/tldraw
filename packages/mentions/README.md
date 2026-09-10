# @tldraw/mentions

The tldraw `@`-mention picker and TipTap mention node. Shared by `@tldraw/commenting` (the comment
composer) and tldraw shape rich text, so mentioning works the same wherever rich text is edited.

This package owns:

- `createMentionExtension` — the TipTap mention node, configured to render as a pill and (optionally)
  drive the `@` picker.
- `createMentionSuggestion` — the TipTap `suggestion` config that shows the live member picker as you
  type after `@`, anchored to the editor and (on canvas) re-anchored as the camera moves.
- `MentionList` / `Mention` / `Avatar` — the presentational picker and pill components.
- `filterMentionMembers`, `isMentionPickerOpen` — helpers for hosts.

The host owns the roster: pass a resolver that returns the members matching an `@`-query, and a
`resolveName` that maps a stored member id to its current display name.
