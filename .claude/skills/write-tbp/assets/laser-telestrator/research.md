# Laser tool and scribble system research

## Core architecture

### Scribble system overview
The scribble system is a temporary freehand drawing system managed by the `ScribbleManager` class in `/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts`. Scribbles exist only in instance state and fade out automatically—they're never persisted to the document. The system supports two fundamental behaviors:
1. **Self-consuming**: Scribbles shrink from the start as you draw (default, used for eraser/selection tools)
2. **Persistent**: Scribbles persist until the session stops (used for laser pointer)

### Scribble lifecycle states

Five states define a scribble's lifecycle (defined in `/packages/tlschema/src/misc/TLScribble.ts`):

| State | Purpose |
|-------|---------|
| **Starting** | Collects points until 8+ points exist to prevent flickering |
| **Active** | Accumulates points as pointer moves |
| **Complete** | Done being drawn but not yet fading; allows taper effects |
| **Paused** | Temporarily suspended |
| **Stopping** | Fading out by removing points from tail |

### Session-based architecture (telestrator pattern)

The laser tool uses the **telestrator pattern**—a session-based architecture that groups multiple scribbles and manages their lifecycle together. This is implemented via `ScribbleSessionOptions`:

```typescript
interface ScribbleSessionOptions {
  selfConsume?: boolean        // false for laser = persistent
  idleTimeoutMs?: number       // auto-stop after inactivity
  fadeMode?: 'individual' | 'grouped'  // how scribbles fade
  fadeEasing?: 'linear' | 'ease-in'    // easing function
  fadeDurationMs?: number      // fade duration (default 500ms)
}
```

**Key insight**: The laser tool uses `selfConsume: false` with `fadeMode: 'grouped'` so all scribbles from a drawing session fade together as one visual unit, creating a cohesive "laser beam" effect.

### Laser tool implementation

**File structure** (in `/packages/tldraw/src/lib/tools/LaserTool/`):
- `LaserTool.ts` - Parent state node managing the session
- `childStates/Idle.ts` - Waiting for pointer down
- `childStates/Lasering.ts` - Active drawing state

**LaserTool flow**:

1. **Idle state**:
   - Waits for `onPointerDown` event
   - Creates a new scribble in the session with laser-specific properties

2. **Lasering state**:
   - Continuously adds points via `onPointerMove`
   - Extends session idle timeout every tick via `onTick()`
   - Marks scribble as `complete` when pointer lifts
   - Returns to idle state

3. **Session management**:
   - Session ID reused for multiple strokes if pointer is released but session hasn't timed out
   - Creates fresh session if previous one has faded completely
   - Session auto-stops after `idleTimeoutMs` (default 1200ms)

### Configuration options

From `/packages/editor/src/lib/options.ts`:
- **`laserDelayMs: 1200`** - How long session stays active after last activity before fading begins
- **`laserFadeoutMs: 500`** - Duration to completely fade all laser scribbles (ease-in easing)

### Self-consuming vs. persistent behavior

**Self-consuming (eraser/selection)**:
- Points added while active
- Points removed from start at regular intervals
- Always maintains roughly same length
- Once stopped, shrinks away completely

**Persistent (laser)**:
- Points accumulate without removal during active session
- Only when session stops does "grouped fade" begin
- All points removed proportionally over `fadeDurationMs`
- Uses ease-in easing for smooth visual disappearance

### Key files

| File | Purpose |
|------|---------|
| `/packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts` | Core scribble session management, tick/fade logic |
| `/packages/tldraw/src/lib/tools/LaserTool/LaserTool.ts` | Session lifecycle and configuration |
| `/packages/tldraw/src/lib/tools/LaserTool/childStates/Lasering.ts` | Point addition and session extension |
| `/packages/tlschema/src/misc/TLScribble.ts` | Type definitions and states |
| `/packages/tldraw/src/lib/canvas/TldrawScribble.tsx` | SVG rendering with state-aware taper |
| `/apps/docs/content/sdk-features/scribble.mdx` | Complete API documentation |
