---
title: Fairies stream actions and handling requests
created_at: 01/05/2026
updated_at: 01/05/2026
keywords:
  - fairies
  - streaming
  - actions
  - interrupts
  - requests
---

# Fairies stream actions and handling requests

When you send a message to a fairy in tldraw, you're not just making a one-shot request and waiting for a complete response. Instead, the fairy streams back a sequence of actions—creating shapes, moving elements, sending messages—as the AI generates them. This streaming design lets you see the fairy working in real time, with each action appearing on the canvas the moment it's ready.

But streaming introduces complexity. What happens when you send a new message while the fairy is mid-stream? What if the fairy finishes a task and needs to switch from working mode back to coordinating mode? We needed a way to handle control flow changes on the fly—stopping current work, switching between different behavioral modes, and starting new work, all without losing state or breaking the fairy's context.

The answer is the interrupt system.

## The problem with long-running streams

Fairies operate through a multi-turn loop. When you give a fairy a request, it generates actions until it runs out of work. For solo tasks, the fairy creates its own internal todo list and keeps going until every item is complete. For project orchestration, the fairy creates tasks for drones, waits for completion notifications, reviews the work, and continues until the project is done.

This works well when everything proceeds linearly. But real usage isn't linear:

- You send a new message while the fairy is drawing
- The fairy completes a task and needs to transition from "working" to "coordinating"
- An orchestrator assigns a task to another fairy, which needs to immediately stop what it's doing and switch to drone mode
- The fairy makes an error (like trying to assign itself a task) and needs corrective feedback

Each of these scenarios requires interrupting the current stream, possibly switching the fairy's mode, and potentially starting new work. We can't just queue the new request—by the time the fairy finishes its current stream, the context might be stale. We need to stop now.

## Interrupt: three operations in sequence

The interrupt method is simple—just three operations that handle every control flow change:

```typescript
interrupt({ input, mode }: { input: AgentInput | null; mode?: FairyModeDefinition['type'] }) {
    this.requests.cancel()

    if (mode) {
        this.mode.setMode(mode)
    }
    if (input !== null) {
        this.schedule(input)
    }
}
```

First, cancel any active request. This calls `AbortController.abort()` to stop the streaming fetch from the worker, sets a `cancelled` flag, and clears both active and scheduled requests. The fairy immediately stops generating.

Second, optionally switch modes. Fairies operate in different modes—`soloing` for independent work, `working-solo` when executing a specific task, `orchestrating-active` when coordinating projects, `working-drone` when following an orchestrator's instructions. Each mode determines what actions the fairy can take and what context it sees. When the mode changes, the current mode's `onExit()` hook fires, the new mode's `onEnter()` hook fires, and the fairy's behavior changes accordingly.

Third, optionally schedule new work. If you provide input, the fairy queues a new request to process. If you pass `input: null`, the fairy just stops—no new work, it returns to its current mode.

The key insight is that these three operations compose to handle every control flow scenario. User sends new message? Cancel current work, schedule new input (no mode change). Fairy completes solo task? Cancel current work, switch to `soloing` mode, schedule continuation in task bounds. Orchestrator assigns task to drone? Cancel drone's work, switch to `working-drone` mode, schedule task input.

## Five ways to interrupt

**1. User sends new message**

Whenever you type a message and hit enter, the chat input calls interrupt:

```typescript
agent.interrupt({
    input: {
        agentMessages: [value],
        userMessages: [value],
        bounds: fairyVision,
        source: 'user',
    },
})
```

No mode switch—the fairy handles the new request in whatever mode it's currently in. If it was generating, that work is cancelled and replaced with your new instruction. This is why you can send messages rapid-fire and each one interrupts the previous: interrupt is how the system ensures user input always takes priority.

**2. Task completion with mode switch**

When a fairy marks a solo task as done, it interrupts itself to transition from `working-solo` back to `soloing`:

```typescript
this.agent.interrupt({
    mode: 'soloing',
    input: {
        bounds: {
            x: currentTask.x,
            y: currentTask.y,
            w: currentTask.w,
            h: currentTask.h,
        },
    },
})
```

The fairy exits the specific task context (where it could only see within task bounds) and returns to general solo mode (where it can see the broader canvas). The input includes the task's bounds so the fairy continues working in that area to check if there's more to do.

**3. Error correction without mode change**

When a fairy tries to assign a task to itself (which doesn't make sense), the action utility interrupts with corrective feedback:

```typescript
if (otherFairyId === this.agent.id) {
    this.agent.interrupt({
        input: 'You cannot direct yourself to do a task. Please direct another fairy to do the task.',
    })
    return
}
```

No mode switch—just cancel whatever the fairy was planning and give it error correction. The fairy will regenerate with this new context and try again correctly.

**4. Cross-fairy coordination**

When an orchestrator assigns a task to another fairy, it interrupts that fairy and switches it to drone mode:

```typescript
otherFairy.interrupt({
    mode: 'working-drone',
    input: otherFairyInput,
})
```

This is how fairies coordinate. The orchestrator doesn't just send a message—it directly interrupts the other fairy, forcing an immediate mode transition and providing task instructions. The drone fairy instantly becomes a worker focused on that specific task.

**5. Clean stop without new work**

When a drone finishes its task, it interrupts itself to switch to standing-by mode:

```typescript
this.agent.interrupt({ mode: 'standing-by', input: null })
```

The `input: null` is important—it means "stop current work, switch modes, but don't schedule anything new." The drone stops and waits for the orchestrator's next instruction.

## Why this works

The interrupt system works because it's unconditional. Unlike actions that check mode restrictions (you can't create shapes while orchestrating-waiting), interrupt always succeeds. This ensures that users can always stop a fairy, that fairies can always transition between modes, and that error corrections always take effect.

Mode switches during interrupt are atomic. The current mode's `onExit()` hook runs (cleaning up that mode's state), the new mode's `onEnter()` hook runs (initializing the new mode's state), and then if there's input, the new request is scheduled. This sequencing prevents race conditions where a fairy might be in an undefined state.

The design also handles the hardest case: disbanding projects. When a user disbands a project, all member fairies are interrupted simultaneously:

```typescript
memberAgent.interrupt({ mode: 'idling', input: null })
```

Every fairy—orchestrator and drones—immediately stops what it's doing and returns to idle. No cleanup phase, no "finish what you're doing first." Interrupt guarantees immediate response.

## Interrupt vs schedule

There's a related method, `schedule()`, that's easier to confuse. Schedule adds work to the queue without cancelling current generation. If the fairy is idle, schedule starts work immediately. If the fairy is busy, schedule sets a pending request that starts when current work finishes.

Interrupt is different: it always cancels. Even if the fairy is mid-generation, interrupt aborts the stream and starts fresh. Use interrupt when you need immediate control flow changes. Use schedule when you want to add work to the fairy's todo list.

The fairy's multi-turn loop uses schedule internally. After completing an action, if there are outstanding todo items, the fairy schedules a continuation. But when you send a new message, the chat input calls interrupt—your message takes priority over the fairy's own todo list.

---

The interrupt system lives in `apps/dotcom/client/src/fairy/fairy-agent/FairyAgent.ts:642-651`, with usage examples throughout the action utilities in `apps/dotcom/client/src/fairy/fairy-actions/`.
