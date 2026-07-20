---
title: Shape mentions
component: ./ShapeMentionsExample.tsx
priority: 2
keywords: [mentions, at mention, mention, rich text, tiptap, text, people, roster, collaboration]
---

Mention people from inside a shape's rich text.

---

The `@tldraw/mentions` package provides the same `@`-mention picker used by comments as a TipTap
node you can drop into any rich-text editor — including the text inside shapes. Double-click a text,
note, or geo shape to edit its label, type `@`, and pick someone from the roster; the mention is
inserted as a pill that keeps showing the member's current name.

You wire it in through the editor's text options. `createMentionExtension` builds the mention node
(pass `resolveName` to map a stored member id to a display name, and a `suggestion` to drive the
picker), and `createMentionSuggestion` builds that picker from your roster resolver. Add the node to
`tipTapDefaultExtensions` and pass the list as `options.text.tipTapConfig.extensions`. Because that
extension set is shared by every place a shape renders its text, the mention pill shows up the same
whether the shape is being edited, drawn on the canvas, or exported.

The host owns the roster: `createMentionSuggestion` takes a function that returns the members
matching the current query (`filterMentionMembers` is a simple case-insensitive default), so the
picker can source people from wherever your app keeps them.
