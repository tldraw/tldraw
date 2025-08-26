<div alt style="text-align: center; transform: scale(.5);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-dark.png" />
		<img alt="tldraw" src="https://raw.githubusercontent.com/tldraw/tldraw/main/assets/github-hero-light.png" />
	</picture>
</div>

# AI Chat Template

This template provides an AI-powered chat interface built with [Next.js](https://nextjs.org/) and the [Vercel AI SDK](https://sdk.vercel.ai/). It features a clean, responsive design with real-time streaming responses.

## Features

- 🤖 AI-powered chat with OpenAI GPT-4o-mini
- 💬 Real-time message streaming
- 📱 Responsive design for mobile and desktop
- ⚡ Built with Next.js 15 and Vercel AI SDK v5
- 🎨 Clean, modern UI with loading states

## Setup

1. **Install dependencies:**

   ```bash
   yarn install
   # or
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env.local` and add your OpenAI API key:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   Get your API key from [OpenAI Platform](https://platform.openai.com/account/api-keys).

3. **Run the development server:**

   ```bash
   yarn dev
   # or
   npm run dev
   ```

4. **Open the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser to start chatting!

## Architecture

- **Components:** Modular React components in `src/components/`
  - `Chat.tsx` - Main chat container with useChat hook
  - `MessageList.tsx` - Scrollable message history
  - `ChatMessage.tsx` - Individual message display
  - `ChatInput.tsx` - Input field with send functionality
- **API:** Next.js API route at `/api/chat` using Vercel AI SDK
- **Styling:** CSS modules with responsive design

## License

This project is provided under the MIT license found [here](https://github.com/tldraw/nextjs-template/blob/main/LICENSE.md). The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

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
