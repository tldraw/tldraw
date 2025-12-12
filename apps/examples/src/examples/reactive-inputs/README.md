---
title: Reactive inputs
component: ./ReactiveInputsExample.tsx
category: editor-api
priority: 3
keywords: ['input', 'mouse', 'pointer', 'position', 'velocity', 'reactive', 'state']
---

Reactively track mouse positions and velocities using the editor's inputs manager.

---

The editor's inputs manager provides reactive access to pointer state including current, previous, and origin positions (in both screen and page space), as well as pointer velocity. All properties are backed by reactive atoms that automatically trigger updates when they change.

This example demonstrates how to use `useValue` to subscribe to these reactive inputs and display them in real-time as the user moves their mouse.
