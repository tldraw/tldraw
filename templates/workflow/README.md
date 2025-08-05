<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This repo contains a starter-kit for making a workflow type application using [tldraw](https://github.com/tldraw/tldraw).

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open `http://localhost:5173/` in your browser to see the app.

## Overview

This starter kit has 3 main concepts:

1. Nodes. Nodes are shapes that accept inputs, and produce outputs.
2. Connections. A connection joins the output of one node to the input of another.
3. Ports. Ports are places on nodes that connections can join to.

There are lots of useful interactions the user can take involving these concepts:

- Clicking on an output port lets the user create a new node
- Dragging from a port lets the user create a new connection
- Dragging from an output port lets the user create a new node
- Clicking in the middle of a port lets the user create a new node
- Dragging a connection lets the user connect it to a different node, or disconnect it entirely

We also include a demonstration of how information might flow through a graph of nodes. Nodes update instantly to show their results. There's also a "play" button to show how execution in a real service that was making API calls might work.

## File structure

- **`src/App.tsx`:** The main entry-point of the app. This renders the `<Tldraw />` component and brings in all the customizations the make this a workflow app.
- **`src/nodes`:** Everything related to nodes
  - **`src/nodes/NodeShapeUtil.tsx`:** The node shape util, which defines a custom tldraw shape for our nodes.
  - **`src/nodes/nodePorts.tsx`:** Helpers for efficiently working with the ports on a node, and the values flowing through them.
  - **`src/nodes/types`:** Each different node type. We have nodes for basic math operations, setting number with a slider, and conditionals.
- **`src/connection`:** Everything related to connections.
  - **`src/connection/ConnectionShapeUtil.tsx`:** The connection shape util, which defines a custom tldraw shape for our connections.
  - **`src/connection/ConnectionBindingUtil.tsx`:** The connection binding util. A binding is how tldraw models relationships between shapes. Each connection has two bindings - one to the start node, and one to the end node.
  - **`src/connection/insertNodeWithinConnection.tsx`:** A helper for inserting a new node in the middle of a connection.
  - **`src/connection/keepConnectionsAtBottom.tsx`:** A set of tldraw side effect listeners that make sure connection are below all other shapes in the z-order.
- **`src/ports`:** Everything related to ports.
  - **`src/ports/Port.tsx`:** Defines the types for ports, and a React component for rendering them.
  - **`src/ports/PointingPort.tsx`:** An entry in tldraw's interaction state tree which extends the built-in select tool with custom behavior when interacting with ports.
- **`src/execution`:** Everything related to async execution of workflow graphs
  - **`src/execution/ExecutionGraph.tsx`:** The execution graph, which runs workflows.
- **`src/components`:** UI and on-canvas react components.
  - **`src/components/WorkflowToolbar.tsx`:** A replacement for tldraw's default toolbar. This one renders vertically down the left of the screen, and emphasizes our workflow tools.
  - **`src/components/OnCanvasComponentPicker.tsx`:** A panel that appears on the canvas that lets users choose a new node to insert. This is used with some of the on-canvas interactions described above.
  - **`src/components/WorkflowRegions.tsx`:** Finds sets of connected nodes that forms workflows, draws a box around them, and provides a "play" button for running the workflow.

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/vite-template/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Please see our [contributing guide](https://github.com/tldraw/tldraw/blob/main/CONTRIBUTING.md). Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).
