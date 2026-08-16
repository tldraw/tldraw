---
title: Floaty window
component: ./FloatyExample.tsx
priority: 30
keywords: [camera, setcamera, window position, screenx, screeny, tick event]
---

Pin the canvas to the desktop so the browser window appears to float over it.

---

On every editor `tick`, the example reads `window.screenX` and `window.screenY` and, if the window has moved, calls `editor.setCamera()` with the negative offset. The canvas stays put on screen while the window slides over it, an illusion that was [popular on social media](https://x.com/steveruizok/status/1727436505440981099) for a while.

Try dragging the browser window around the screen (it won't work while the window is maximized).
