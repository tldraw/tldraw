---
title: Commenting on mobile
component: ./CommentingMobileExample.tsx
priority: 5
keywords:
  [
    comments,
    commenting,
    mobile,
    responsive,
    breakpoint,
    forceMobile,
    thread,
    composer,
    placement,
    keyboard,
  ]
---

Commenting with the mobile layout, where the thread popover and composer place themselves to stay on-screen above the keyboard.

---

The same setup as the [Commenting](/examples/commenting) example, with `forceMobile` on the editor so the mobile layout shows on any screen size.

In mobile mode the thread popover and the new-comment composer position themselves relative to the pin and the visual viewport rather than sitting at a fixed offset. They pick a side of the pin that keeps the whole panel on-screen, and ride up when the software keyboard shrinks the viewport instead of hiding behind it. Place a comment near an edge to see the placement adapt.

Drop `forceMobile` and the layout switches on the viewport width, the way it does on a real device.
