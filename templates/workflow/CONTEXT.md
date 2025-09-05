# Workflow Template Context

## Overview

This is a starter template for building workflow/flowchart applications using tldraw. It demonstrates how to create a node-based visual programming interface where users can connect functional nodes to create executable workflows.

## Key Concepts

### Nodes

- **NodeShapeUtil** (`src/nodes/NodeShapeUtil.tsx`): Custom tldraw shape representing workflow nodes
- **Node Types** (`src/nodes/types/`): Different node implementations including:
  - `AddNode`, `SubtractNode`, `MultiplyNode`, `DivideNode`: Mathematical operations
  - `SliderNode`: Input node with slider control
  - `ConditionalNode`: Conditional logic node
- **Node Ports** (`src/nodes/nodePorts.tsx`): Helper functions for managing input/output ports on nodes

### Connections

- **ConnectionShapeUtil** (`src/connection/ConnectionShapeUtil.tsx`): Custom shape for connecting nodes
- **ConnectionBindingUtil** (`src/connection/ConnectionBindingUtil.tsx`): Manages relationships between connected nodes
- **Connection Management**: Utilities for inserting nodes within connections and maintaining visual hierarchy

### Ports

- **Port System** (`src/ports/Port.tsx`): Defines input/output connection points on nodes
- **PointingPort** (`src/ports/PointingPort.tsx`): Custom interaction state for port-specific behaviors

### Execution System

- **ExecutionGraph** (`src/execution/ExecutionGraph.tsx`): Handles asynchronous execution of workflow graphs
- **Real-time Updates**: Nodes update instantly to show results
- **Async Execution**: Demonstrates how workflows might execute against real services

## Key Features

### Interactive Behaviors

- Click output ports to create new connected nodes
- Drag from ports to create connections
- Insert nodes by clicking connection midpoints
- Reconnect or disconnect existing connections
- Visual workflow regions with execution controls

### Custom UI Components

- **WorkflowToolbar** (`src/components/WorkflowToolbar.tsx`): Vertical toolbar with workflow-specific tools
- **OnCanvasComponentPicker** (`src/components/OnCanvasComponentPicker.tsx`): Node selection interface
- **WorkflowRegions** (`src/components/WorkflowRegions.tsx`): Visual grouping of connected nodes with play buttons

## Architecture Patterns

### Extending tldraw

- **Custom Shapes**: `NodeShapeUtil` and `ConnectionShapeUtil` extend tldraw's shape system
- **Custom Bindings**: `ConnectionBindingUtil` manages node-to-node relationships
- **Tool Extensions**: `PointingPort` extends the select tool with port-specific interactions
- **UI Customization**: Complete replacement of toolbar and addition of canvas overlays

### State Management

- Uses tldraw's reactive state system for shape data
- Node values flow through connections using port system
- Execution state managed separately for workflow running

### Event Handling

- **Port Interactions**: Custom pointer events for creating connections and nodes
- **Connection Management**: Automatic connection rerouting and cleanup
- **Z-Order Management**: Connections automatically stay below nodes

## Development Patterns

### Creating New Node Types

1. Extend base node interface in `src/nodes/types/shared.tsx`
2. Implement node component with ports configuration
3. Add to `nodeTypes` registry in `src/nodes/nodeTypes.tsx`
4. Update toolbar in `src/components/WorkflowToolbar.tsx`

### Custom Interactions

- Extend `PointingPort` state node for new port behaviors
- Use tldraw's event system for custom shape interactions
- Leverage binding system for automatic relationship management

## File Structure

```
src/
├── App.tsx                 # Main app with tldraw customizations
├── main.tsx               # React entry point
├── nodes/                 # Node system
│   ├── NodeShapeUtil.tsx  # Core node shape implementation
│   ├── nodePorts.tsx      # Port management utilities
│   ├── nodeTypes.tsx      # Node type registry
│   └── types/             # Individual node implementations
├── connection/            # Connection system
│   ├── ConnectionShapeUtil.tsx     # Connection shape
│   ├── ConnectionBindingUtil.tsx   # Connection relationships
│   └── [other connection utils]
├── ports/                 # Port interaction system
├── execution/             # Workflow execution engine
└── components/            # UI components
    ├── WorkflowToolbar.tsx
    ├── OnCanvasComponentPicker.tsx
    └── WorkflowRegions.tsx
```

## Usage

Run with `yarn dev` to start development server. The template showcases:

- Creating and connecting nodes
- Real-time value propagation
- Workflow execution simulation
- Custom tldraw UI integration

This template serves as a foundation for building more complex workflow applications, visual programming tools, or node-based editors.
