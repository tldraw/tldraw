---
title: Tool Chain Editor (React Flow)
description: Integrate an interactive tool-chain-editor within the tldraw canvas ecosystem, supporting automatic rendering, drag-and-drop, connections, and parameter editing.
category: use-cases
priority: 1
component: ./index.tsx
keywords:
  - tool chain
  - react-flow
  - LLM
  - canvas
  - editor
multiplayer: false
details: |
  Tool-chain-editor as the main component, coexisting with canvas ecosystem. Supports automatic rendering of tool chains (mock data), node dragging, connections, parameter editing, with future LLM integration capabilities.
path: /examples/tool-chain-editor
---

# ToolChainEditor Example

This example demonstrates how to integrate a react-flow based Tool Chain Editor within the tldraw canvas ecosystem.

## Features
- Supports automatic rendering of tool chains (mock data)
- Nodes can be dragged and connected
- Node parameters can be edited by double-clicking
- ToolChainEditor as the main interaction, coexisting with canvas ecosystem
- Future integration with LLM-returned tool chain data

## Interaction Guide
- Users can input queries to automatically generate tool chains (currently mock data)
- Nodes can be dragged, connected, and parameters edited by double-clicking
- Input flows through connections, with node outputs serving as inputs for the next node

## Future Extensions
- Reserved interfaces for LLM auto-generated tool chain integration
- Support for more tool types, parameters, and execution workflows