---
title: Next.js template
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - nextjs
  - template
  - ssr
  - react
---

The Next.js template provides a server-rendered React setup with tldraw integration using the App Router.

## Quick start

```bash
npx create-tldraw my-app --template nextjs
cd my-app
npm install
npm run dev
```

Open `http://localhost:3000/` in your browser.

## What's included

- Next.js with App Router
- React 19 and TypeScript
- tldraw SDK pre-configured
- Production build setup

## Project structure

```
my-app/
├── src/
│   └── app/
│       ├── layout.tsx     # Root layout
│       ├── page.tsx       # Main tldraw page
│       ├── globals.css    # Global styles
│       └── favicon.ico
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## page.tsx

```typescript
'use client'
import { Tldraw } from 'tldraw'

export default function Home() {
  return (
    <main>
      <div style={{ position: 'fixed', inset: 0 }}>
        <Tldraw />
      </div>
    </main>
  )
}
```

The `'use client'` directive is required since tldraw components use client-side features.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run Next.js linting
```

## Client components

tldraw requires client-side rendering. Wrap tldraw components with `'use client'`:

```typescript
'use client'
import { Tldraw, useEditor } from 'tldraw'

function EditorComponent() {
  const editor = useEditor()
  // ...
}
```

## Adding persistence

```typescript
'use client'
import { Tldraw, createTLStore } from 'tldraw'
import { useEffect, useState } from 'react'

export default function Home() {
  const [store] = useState(() => createTLStore())

  useEffect(() => {
    const saved = localStorage.getItem('tldraw')
    if (saved) {
      store.loadSnapshot(JSON.parse(saved))
    }
  }, [store])

  useEffect(() => {
    const dispose = store.listen(() => {
      localStorage.setItem('tldraw', JSON.stringify(store.getSnapshot()))
    })
    return dispose
  }, [store])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw store={store} />
    </div>
  )
}
```

## Server-side data

Load initial data on the server and pass to client component:

```typescript
// app/page.tsx
import { TldrawClient } from './tldraw-client'

async function getInitialData() {
  // Fetch from database, file, etc.
  return { snapshot: null }
}

export default async function Home() {
  const data = await getInitialData()
  return <TldrawClient initialData={data} />
}
```

```typescript
// app/tldraw-client.tsx
'use client'
import { Tldraw } from 'tldraw'

export function TldrawClient({ initialData }) {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw snapshot={initialData.snapshot} />
    </div>
  )
}
```

## Next.js configuration

```javascript
// next.config.mjs
export default {
  // No special configuration needed for tldraw
}
```

## CSS handling

Import tldraw CSS in your root layout or client component:

```typescript
import 'tldraw/tldraw.css'
```

## Deployment

### Vercel

```bash
npm run build
# Deploy via Vercel CLI or Git integration
```

### Other platforms

Next.js apps can be deployed to any platform supporting Node.js:

```bash
npm run build
npm run start
```

## API routes

Add tldraw-related API endpoints:

```typescript
// app/api/documents/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Return document data
  return NextResponse.json({ documents: [] })
}

export async function POST(request: Request) {
  const body = await request.json()
  // Save document
  return NextResponse.json({ success: true })
}
```

## Related

- [Vite template](./vite.md) - Simpler setup without SSR
- [Sync Cloudflare template](./sync-cloudflare.md) - For multiplayer
- [Getting started](../overview/getting-started.md) - Development guide
