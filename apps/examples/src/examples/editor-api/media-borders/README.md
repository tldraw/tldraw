---
title: Media borders
component: ./MediaBordersExample.tsx
priority: 10
keywords: [image, video, border, shadow, drop shadow, style, styleprop, playground]
---

Tune the border and shadow treatments for image and video shapes.

---

Image and video shapes have a `border` shared style prop with the values `none`, `solid`, `shadow`, and `shadow-hard`. This example is a playground for tuning them: pick a border type and the controls swap to what's relevant — thickness and color for `solid`, or offset, blur, and opacity for the shadows. The controls drive `--tl-media-*` CSS variables that the shape reads, so changes apply live. You can also switch the border from the style panel when an image or video is selected.
