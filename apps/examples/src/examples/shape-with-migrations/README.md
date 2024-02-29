---
title: Shape with migrations
component: ./ShapeWithMigrationsExample.tsx
category: shapes/tools
priority: 1
---

Migrate your shapes and their data between versions

---

Migrations are important when your application updates and changes the way your custom shapes work. When this happens there can be a risk of errors and bugs. For example, users with an old version of a shape in their documents might encounter errors when the editor tries to access a property that doesn't exist. This example shows how you can use our migrations system to update user data from previous versions to your latest one and vice versa. The most relevant file to look at is "myshape-migrations.ts".
