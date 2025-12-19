---
title: Vite template
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - vite
  - template
  - starter
  - react
---

The Vite template is the fastest way to get started with tldraw. It provides a minimal React setup with hot module replacement and optimized builds.

## Quick start

```bash
npx create-tldraw my-app --template vite-template
cd my-app
npm install
npm run dev
```

## What's included

- Vite with React and TypeScript
- tldraw SDK pre-configured
- Hot module replacement
- Production build setup

## Project structure

```
my-app/
├── src/
│   ├── App.tsx        # Main tldraw component
│   ├── main.tsx       # Entry point
│   └── index.css      # Styles
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## App.tsx

```typescript
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw />
    </div>
  )
}

export default App
```

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Customization

### Adding persistence

```typescript
import { Tldraw, createTLStore } from 'tldraw'

function App() {
  const store = createTLStore()

  // Load saved data
  useEffect(() => {
    const saved = localStorage.getItem('tldraw')
    if (saved) {
      store.loadSnapshot(JSON.parse(saved))
    }
  }, [])

  // Save on changes
  useEffect(() => {
    const dispose = store.listen(() => {
      localStorage.setItem('tldraw', JSON.stringify(store.getSnapshot()))
    })
    return dispose
  }, [])

  return <Tldraw store={store} />
}
```

### Adding custom shapes

```typescript
import { Tldraw } from 'tldraw'
import { MyShapeUtil } from './MyShapeUtil'

function App() {
  return (
    <Tldraw shapeUtils={[MyShapeUtil]} />
  )
}
```

### Handling user

```typescript
import { Tldraw } from 'tldraw'

function App() {
  return (
    <Tldraw
      user={{
        id: 'user-1',
        name: 'Alice',
        color: '#ff0000',
      }}
    />
  )
}
```

## Vite configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
	plugins: [react()],
})
```

## Deployment

### Vercel

```bash
npm run build
# Deploy dist/ folder
```

### Netlify

```bash
npm run build
# Deploy dist/ folder with SPA redirect rules
```

### Static hosting

The build output in `dist/` can be hosted on any static file server.

## Related

- [Next.js template](./nextjs.md) - For SSR needs
- [Sync Cloudflare template](./sync-cloudflare.md) - For multiplayer
- [Getting started](../overview/getting-started.md) - Development guide
