# Branching Chat Template

This template demonstrates a branching conversational UI built on tldraw, showcasing how to create interactive node-based chat interfaces that can branch and merge conversation flows.

## Overview

The branching chat template is a full-stack application that combines tldraw's infinite canvas with AI chat capabilities, allowing users to create visual conversation trees with branching dialogue paths.

### Key features

- **Visual conversation flow**: Create branching conversation trees on an infinite canvas
- **AI integration**: Stream responses from AI models (OpenAI/compatible APIs)
- **Node-based UI**: Custom node shapes representing chat messages
- **Connection system**: Visual connections between conversation nodes
- **Real-time updates**: Streaming AI responses with live updates
- **Cloudflare Workers**: Backend powered by Cloudflare Workers and Durable Objects

## Architecture

### Frontend (`/client`)

**Core app structure**

- `App.tsx` - Main application component with tldraw configuration
- Custom shape utilities: `NodeShapeUtil`, `ConnectionShapeUtil`
- Custom binding utilities: `ConnectionBindingUtil`
- Workflow-specific toolbar and UI components

**Node system** (`/client/nodes`)

- `NodeShapeUtil.tsx` - Defines how chat nodes render and behave
- `nodeTypes.tsx` - Type definitions and node management utilities
- `types/MessageNode.tsx` - Message node implementation with AI streaming
- `nodePorts.tsx` - Connection port system for linking nodes

**Connection system** (`/client/connection`)

- `ConnectionShapeUtil.tsx` - Visual connections between nodes
- `ConnectionBindingUtil.tsx` - Binding logic for node relationships
- `keepConnectionsAtBottom.tsx` - Z-index management for connections

**Ports system** (`/client/ports`)

- `Port.tsx` - Port definitions and utilities
- `PointingPort.tsx` - Interactive port pointing tool

**UI components** (`/client/components`)

- `WorkflowToolbar.tsx` - Custom toolbar with node creation tools
- Custom icons and UI elements

### Backend (`/worker`)

**Cloudflare Workers architecture**

- `worker.ts` - Main worker entry point with routing
- `do.ts` - Durable Object for stateful operations
- `routes/` - API route handlers
- `types.ts` - Shared type definitions

**Key endpoints**

- `/stream` - POST endpoint for AI chat streaming
- Handles conversation context from connected nodes
- Streams AI responses back to frontend

## Key concepts

### Node types

**MessageNode**

- Represents a single message in the conversation
- Contains user input and AI assistant response
- Supports streaming updates for AI responses
- Dynamic sizing based on content length

### Connection flow

1. **Node creation**: Users create message nodes via toolbar
2. **Connection**: Nodes connect via ports to establish conversation flow
3. **Context building**: When sending a message, system traces back through connected nodes to build conversation history
4. **AI processing**: Complete conversation context sent to AI endpoint
5. **Streaming response**: AI response streamed back and displayed in real-time

### Port system

- **Input ports**: Allow incoming connections from previous conversation steps
- **Output ports**: Allow outgoing connections to next conversation steps
- **Dynamic positioning**: Ports adjust position based on node content size

## Development setup

### Environment variables

Required in `.env` or `.dev.vars`:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Local development

```bash
yarn dev    # Start development server
```

Serves the application at `http://localhost:5173/`

### Cloudflare Workers

The template uses Cloudflare Workers for the backend:

- `wrangler.toml` - Worker configuration
- Durable Objects for state management
- Edge runtime for global performance

## Customization points

### Adding new node types

1. Create new node definition in `/client/nodes/types/`
2. Add to `NodeDefinitions` array in `nodeTypes.tsx`
3. Implement required methods: `Component`, `getPorts`, `computeOutput`

### Custom AI integration

- Modify `/worker/routes/` to change AI provider
- Uses Vercel AI SDK - supports multiple providers
- Streaming implementation in `MessageNode.tsx`

### UI customization

- Override tldraw components via `components` prop
- Custom toolbar in `WorkflowToolbar.tsx`
- Styling in `index.css`

## Integration with tldraw

### Custom shape system

- Extends tldraw's shape system with `NodeShapeUtil`
- Custom geometry, rendering, and interaction handling
- Maintains tldraw's reactive state management

### Custom tools

- `PointingPort` tool for creating connections
- Integrated into tldraw's select tool state machine
- Drag-and-drop node creation from toolbar

### Binding system

- `ConnectionBindingUtil` manages relationships between nodes
- Automatic cleanup when nodes are deleted
- Visual feedback for connections

## Technical details

### State management

- Uses tldraw's reactive signals for state
- Node data stored in tldraw's document model
- Automatic persistence via tldraw's persistence system

### Performance optimizations

- Connection shapes kept at bottom layer
- Transparency disabled for workflow shapes
- Efficient text measurement for dynamic sizing
- Streaming responses prevent UI blocking

### Deployment

Ready for deployment to Cloudflare Workers:

```bash
yarn build    # Build frontend
wrangler deploy    # Deploy to Cloudflare
```

## File structure

```
/templates/branching-chat/
├── client/                 # Frontend React application
│   ├── App.tsx            # Main app component
│   ├── components/        # UI components
│   ├── connection/        # Connection system
│   ├── nodes/             # Node system
│   ├── ports/             # Port system
│   └── main.tsx          # App entry point
├── worker/                # Cloudflare Worker backend
│   ├── worker.ts         # Worker entry point
│   ├── do.ts             # Durable Object
│   └── routes/           # API routes
├── public/               # Static assets
├── package.json          # Dependencies
├── wrangler.toml         # Worker config
└── vite.config.ts        # Build config
```

This template demonstrates advanced tldraw concepts including custom shapes, tools, bindings, and full-stack integration with modern web technologies.
