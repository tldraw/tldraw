---
title: Vite template
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - vite
  - template
  - starter
  - react
---

## Overview

The Vite template is the fastest way to start a tldraw app. It ships a minimal React setup with Tldraw and hot module replacement.

## Quick start

```bash
npx create-tldraw my-app
# Select the Basic (Vite) template
cd my-app
npm install
npm run dev
```

## Basic usage

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw />
		</div>
	)
}
```

## Key files

- templates/vite/src/App.tsx - Main app component
- templates/vite/src/main.tsx - Entry point
- templates/vite/vite.config.ts - Vite configuration

## Related

- [@tldraw/tldraw](../packages/tldraw.md)
- [Getting started](../overview/getting-started.md)
