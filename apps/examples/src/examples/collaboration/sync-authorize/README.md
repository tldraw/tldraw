---
title: Multiplayer sync with permission rules
component: ./SyncAuthorizeExample.tsx
priority: 4
keywords:
  [
    multiplayer,
    comments,
    sync,
    permissions,
    authorize,
    access control,
    roles,
    read control,
    write control,
    ownership,
    share link,
    agent,
  ]
---

Control who can see and change what with one `authorize` function, on the sync server and in the editor.

---

Three clients share one sync room in this page. One `authorize` function answers every question: may this user read this record, create it, update it, delete it, or do a custom action such as `cards:reveal` or `tool:draw`. The room runs it for every read and write. Each editor runs it too, through the `permissions` prop, to show the right tools, to make other users' shapes act locked, and to revert a denied write at once.

Things to try:

- Draw as Ana, then try to move the shape as Ben. Ben cannot select it.
- Open the page menu as Ana and as Ben. Each sees only their own team page.
- Switch a panel to the view-only link. The toolbar shrinks, and every write is denied.
- Look at the cards: each student sees only their own card's text until the teacher reveals the cards.
- Switch a panel to the bot and press "Run bot". Only the shape inside the bot's frame stays.
- As Ana, draw an arrow to the teacher's text. It does not bind, because the text acts locked for Ana.
- Comment as Ana. Ben can reply, but only Ana can edit or delete her comment. The teacher can delete any comment. The guest and the bot cannot comment.
- Turn off "Editor checks" in a panel. The editor then sends every write, and the room corrects it: try to move the teacher's text, and it moves back.
- With editor checks off, draw an arrow from your shape to the teacher's text. The room stores the arrow without its binding. Turn on atomic pushes, and the room rejects the whole arrow.
