---
title: Glossary
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - glossary
  - terms
  - definitions
  - reference
---

## Overview

Short definitions for common terms used in tldraw docs and code.

## Core concepts

- Editor: the main orchestration class for tools, shapes, and state.
- Store: the reactive record database.
- Shape: a canvas element stored as a record.
- ShapeUtil: the class that defines a shape's behavior and rendering.
- Tool: a `StateNode` that handles user input.
- Binding: a relationship between two shapes.

## State management

- Atom: mutable signal value.
- Computed: derived signal value.
- Transaction: batched updates applied atomically.

## Multiplayer

- Room: a shared editing session.
- Presence: other users' cursors and selections.
- Sync: diff-based state synchronization.

## UI

- Component override: a custom UI component replacing a default.
- Style panel: UI for editing shared styles.

## Abbreviations

| Abbreviation | Meaning                            |
| ------------ | ---------------------------------- |
| TL           | tldraw type prefix                 |
| DO           | Durable Object                     |
| R2           | Cloudflare object storage          |
| SSE          | Server-Sent Events                 |
| CRDT         | Conflict-free Replicated Data Type |
| E2E          | End-to-End testing                 |

## Related

- [Architecture overview](../overview/architecture-overview.md)
- [@tldraw/editor](../packages/editor.md)
- [@tldraw/store](../packages/store.md)
