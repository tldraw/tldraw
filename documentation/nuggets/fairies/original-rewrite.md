---
title: Orchestrating multiple AI agents on a canvas
created_at: 01/05/2026
updated_at: 01/05/2026
keywords:
  - agents
  - canvas
  - coordination
  - multiplayer
  - fairies
readability: 9
voice: 9
potential: 9
accuracy: 9
notes: "Strong opening with concrete failure modes. Uses 'we' appropriately. 'Underwater problem' is a memorable metaphor. Code examples verified against source. Minor: 'FaeOS' name not found in source, appears to be narrative framing."
---

# Orchestrating multiple AI agents on a canvas

Put multiple AI agents on an infinite canvas and ask them to collaborate. What happens?

Chaos. Agents overlap their work. They duplicate tasks. They draw backgrounds over foregrounds. They start work without knowing what changed while they were busy.

The problem isn't that models are bad at spatial reasoning—though they are—it's that canvas collaboration requires solving coordination problems you don't hit with single-agent systems. On a text editor, agents can use CRDTs to merge changes. On a canvas, things overlap without conflict. You can place shapes behind or atop each other, annotate over existing work, or change sizes. Multiple regions can be worked on in parallel because you can zoom and pan to see everything at once.

These affordances make the canvas powerful for human collaboration. Do they work for AI agents? Not without help.

We built a system to make it work. We call the agents "fairies" because they're childlike and mischievous—appropriate for the current era where models aren't actually good at this yet. This is what we learned about coordinating multiple agents on a spatial canvas.

## The underwater problem

Here's the core issue: agents spend far more time writing than reading. While an agent streams its response and executes actions, it can't perceive the canvas. It surfaces for context, acts, then goes back under.

A human drawing on tldraw can watch what they're creating, listen to collaborators, and adjust in real time. An agent can only see the canvas state before and after its work. If another agent—or a human—changes something during that time, the agent won't know until it's done.

This is fundamentally different from human collaboration. You can't give agents real-time feedback while they work. You can only interrupt them and force them to resurface with fresh context.

## FaeOS: roles, modes, and projects

We tried the obvious approach first: give all agents access to all tools and share a todo list between them. Assign tasks randomly. Complete disaster. Agents would start the same task, work on the wrong regions, and had no sense of an overall goal.

The breakthrough came when we watched agents succeed in a different scenario: one agent would make a plan and ask specific agents for help on specific items. This led to FaeOS, a project management system that separates concerns.

**Projects and tasks**: A user request becomes a project. Projects break down into tasks—distinct units of work with a title, description, and spatial bounds on the canvas.

**Roles**: With multiple agents, we need an orchestrator and workers. The orchestrator creates projects, breaks them into tasks, and assigns spatial bounds. Workers execute tasks within their assigned regions.

**Modes**: Each role has different modes that define what it can see and do. We implement this by selectively activating prompt parts and agent actions.

For example, the orchestrator can't edit the canvas—it can only see, move around, and manage tasks:

```tsx
{
  type: 'orchestrating-active',
  parts: () => [
    'modelName', 'mode', 'messages', 'screenshot',
    'agentViewportBounds', 'blurryShapes', 'peripheralShapes',
    'canvasLints', 'chatHistory', 'otherFairies',
    'currentProjectOrchestrator'
  ],
  actions: () => [
    'message', 'think', 'fly-to-bounds',
    'start-project', 'end-project', 'abort-project',
    'create-project-task', 'delete-project-task',
    'direct-to-start-project-task', 'await-tasks-completion'
  ]
}
```

Workers get canvas editing tools but only see their own tasks:

```tsx
{
  type: 'working-drone',
  parts: () => [
    'modelName', 'mode', 'messages', 'screenshot',
    'agentViewportBounds', 'blurryShapes', 'workingTasks'
  ],
  actions: () => [
    'mark-my-task-done', 'think', 'create', 'delete',
    'update', 'move', 'place', 'rotate', 'resize',
    'align', 'distribute', 'pen'
  ]
}
```

This separation of concerns solved the coordination problem. Orchestrators focus on the big picture without getting lost in implementation details. Workers focus on their assigned region without getting distracted by what other agents are doing.

## Spatial coordination

The canvas adds a unique constraint: agents need to know where to put things. When an orchestrator creates tasks, it assigns spatial bounds—a rectangular region where the agent should work. This isn't just about preventing overlap (though that helps). It's about making the composition coherent.

If you're drawing a scene, the background task should overlap the foreground task so the foreground agent can see what it's layering on top of. But fully overlapping concurrent tasks create chaos—agents can't tell what's theirs. The orchestrator has to reason about spatial relationships and task ordering.

We guide this through the system prompt. For the orchestrator:

> Projects should be coherent. Agents can only see and work within their task bounds. Therefore, tasks should be positioned and sized in a way that allows them to be completed coherently. If you're drawing a picture, the task to add a background should obviously overlap a task to add an object to the foreground. The logic of what should go where should rule how you position and size tasks.
>
> However, fully overlapping tasks should not be worked on concurrently. A moderate amount of overlap is fine for concurrent tasks.

Workers get their bounds as structured data:

```tsx
export const WorkingTasksPartDefinition = {
  type: 'workingTasks',
  buildContent(part) {
    const taskContent = part.tasks.map((task) => {
      let text = `Task ${task.id}: "${task.text}"`
      if (task.x && task.y && task.w && task.h) {
        text += ` (within bounds: x: ${task.x}, y: ${task.y}, w: ${task.w}, h: ${task.h})`
      }
      return text
    })

    return [`Here is the task you are currently working on:`, taskContent[0]]
  }
}
```

The agent's viewport automatically constrains to these bounds, so it literally can't see outside its assigned region while working.

## Preventing illegal moves

Even with coordination, things go wrong. A human might delete a shape an agent plans to modify. An agent might hallucinate a shape ID. Another agent might move something.

We handle this with two mechanisms. First, we sanitize every action before applying it. If an agent tries to delete or modify a shape, we check that the ID exists:

```tsx
override sanitizeAction(action: SendToBackAction, helpers: AgentHelpers) {
  action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
  return action
}
```

Second, we use interrupts to force agents to resurface when the environment changes. When a user disbands a project, we interrupt each agent, set its mode to idle, and clear the project:

```tsx
export function disbandProject(projectId: string, agents: FairyAgent[]) {
  memberAgents.forEach((memberAgent) => {
    memberAgent.interrupt({ mode: 'idling', input: null })
    memberAgent.$fairyEntity.update((f) => (f ? { ...f, isSelected: false } : f))
  })

  deleteProjectAndAssociatedTasks(projectId)
}
```

This solves the underwater problem: we can't give agents real-time feedback, but we can make them surface for air when the world has changed.

## Memory levels: context without rot

As agents work, they generate a lot of text—thoughts, plans, reviews, action results. Most of it becomes irrelevant quickly. An orchestrator doesn't need to know the detailed reasoning a worker used to position shapes. A worker starting a new task doesn't need the full history of previous tasks.

This is the context engineering problem: LLM performance degrades as context length increases, even on simple tasks. Adding irrelevant context forces the agent to figure out what matters before it can act.

We built memory levels to filter context based on scope. There are three levels:

**Task level**: High-detail, short-term memory scoped to individual tasks. Cleared when the task ends.

**Project level**: Medium-term memory scoped to projects. Persists across tasks but cleared when the project ends.

**Fairy level**: Long-term memory with global instructions that persist across projects.

Workers typically operate at task level. Orchestrators operate at project level. Idle agents operate at fairy level. When an agent switches modes, its memory level changes and we filter the chat history:

```tsx
override async getPart(_request: AgentRequest) {
  const allItems = structuredClone(this.agent.chatManager.getHistory())

  const modeDefinition = getFairyModeDefinition(this.agent.modeManager.getMode())
  const { memoryLevel } = modeDefinition

  const filteredItems = filterChatHistoryByMode(allItems, memoryLevel)

  return {
    type: 'chatHistory',
    items: filteredItems
  }
}
```

Filtering creates gaps in the chat history. To prevent confusion, we add brief "memory transitions" that summarize what happened in the filtered period. If a user continues the conversation after a project completes, the agent knows work was done without carrying all the implementation details.

This keeps context focused and prevents context rot. The orchestrator never sees the minutiae of how workers positioned shapes. Workers don't carry baggage from previous tasks. Each agent gets exactly the context it needs for its current scope.

## What we learned

Spatial interfaces add genuine complexity to multi-agent coordination. The affordances that make canvas collaboration powerful for humans—overlapping work, parallel regions, zoom and pan—become coordination problems for agents that can't perceive and act simultaneously.

The solutions we built—roles, spatial bounds, memory levels—aren't elegant abstractions. They're practical responses to watching agents fail. The orchestrator can't edit because orchestrators kept getting distracted by implementation details. Workers only see their own tasks because they kept getting distracted by other workers. Memory gets filtered because context rot killed performance.

The system works, but it's a scaffold for models that aren't natively good at this. As models improve at spatial reasoning and multi-step planning, simpler approaches might work. For now, the structure is necessary.

We released this as "fairies" instead of "agents" because the models are childlike—they need guidance, they make mistakes, and they work best with clear constraints. That's the current reality of bringing AI to the canvas. The infinite canvas SDK and agent starter kit are available in the tldraw repo if you want to experiment with your own approach.

## Source

- [Agent starter kit](https://github.com/tldraw/tldraw/tree/main/templates/agent-starter)
- [Fairies implementation](https://github.com/tldraw/tldraw/tree/main/apps/dotcom/client/src/tla/components/TlaFairyAi)
