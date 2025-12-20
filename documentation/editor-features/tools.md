---
title: Tools
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - tools
  - StateNode
  - state machine
  - events
  - interaction
---

## Overview

The tools system implements user interactions through a hierarchical state machine. Each tool is a `StateNode` that handles input events and manages its own internal states. The editor maintains a single active tool at a time, routing events through the tool hierarchy. Tools can have child states for complex interactions (e.g., the select tool has Idle, Pointing, Translating, Resizing states). The state machine pattern enables clean separation between different interaction modes.

<!-- TODO: Expand this documentation -->

## Key files

- packages/editor/src/lib/editor/tools/StateNode.ts - Base state node class
- packages/editor/src/lib/editor/tools/RootState.ts - Root of the state hierarchy
- packages/editor/src/lib/editor/Editor.ts - Tool management methods (setCurrentTool, getCurrentTool)

## Related

- [Input handling](./input-handling.md)
- [Click detection](./click-detection.md)
- [Tick system](./tick-system.md)
