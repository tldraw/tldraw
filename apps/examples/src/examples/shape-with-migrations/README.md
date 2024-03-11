---
title: Shape with migrations
component: ./ShapeWithMigrationsExample.tsx
category: shapes/tools
priority: 3
---

Migrate your shapes and their data between versions

---

Sometimes you'll want to update the way a shape works in your application. When this happens there can be a risk of errors and bugs. For example, users with an old version of a shape in their documents might encounter errors when the editor tries to access a property that doesn't exist. This example shows how you can use our migrations system to preserve your users' data between versions. It uses a snapshot to load a document with a shape that is missing a "color" prop, and uses the migrations method of the shape util to update it.
