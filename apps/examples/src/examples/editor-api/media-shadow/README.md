---
title: Media shadow playground
component: ./MediaShadowExample.tsx
priority: 10
keywords: [image, video, border, shadow, drop shadow, style, styleprop, playground]
---

Tune the drop shadow for image and video shapes with live sliders.

---

Image and video shapes have a `border` shared style prop with the values `none`, `solid`, `shadow`, and `shadow-hard`. This example is a playground for tuning the `shadow` treatment: the sliders drive the `--tl-media-shadow-*` CSS variables that the shape's `drop-shadow` filter reads, so changes apply live. You can also switch the border from the style panel when an image or video is selected.
