---
title: Fairies - building AI agents on the canvas
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - fairies
  - canvas
status: published
date: 12/21/2025
order: 4
---

# Fairies: building AI agents on the canvas

When we started building AI agents for tldraw, we hit an immediate problem: how do you give an AI model meaningful awareness of an infinite 2D space? The model needs to "see" the canvas, understand where shapes are, and manipulate them precisely. But canvases can be arbitrarily large, shapes can be anywhere, and coordinates can be any number from negative millions to positive millions.

We built a system called Fairies that solves this through three techniques: multi-modal context (screenshots plus structured shape data), coordinate offsetting to keep numbers small, and a modular utility architecture that makes the agent easy to extend.

## The vision problem

The naive approach would be to send the model a screenshot of the viewport. Screenshots work surprisingly well for understanding what's on the canvas, but they have limitations. The model can see that there's a blue rectangle in the corner, but it can't reliably read the exact coordinates from pixels. It also can't see shapes outside the viewport.

We use a hybrid approach. The agent receives both a JPEG screenshot of the current view and structured JSON data about shapes. The screenshot provides visual context—layout, colors, text content. The JSON provides precision—exact positions, dimensions, and properties the model can reference and modify.

But sending full shape data for every shape on a large canvas would blow past context limits. We use three levels of detail:

```
BlurryShape     → ~6 fields  → shapes in viewport (enough to reference)
SimpleShape     → ~40 fields → shapes being edited (full detail)
PeripheralCluster → ~5 fields → shapes outside viewport (just bounds and count)
```

Shapes in the viewport get a simplified representation—ID, type, bounds, and any text content. When the agent needs to edit a shape, it requests the full SimpleShape format with all properties. Shapes outside the viewport are clustered by region: "47 shapes to the north" gives spatial awareness without the token cost.

## Coordinate offsetting

Here's a problem we didn't anticipate: models perform noticeably worse with large numbers. Ask a model to move a shape to position `(12847, -3291)` and it's more likely to make mistakes than if you ask it to move to `(47, 109)`.

We offset all coordinates relative to where the conversation started. When the user opens the agent panel, we record that position as the "chat origin." Every coordinate sent to the model is relative to that point, and every coordinate from the model is transformed back to canvas space before applying.

The `AgentHelpers` class handles this bidirectionally:

```typescript
// Before sending to model
const modelCoords = helpers.applyOffsetToVec(canvasCoords)

// After receiving from model
const canvasCoords = helpers.removeOffsetFromVec(modelCoords)
```

This keeps numbers in a reasonable range regardless of where on the infinite canvas the user is working. The model thinks it's always working near the origin.

We also round coordinates to integers before sending them to the model, then restore the original precision afterward. The helpers track the rounding error so we can recover exact values. This reduces token noise and makes the model's outputs more predictable.

## The utility architecture

The agent is built around two parallel utility systems: prompt parts determine what the model sees, action utilities determine what it can do.

A prompt part is a class that gathers some context and formats it for the model. The `ScreenshotPartUtil` captures a JPEG of the viewport. The `BlurryShapesPartUtil` converts visible shapes to the minimal format. The `ChatHistoryPartUtil` provides conversation context. Each part implements `getPart()` to gather data and `buildContent()` to format it.

An action utility defines something the model can do. Each one provides a Zod schema (so the model knows the expected format), an `applyAction()` method that executes against the editor, and a `sanitizeAction()` method that validates and corrects the model's output before applying it.

The sanitization step is critical. Models make mistakes. They reference shape IDs that don't exist, output strings where numbers are expected, or provide coordinates that are wildly out of bounds. The sanitization layer catches these before they touch the canvas:

```typescript
override sanitizeAction(action, helpers) {
  // Reject if shape doesn't exist
  const shapeId = helpers.ensureShapeIdExists(action.shapeId)
  if (!shapeId) return null

  // Ensure coordinates are valid numbers
  const x = helpers.ensureValueIsNumber(action.x)
  if (x === null) return null

  return action
}
```

This separation means you can add new capabilities without touching the core agent loop. Want the agent to query a weather API? Add one action utility. Want it to see the user's selection? Add one prompt part. The utilities are registered in a single file, and the agent automatically picks them up.

## Multi-turn loops

Simple chatbots process one message at a time. Our agent can work through multi-step tasks autonomously. After processing a request, it checks whether there's more work to do. If so, it immediately starts another turn.

Three mechanisms drive this:

The agent can schedule an explicit follow-up. When it uses the `AddDetail` action, it's signaling "I need another turn to finish this." The action stores a request, and the loop continues.

The agent can manage a todo list. When given a complex task, it can break it into items and work through them one by one. Each turn it checks the list, works on an uncompleted item, marks it done, and continues until everything is finished.

Actions can pass data forward. The `RandomWikipediaArticle` action fetches an article and schedules a continuation with that data attached. The next turn receives the article content and can work with it.

The core loop looks like this:

```
prompt(input) → process actions → check $scheduledRequest or $todoList
  → if work remains: prompt(continuation) [recursive]
  → if none: loop ends
```

This enables the agent to handle requests like "research three topics and create a diagram for each"—tasks that require multiple model calls with intermediate results.

## Streaming and real-time feedback

Actions stream from the model as partial JSON. We yield each action twice: once when it's incomplete (still streaming) and once when it's complete (fully parsed). The UI can show progress in real time, and if the model changes direction mid-action, we can revert the incomplete state cleanly.

Each action utility also provides a `getInfo()` method that returns an icon, title, and summary for display in the chat history. This gives users visibility into what the agent is doing without exposing raw JSON.

## The trade-offs

The offset system adds complexity. Every coordinate transformation is a potential bug, and debugging requires remembering which space you're in. We think the improved model accuracy is worth it, but a simpler system could skip offsetting and accept more hallucinations.

The three-tier shape format means we're maintaining three parallel representations. Changes to shape properties need to propagate to all three. A single universal format would be simpler to maintain, but would either waste tokens (sending full data always) or lose precision (sending minimal data always).

The sanitization layer is defensive programming taken to an extreme. We're essentially assuming the model will make mistakes and building infrastructure to catch them. This is pragmatic given current model capabilities, but adds latency and code complexity.

The architecture is intentionally modular. We expect the agent's capabilities to grow over time, and the utility system makes that growth manageable. Each new feature is isolated, testable, and doesn't require understanding the entire system.
