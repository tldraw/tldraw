# Branching Chat Template

<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

A visual branching conversation interface built with [tldraw](https://github.com/tldraw/tldraw) that lets you create interactive chat trees with AI integration.

## What is this?

This template demonstrates how to build a node-based conversational UI where:

- **Visual Chat Trees**: Create branching conversation flows on an infinite canvas
- **AI Integration**: Stream responses from AI models with real-time updates
- **Interactive Nodes**: Drag, connect, and organize conversation messages visually
- **Context Awareness**: AI responses consider the entire conversation branch history
- **Full Stack**: Complete implementation with Cloudflare Workers backend

Perfect for building chatbots, interactive storytelling, conversation design tools, or any application that needs visual conversation flows.

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Environment setup

Create a `.env` file in the root directory and add your Google Generative API key:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).
You can also switch to a different provider using the [Vercel AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers).

### 3. Start Development

```bash
yarn dev
```

Open [http://localhost:5173](http://localhost:5173) to see your branching chat interface.

## How to Use

1. **Create Message Nodes**: Click the message icon in the toolbar to add chat nodes
2. **Connect Conversations**: Drag from output ports to input ports to create conversation branches
3. **Send Messages**: Type in any node and click send to get AI responses
4. **Branch Conversations**: Create multiple paths by connecting nodes in different ways
5. **Build Context**: The AI considers all connected previous messages when responding

## Architecture

This template showcases advanced tldraw concepts:

### Frontend (`/client`)

- **Custom Shapes**: `NodeShapeUtil` for chat message nodes
- **Custom Tools**: Interactive port connections for linking conversations
- **Custom UI**: Workflow-specific toolbar and components
- **Streaming Updates**: Real-time AI response rendering

### Backend (`/worker`)

- **Cloudflare Workers**: Edge computing for global performance
- **Durable Objects**: Stateful operations and session management
- **AI Integration**: Vercel AI SDK with streaming support
- **API Routes**: RESTful endpoints for chat operations

## Deployment

Ready to deploy to Cloudflare Workers:

```bash
# Build the frontend
yarn build

# Deploy to Cloudflare (requires wrangler CLI)
npx wrangler deploy
```

Make sure to set your `GOOGLE_GENERATIVE_AI_API_KEY` in your Cloudflare Workers environment variables.

## Customization

### Adding New Node Types

1. Create a new node definition in `/client/nodes/types/`
2. Add to the `NodeDefinitions` array in `nodeTypes.tsx`
3. Implement required methods: `Component`, `getPorts`, etc.

### Changing AI Providers

Modify `/worker/worker.ts` to use different AI providers supported by the Vercel AI SDK:

```javascript
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
// ... other providers
```

### UI Customization

Override tldraw components via the `components` prop in `App.tsx`. Customize the toolbar in `WorkflowToolbar.tsx`.

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
