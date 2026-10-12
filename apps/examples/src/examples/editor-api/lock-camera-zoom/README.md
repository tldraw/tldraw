---
title: Lock camera zoom
component: ./LockCameraZoomExample.tsx
priority: 2
keywords:
  [
    camera,
    zoom,
    lock,
    setcameraoptions,
    zoomsteps,
    getzoomlevel,
    getcameraoptions,
    viewport,
    fixed zoom,
  ]
---

Lock the camera at its current zoom level by collapsing `zoomSteps` to a single value.

---

The camera's `zoomSteps` option defines the zoom levels the camera can move between; the smallest and largest steps also bound the zoom range. Setting `zoomSteps` to a single value equal to the current zoom (`editor.setCameraOptions({ zoomSteps: [editor.getZoomLevel()] })`) means every zoom gesture, shortcut, and menu action has nowhere to go, so the zoom stays fixed while panning still works. Restoring `DEFAULT_CAMERA_OPTIONS.zoomSteps` unlocks it.

Press Shift+K to lock the camera at its current zoom, then try scrolling, pinching, or using the zoom menu. Press Shift+K again to unlock.
