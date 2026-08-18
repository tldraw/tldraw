---
title: Camera options
component: ./CameraOptionsExample.tsx
priority: 0.5
keywords:
  [
    camera,
    cameraoptions,
    zoom constraints,
    pan constraints,
    camera bounds,
    zoom speed,
    pan speed,
    viewport,
    isfixed,
  ]
---

Configure the camera's constraints, zoom steps, and wheel behavior, and change them live.

---

The `Tldraw` component takes its initial camera configuration from `options={{ camera: { ... } }}`, a `TLCameraOptions` object. It controls whether the camera is locked, what the mouse wheel does, pan and zoom speed, the zoom steps, and (optionally) constraints that keep the camera inside a bounded area with a chosen fit behavior, padding, and origin.

The control panel in this example changes the options at runtime with `editor.setCameraOptions()` so you can see the effect of each setting. The dashed rectangle on the canvas is the constraint bounds; the dotted rectangle in front of the canvas is the padding.

Try switching bounds between "A4 page" and "landscape", then change behavior from `contain` to `inside` or `outside` and pan around. "Reset camera" re-fits the camera to the current constraints; "Reset camera options" restores the defaults.
