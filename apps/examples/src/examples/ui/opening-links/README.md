---
title: Opening links
component: ./OpeningLinksExample.tsx
priority: 50
keywords: [links, url, app links, openLink, getLinkOpenPolicy, confirm-open-link, security]
---

See which links open straight away and which ask first.

---

Shapes, bookmarks and rich text can link to web pages and to other apps, such as `vscode://` or
`slack://`. When someone clicks one, tldraw calls `getLinkOpenPolicy` to decide what to do:

- **Open**: web links, `mailto:` links, relative links, and links into well-known apps open straight away.
- **Confirm**: links into any other app emit a `confirm-open-link` event. The default UI answers it
  with a dialog that shows the link. With no listener, the link doesn't open.
- **Block**: links that `T.linkUrl` rejects, such as `javascript:` or `smb:`, never open. Shapes
  can't store them either.

Click the link buttons on the shapes, the bookmarks, and the links in the note to try each case.
To open links your own way, call `openLink(editor, url)`, or listen for `confirm-open-link` and
show your own prompt.
