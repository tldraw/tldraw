---
title: Next.js template
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - nextjs
  - template
  - ssr
  - react
---

The Next.js template provides an App Router setup with tldraw preconfigured. It uses client components for the editor.

## Quick start

```bash
npx create-tldraw my-app
# Select the Next.js template
cd my-app
npm install
npm run dev
```

## Basic usage

```tsx
'use client'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function Page() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw />
		</div>
	)
}
```

## Key files

- templates/nextjs/src/app/page.tsx - Main page
- templates/nextjs/src/app/layout.tsx - Root layout
- templates/nextjs/next.config.mjs - Next.js config

## Related

- [@tldraw/tldraw](../packages/tldraw.md)
- [Vite template](./vite.md)
