# @tldraw/commenting

tldraw's commenting UI components — the presentational pieces of the commenting feature
(avatars, comment cards, composer, threads, sidebar, pins, and so on).

The components are pure React and take presentational props; a consumer maps its data
model (the `TLComment` / `TLCommentThread` records from `@tldraw/tlschema`) onto them
through its own adapter. Their CSS uses tldraw's `--tl-color-*` theme tokens, so render
them inside a tldraw theme.

They are developed in isolation in `apps/component-studio`.
