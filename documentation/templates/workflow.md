---
title: Workflow template
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - workflow
  - flowchart
  - nodes
  - connections
  - template
---

The workflow template demonstrates how to build node-based visual programming interfaces using tldraw, featuring executable flowcharts with connected functional nodes.

## Quick start

```bash
npx create-tldraw my-app --template workflow
cd my-app
npm install
npm run dev
```

## What's included

- Custom node shapes with input/output ports
- Visual connections between nodes
- Real-time value propagation
- Executable workflow regions
- Mathematical operation nodes
- Custom toolbar and UI

## Architecture

### Custom shapes

**NodeShapeUtil** - Workflow nodes with ports:

```typescript
class NodeShapeUtil extends ShapeUtil<NodeShape> {
  static override type = 'node' as const

  override component(shape: NodeShape) {
    const nodeType = nodeTypes[shape.props.nodeType]
    return <nodeType.Component shape={shape} />
  }
}
```

**ConnectionShapeUtil** - Visual links between nodes:

```typescript
class ConnectionShapeUtil extends ShapeUtil<ConnectionShape> {
  static override type = 'connection' as const
  // Renders bezier curves between connected ports
}
```

### Binding system

**ConnectionBindingUtil** - Manages node relationships:

```typescript
class ConnectionBindingUtil extends BindingUtil<ConnectionBinding> {
  static override type = 'connection' as const

  override onAfterChangeFromShape() {
    // Update connection when source node moves
  }

  override onAfterChangeToShape() {
    // Update connection when target node moves
  }
}
```

## Node types

Built-in mathematical operation nodes:

| Node | Description | Inputs | Output |
|------|-------------|--------|--------|
| SliderNode | User input via slider | None | Number |
| AddNode | Addition | A, B | A + B |
| SubtractNode | Subtraction | A, B | A - B |
| MultiplyNode | Multiplication | A, B | A × B |
| DivideNode | Division | A, B | A ÷ B |
| ConditionalNode | Conditional logic | Condition, A, B | A or B |

### Creating new node types

```typescript
// src/nodes/types/MyNode.tsx
export const MyNode: NodeDefinition = {
  type: 'myNode',
  label: 'My Node',
  icon: MyIcon,
  getPorts: () => ({
    inputs: [{ id: 'input', label: 'In', type: 'number' }],
    outputs: [{ id: 'output', label: 'Out', type: 'number' }],
  }),
  Component: ({ shape }) => {
    // Render node UI
  },
  computeOutput: (inputs) => {
    return { output: inputs.input * 2 }
  },
}

// Register in nodeTypes.tsx
export const nodeTypes = {
  // ...existing nodes
  myNode: MyNode,
}
```

## Port system

Ports define connection points on nodes:

```typescript
interface Port {
  id: string
  label: string
  type: 'number' | 'boolean' | 'any'
  position: 'top' | 'bottom' | 'left' | 'right'
}

// Port interactions
class PointingPort extends StateNode {
  onPointerDown(info) {
    // Start connection from port
  }
  onPointerUp(info) {
    // Complete connection to target port
  }
}
```

## Execution system

The workflow execution engine evaluates connected nodes:

```typescript
// src/execution/ExecutionGraph.tsx
function executeGraph(nodes: NodeShape[], connections: ConnectionShape[]) {
  const sorted = topologicalSort(nodes, connections)

  for (const node of sorted) {
    const inputs = gatherInputs(node, connections)
    const outputs = nodeTypes[node.props.nodeType].computeOutput(inputs)
    // Update node display with results
  }
}
```

### Workflow regions

Connected node groups form executable regions:

```typescript
// WorkflowRegions.tsx
function WorkflowRegions() {
  const regions = findConnectedRegions(nodes)

  return regions.map(region => (
    <RegionOverlay key={region.id}>
      <PlayButton onClick={() => executeRegion(region)} />
    </RegionOverlay>
  ))
}
```

## Custom UI

### Toolbar

```typescript
// src/components/WorkflowToolbar.tsx
function WorkflowToolbar() {
  return (
    <div className="workflow-toolbar">
      {Object.entries(nodeTypes).map(([type, def]) => (
        <button
          key={type}
          onClick={() => createNode(type)}
          title={def.label}
        >
          <def.icon />
        </button>
      ))}
    </div>
  )
}
```

### Canvas integration

```typescript
<Tldraw
  shapeUtils={[NodeShapeUtil, ConnectionShapeUtil]}
  bindingUtils={[ConnectionBindingUtil]}
  tools={[PointingPort]}
  components={{
    Toolbar: WorkflowToolbar,
    InFrontOfTheCanvas: WorkflowRegions,
  }}
/>
```

## Interactive behaviors

- **Click output port**: Create new connected node
- **Drag from port**: Create connection to another node
- **Click connection midpoint**: Insert new node inline
- **Delete node**: Automatically cleanup connections
- **Drag node**: Connections follow automatically

## Project structure

```
src/
├── App.tsx                 # Main app with tldraw customizations
├── nodes/
│   ├── NodeShapeUtil.tsx   # Core node shape
│   ├── nodePorts.tsx       # Port utilities
│   ├── nodeTypes.tsx       # Node registry
│   └── types/              # Individual node implementations
├── connection/
│   ├── ConnectionShapeUtil.tsx
│   ├── ConnectionBindingUtil.tsx
│   └── keepConnectionsAtBottom.tsx
├── ports/
│   ├── Port.tsx
│   └── PointingPort.tsx
├── execution/
│   └── ExecutionGraph.tsx
└── components/
    ├── WorkflowToolbar.tsx
    └── WorkflowRegions.tsx
```

## Related

- [Custom shapes](../guides/custom-shapes.md) - Creating custom shapes
- [Custom tools](../guides/custom-tools.md) - Creating custom tools
- [Bindings system](../architecture/bindings.md) - Shape relationships
