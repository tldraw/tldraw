<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

This starter kit builds a visual node-graph editor for AI image generation pipelines on top of [tldraw](https://github.com/tldraw/tldraw). Users place nodes on an infinite canvas, wire up typed ports, and run the graph to generate images — similar to ComfyUI, but built with React and tldraw.

## Environment setup

Create a `.dev.vars` file in the root directory and add your Replicate API key:

```
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

Without a token, generation requests will fail with an error.

## Local development

Install dependencies with `yarn` or `npm install`.

Run the development server with `yarn dev` or `npm run dev`.

Open `http://localhost:5173/` in your browser to see the app.

## How it works

This starter kit has 3 main concepts:

1. **Nodes**: Nodes are shapes that accept inputs and produce outputs. There are 16 node types ranging from inputs (Model, Prompt, Load Image) to processing (Generate, ControlNet, Upscale) to display (Preview).
2. **Connections**: A connection joins the output of one node to the input of another. Connections are drawn as bezier curves and are color-coded by data type.
3. **Ports**: Ports are typed endpoints on nodes. Each port has a data type (`image`, `text`, `model`, `number`, `latent`, or `any`) and only compatible ports can be connected.

There are lots of useful interactions the user can take involving these concepts:

- Dragging from a port lets the user create a new connection
- Dragging from a port to empty space opens an on-canvas node picker
- Clicking in the middle of a connection lets the user insert a new node
- Connections enforce type compatibility — you can't connect an image port to a model port
- Cycle detection prevents circular dependencies

The app automatically detects groups of connected nodes and draws region overlays around them with play/stop controls. Each node also has a "play from here" button. The execution engine traverses the graph as a DAG, resolving dependencies and running nodes in order.

## File structure

- **`src/App.tsx`:** The main entry-point. Renders the `<Tldraw />` component with custom shape utils, a sidebar, and a default starter pipeline (Model → Prompt → Generate → Preview).
- **`src/nodes`:** Everything related to nodes.
  - **`src/nodes/NodeShapeUtil.tsx`:** The node shape util, which defines a custom tldraw shape for our nodes.
  - **`src/nodes/nodeTypes.tsx`:** The registry of all node type definitions.
  - **`src/nodes/nodePorts.tsx`:** Helpers for working with the ports on a node and the values flowing through them.
  - **`src/nodes/types/`:** Each node type definition. Nodes define their ports, default props, body height, execution logic, and React component.
- **`src/connection`:** Everything related to connections.
  - **`src/connection/ConnectionShapeUtil.tsx`:** The connection shape util, which renders bezier curves between ports.
  - **`src/connection/ConnectionBindingUtil.tsx`:** The connection binding util. Each connection has two bindings — one to the start node, and one to the end node.
  - **`src/connection/insertNodeWithinConnection.tsx`:** A helper for inserting a new node in the middle of a connection.
  - **`src/connection/keepConnectionsAtBottom.tsx`:** Side effect listeners that keep connections below nodes in the z-order.
- **`src/ports`:** Everything related to ports.
  - **`src/ports/Port.tsx`:** Defines port types and a React component for rendering them.
  - **`src/ports/PointingPort.tsx`:** An entry in tldraw's interaction state tree which extends the select tool with custom port interaction behavior.
  - **`src/ports/portCompatibility.ts`:** Type compatibility rules for connecting ports.
- **`src/execution`:** Everything related to running workflows.
  - **`src/execution/ExecutionGraph.tsx`:** The DAG execution engine that runs connected node graphs.
  - **`src/execution/executionState.ts`:** Execution state management — tracking which nodes are running, results, and errors.
- **`src/components`:** UI and on-canvas React components.
  - **`src/components/PipelineToolbar.tsx`:** A replacement for tldraw's default toolbar, rendered vertically on the left with draggable node types.
  - **`src/components/ImagePipelineSidebar.tsx`:** A sidebar for saved templates and settings.
  - **`src/components/OnCanvasNodePicker.tsx`:** A panel that appears on the canvas when dragging a connection to empty space, letting the user choose a compatible node to insert.
  - **`src/components/PipelineRegions.tsx`:** Finds groups of connected nodes, draws bounding boxes around them, and provides play/stop controls.
- **`src/templates`:** Save and restore reusable subgraphs.
- **`worker/`:** Cloudflare Worker backend.
  - **`worker/worker.ts`:** The main worker entry-point with API routes.
  - **`worker/routes/`:** Route handlers for generate, upscale, style transfer, IP adapter, text generation, and image storage.
  - **`worker/providers/`:** Provider abstractions for Replicate API calls.

## Deployment

This template uses a [Cloudflare Worker](https://developers.cloudflare.com/workers/) backend with [R2](https://developers.cloudflare.com/r2/) for image storage.

To deploy, create an R2 bucket and deploy the worker:

```bash
npx wrangler r2 bucket create image-pipeline
npx wrangler secret put REPLICATE_API_TOKEN
npm run build
npx wrangler deploy
```

## License

This project is part of the tldraw SDK. It is provided under the [tldraw SDK license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

You can use the tldraw SDK in commercial or non-commercial projects so long as you preserve the "Made with tldraw" watermark on the canvas. To remove the watermark, you can purchase a [business license](https://tldraw.dev/pricing). Visit [tldraw.dev](https://tldraw.dev) to learn more.

## Trademarks

Copyright (c) 2025-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Distributions

You can find tldraw on npm [here](https://www.npmjs.com/package/@tldraw/tldraw?activeTab=versions).

## Contribution

Found a bug? Please [submit an issue](https://github.com/tldraw/tldraw/issues/new).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.gg/rhsyWMUJxd). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw) or email us at [mailto:hello@tldraw.com](hello@tldraw.com).
