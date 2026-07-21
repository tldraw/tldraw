-- Emoji reactions, stored on the thread rather than on the individual comment (see
-- TLCommentThread.reactions / TLCommentReactions in tlschema). Reactions are per-comment, but the
-- column lives here for two reasons: comment records are owner-only for updates in the sync
-- server's record authorizers, so reacting to someone else's comment could never write to their
-- record, while threads stay writable by anyone with access; and the value is keyed by comment id
-- and then by user id, so sync's per-key object diffing lets concurrent reactions merge instead of
-- overwriting one another.
--
-- Shape: { [commentId]: { [userId]: { emoji, createdAt } } }. Null means nobody has reacted,
-- matching the record field's nullability. Keys for deleted comments are ignored when rendering.
--
-- Declared in the Zero schema too, so reactions travel with comments on both retrieval paths —
-- over sync for the in-document view, and via Zero for app-level queries — the same way `body`
-- does. Being JSONB, the contents stay unreachable from ZQL: clients read the object, but the
-- server can't filter on it.

ALTER TABLE comment_thread ADD COLUMN "reactions" JSONB;
