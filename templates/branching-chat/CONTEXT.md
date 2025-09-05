# Branching Chat Template

This template demonstrates a branching conversational UI built on tldraw, showcasing how to create interactive node-based chat interfaces that can branch and merge conversation flows.

## Overview

The branching chat template is a full-stack application that combines tldraw's infinite canvas with AI chat capabilities, allowing users to create visual conversation trees with branching dialogue paths.

### Key Features

- **Visual Conversation Flow**: Create branching conversation trees on an infinite canvas
- **AI Integration**: Stream responses from AI models (OpenAI/compatible APIs)
- **Node-Based UI**: Custom node shapes representing chat messages
- **Connection System**: Visual connections between conversation nodes
- **Real-time Updates**: Streaming AI responses with live updates
- **Cloudflare Workers**: Backend powered by Cloudflare Workers and Durable Objects

## Architecture

### Frontend (`/client`)

**Core App Structure**

- `App.tsx` - Main application component with tldraw configuration
- Custom shape utilities: `NodeShapeUtil`, `ConnectionShapeUtil`
- Custom binding utilities: `ConnectionBindingUtil`
- Workflow-specific toolbar and UI components

**Node System** (`/client/nodes`)

- `NodeShapeUtil.tsx` - Defines how chat nodes render and behave
- `nodeTypes.tsx` - Type definitions and node management utilities
- `types/MessageNode.tsx` - Message node implementation with AI streaming
- `nodePorts.tsx` - Connection port system for linking nodes

**Connection System** (`/client/connection`)

- `ConnectionShapeUtil.tsx` - Visual connections between nodes
- `ConnectionBindingUtil.tsx` - Binding logic for node relationships
- `keepConnectionsAtBottom.tsx` - Z-index management for connections

**Ports System** (`/client/ports`)

- `Port.tsx` - Port definitions and utilities
- `PointingPort.tsx` - Interactive port pointing tool

**UI Components** (`/client/components`)

- `WorkflowToolbar.tsx` - Custom toolbar with node creation tools
- Custom icons and UI elements

### Backend (`/worker`)

**Cloudflare Workers Architecture**

- `worker.ts` - Main worker entry point with routing
- `do.ts` - Durable Object for stateful operations
- `routes/` - API route handlers
- `types.ts` - Shared type definitions

**Key Endpoints**

- `/stream` - POST endpoint for AI chat streaming
- Handles conversation context from connected nodes
- Streams AI responses back to frontend

## Key Concepts

### Node Types

**MessageNode**

- Represents a single message in the conversation
- Contains user input and AI assistant response
- Supports streaming updates for AI responses
- Dynamic sizing based on content length

### Connection Flow

1. **Node Creation**: Users create message nodes via toolbar
2. **Connection**: Nodes connect via ports to establish conversation flow
3. **Context Building**: When sending a message, system traces back through connected nodes to build conversation history
4. **AI Processing**: Complete conversation context sent to AI endpoint
5. **Streaming Response**: AI response streamed back and displayed in real-time

### Port System

- **Input Ports**: Allow incoming connections from previous conversation steps
- **Output Ports**: Allow outgoing connections to next conversation steps
- **Dynamic Positioning**: Ports adjust position based on node content size

## Development Setup

### Environment Variables

Required in `.env` or `.dev.vars`:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Local Development

```bash
yarn dev    # Start development server
```

Serves the application at `http://localhost:5173/`

### Cloudflare Workers

The template uses Cloudflare Workers for the backend:

- `wrangler.toml` - Worker configuration
- Durable Objects for state management
- Edge runtime for global performance

## Customization Points

### Adding New Node Types

1. Create new node definition in `/client/nodes/types/`
2. Add to `NodeDefinitions` array in `nodeTypes.tsx`
3. Implement required methods: `Component`, `getPorts`, `computeOutput`

### Custom AI Integration

- Modify `/worker/routes/` to change AI provider
- Uses Vercel AI SDK - supports multiple providers
- Streaming implementation in `MessageNode.tsx`

### UI Customization

- Override tldraw components via `components` prop
- Custom toolbar in `WorkflowToolbar.tsx`
- Styling in `index.css`

## Integration with tldraw

### Custom Shape System

- Extends tldraw's shape system with `NodeShapeUtil`
- Custom geometry, rendering, and interaction handling
- Maintains tldraw's reactive state management

### Custom Tools

- `PointingPort` tool for creating connections
- Integrated into tldraw's select tool state machine
- Drag-and-drop node creation from toolbar

### Binding System

- `ConnectionBindingUtil` manages relationships between nodes
- Automatic cleanup when nodes are deleted
- Visual feedback for connections

## Technical Details

### State Management

- Uses tldraw's reactive signals for state
- Node data stored in tldraw's document model
- Automatic persistence via tldraw's persistence system

### Performance Optimizations

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

## File Structure

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
