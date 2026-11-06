---
title: Permission rules
component: ./PermissionRulesExample.tsx
priority: 5
keywords:
  [
    permissions,
    access control,
    rules,
    read-only,
    sync,
    multiplayer,
    classroom,
    share links,
    private pages,
    agents,
  ]
multiplayer: true
---

Access rules as data, checked the same way in the editor and in the sync room.

---

The example runs a real sync room in the browser and connects several panes to it, one per person. The room enforces a rule set from `@tldraw/rules`: it checks each write, stamps trusted fields, and sends each person only the records they may read. The editor gets the same rules from the room and uses them to hide tools, lock shapes, derive read-only mode, and explain denials. Pick a scenario, switch who each pane is, and edit the rules live in the side panel.
