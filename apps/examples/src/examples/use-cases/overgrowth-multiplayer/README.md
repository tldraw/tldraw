---
title: Overgrowth multiplayer
component: ./OvergrowthMultiplayerExample.tsx
priority: 6
multiplayer: true
keywords: [game, strategy, multiplayer, sync, territory, vines, cut, tick]
---

A two-player duel version of overgrowth — grow a network, cut your opponent's.

---

This is the multiplayer sibling of the overgrowth example. It reuses that game
whole — the same simulation (`sim.ts`), tuning (`game-state.ts`), and canvas
overlay — and makes it a duel over tldraw sync. Open it in two tabs (use **Copy
link** to share the room) to play blue vs orange.

The networking follows the 3D shooter example's trick: a single `useSyncDemo`
store, with all shared state living in shape `meta`, and no custom backend.

- **One client is the host.** Each client owns a tiny off-screen "player" shape
  carrying a heartbeat and its role; the present clients are sorted by id, so the
  lowest is **blue (a)**, the next is **orange (b)**, and the lowest is also the
  host. If the host leaves, the next player takes over automatically.
- **The host runs the sim** and publishes a compact **snapshot** of the world
  into one shared shape's `meta` on every growth pulse (~4×/sec). The snapshot is
  one byte per cell — owner, the direction to the vine's parent, and rock — which
  the sim makes possible because a vine's parent is always an adjacent cell.
- **Guests don't simulate.** They rebuild a render-only world from the latest
  snapshot and draw it through the same overlay, and they relay their **cut
  inputs** (segments of the swipe) back through their own player shape for the
  host to apply. Your swipe shows instantly; the actual cut lands a round-trip
  later.

Cutting works exactly as in single-player — left-drag to swipe through a vine
(the camera flies in if you're too far out). The reach rule, the contextual
greying of out-of-reach enemy vines, and the win-by-siege condition all carry
over unchanged, because the game's rules were already symmetric between the two
colors.

> Note: this rides tldraw's public **demo** sync server, which is for testing —
> rooms are reachable by anyone with the link and are wiped periodically. For a
> real deployment you'd point `useSync` at your own server (see the
> `sync-cloudflare` template).
