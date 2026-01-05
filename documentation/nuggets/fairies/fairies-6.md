---
title: Project management for collaborative AI agents
created_at: 01/05/2026
updated_at: 01/05/2026
keywords:
  - fairies
  - AI
  - orchestration
  - collaboration
readability: 9
voice: 9
potential: 8
accuracy: 9
notes: "Strong opening with clear problem framing. Excellent use of 'we' voice. No AI tells. Spatial boundaries concept has broad applicability. All technical claims verified against source."
---

# Fairies: project management

When we added multiple AI agents to tldraw, we faced a coordination problem. One agent working alone can handle simple tasks, but complex work requires decomposition. How do you split a diagram into pieces when agents can only see what's in their viewport? How do you ensure agents don't overwrite each other's work? How do you coordinate parallel work without agents blocking each other?

We built a project management system with explicit roles and spatial task boundaries.

## The problem with single-agent work

An AI agent working solo on a large canvas has no concept of scope. Ask it to create a complex organizational chart, and it tries to do everything at once—planning, execution, review—all in a single viewport. The agent sees only what fits in its current view. If the work spans multiple screens, it has to pan around, losing context from earlier work.

For tasks requiring multiple distinct pieces—like creating a dashboard with several charts, each with different data—a single agent becomes a bottleneck. It must complete one piece before starting the next. There's no parallelism, no division of labor.

And there's no review step. The agent creates work and immediately considers it done. For complex projects, you want separate planning and execution phases, with review cycles between them.

## Orchestrators and drones

We created two roles: orchestrators and drones. An orchestrator plans the project, divides it into tasks, and assigns those tasks to drones. Drones execute individual tasks and report back when done.

The key constraint: drones only see within their task bounds. When we assign a task, we give it explicit spatial boundaries—an x, y, width, and height on the canvas:

```typescript
export interface FairyTask {
	id: TaskId
	title: string
	text: string
	assignedTo: AgentId | null
	status: 'todo' | 'in-progress' | 'done'
	x: number
	y: number
	w: number
	h: number
}
```

A drone working on a task at `x: 0, y: 0, w: 500, h: 400` sees only that 500×400 pixel region. Shapes outside those bounds are invisible. This restriction is deliberate—it prevents drones from getting distracted by unrelated work elsewhere on the canvas.

The orchestrator, by contrast, sees the entire canvas. It views the full project scope, understands where all the tasks are positioned, and coordinates the overall work. But orchestrators don't edit shapes directly. They plan, assign, wait, and review.

## Spatial task planning

Orchestrators don't just describe tasks—they position them on the canvas. During the planning phase, the orchestrator decides where each piece of work will live spatially.

This requires thinking about task adjacency. If two tasks produce shapes that should connect with an arrow, their bounds need to overlap slightly. If tasks are fully independent, they can be placed far apart to avoid any visual interference.

The orchestrator considers which tasks can run in parallel. Two tasks with overlapping bounds shouldn't execute simultaneously—drones would see each other's shapes appearing mid-work. But tasks with separate bounds can run at the same time without conflict.

Here's the workflow:

1. Orchestrator creates a project plan describing the high-level tasks and their spatial layout
2. Orchestrator creates all planned tasks with explicit bounds
3. Orchestrator uses `direct-to-start-project-task` to assign tasks to drones in the planned order
4. Orchestrator uses `await-tasks-completion` to wait for drones to finish
5. Orchestrator reviews completed work and can add more tasks if needed
6. Final integration phase to ensure all pieces work together

Each drone only knows about its own task. It doesn't see the project plan. It doesn't know how many other tasks exist. It sees a bounded region of canvas and instructions for what to create there.

## Duo orchestrators

Orchestrators that only plan create a bottleneck. For some projects, you want the coordinator to also do work—not just assign it.

We added a second orchestrator role: duo-orchestrators. These agents lead a two-person project and can either assign work to their partner or do it themselves.

A duo-orchestrator has access to two key actions that regular orchestrators don't:

- `direct-to-start-duo-task` — Assign a task to your partner
- `start-duo-task` — Work on a task yourself

When a duo-orchestrator starts working on a task, it switches modes to `working-orchestrator`. In this mode, it has the same spatial constraints as a drone—it can only see within the task bounds—but it retains context about the overall project.

This enables parallel collaboration. The duo-orchestrator can work on one task while its partner works on another, then both return to coordinate the next steps. For moderately complex work, this is faster than one orchestrator managing multiple drones.

## Mode state machines

Each agent operates in a specific mode at any given time. Modes determine what actions are available and what the agent can see. The mode system is a state machine with lifecycle hooks:

- `onEnter` — Setup when entering the mode
- `onExit` — Cleanup when leaving the mode
- `onPromptStart` — Handle new prompt initiation
- `onPromptEnd` — Determine next action after prompt completes
- `onPromptCancel` — Handle cancellation (some modes block this)

An orchestrator in `orchestrating-active` mode can create tasks, assign them, and wait for completion. When it calls `await-tasks-completion`, it transitions to `orchestrating-waiting`—a passive state where it has no active actions available. The agent wakes up when drones report completion, transitioning back to `orchestrating-active` to review the work.

A duo-orchestrator working on its own task transitions from `duo-orchestrating-active` to `working-orchestrator`. Its partner might be in `working-drone` at the same time. When both finish, they return to the coordination mode.

The mode system enforces constraints. An agent in `orchestrating-waiting` literally cannot take actions—the mode doesn't expose any action utilities. This prevents orchestrators from trying to edit shapes while drones are working. The only way forward is to wait for task completion notifications.

## Wait and notification system

Coordination happens through an event system. When a drone completes its task, it triggers a notification. The orchestrator, waiting in `orchestrating-waiting` mode, receives this notification and wakes up.

The wait manager at the application level broadcasts events:

```typescript
// App-level coordination
FairyAppWaitManager:
  - notifyTaskCompleted() — Wakes waiting orchestrators
  - notifyAgentModeTransition() — Broadcasts mode changes
```

Each agent has its own wait manager that subscribes to relevant events:

```typescript
// Agent-level waiting
FairyAgentWaitManager:
  - waitForAll() — Set wait conditions
  - getWaitingFor() — Check current wait state
  - notifyWaitConditionFulfilled() — Wake agent with notification
```

An orchestrator can wait for specific tasks: "Wake me when task-1 and task-2 are both done." Or it can wait for any completion: "Wake me when any task finishes so I can review it."

This lets orchestrators stagger work. Start two tasks that can run in parallel, wait for the first to complete, review it, then start a third task that depends on the first's output. The second task might still be running. The orchestrator doesn't poll—it sets a wait condition and goes dormant until the event fires.

## Why spatial boundaries work

The spatial task system solves several problems at once. It prevents interference by giving each agent an exclusive region to work in. It enables parallelism by letting agents work on non-overlapping regions simultaneously. It provides natural scoping for context—only send the agent information about its region.

But the real value is cognitive. Task boundaries force explicit decomposition. An orchestrator can't just say "create a dashboard." It must decide where each dashboard component lives, how big it should be, and what order to create them in. This upfront planning produces better results than letting agents figure it out as they go.

The boundaries also make review concrete. After a drone finishes a task, the orchestrator looks at that specific region and evaluates whether the work meets requirements. If not, it can create a new task in the same bounds to fix issues. The spatial framing makes it obvious what changed and what needs attention.

## Where this lives

The role and mode system is implemented across several packages:

- `packages/fairy-shared/src/types/FairyProject.ts` — Project and role type definitions
- `packages/fairy-shared/src/types/FairyTask.ts` — Task structure with spatial bounds
- `packages/fairy-shared/src/schema/FairyModeDefinition.ts` — Mode definitions and available actions
- `apps/dotcom/client/src/fairy/` — Application-level managers (FairyApp)
- `apps/dotcom/fairy-worker/src/prompt/sections/orchestration-mode.ts` — Orchestrator prompts
- `apps/dotcom/fairy-worker/src/prompt/sections/working-mode.ts` — Worker prompts

The two-level architecture separates application concerns (project management, task tracking, notifications) from agent concerns (individual behavior, mode transitions, action execution). This makes it possible to add new modes or roles without restructuring the core coordination system.
