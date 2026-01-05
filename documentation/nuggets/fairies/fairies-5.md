---
title: Memory levels for context management
created_at: 01/05/2026
updated_at: 01/05/2026
keywords:
  - fairies
  - AI
  - memory
  - context
---

# Fairies: Memory Levels

When we built multi-agent collaboration for tldraw, we hit a context problem. A project with three tasks, each involving twenty shape manipulations, generates sixty detailed actions in the chat history. If an orchestrator reviewing completed work sees every "move shape 2 pixels left" action from every task, the model's context window fills with irrelevant details. The orchestrator needs to know tasks completed successfully, not the minutiae of how they executed.

We built a three-tier memory system that filters chat history based on what the agent is currently doing.

## The context window problem

AI models have finite attention. Claude 3.5 Sonnet handles 200,000 tokens, but cramming that window with unnecessary details hurts performance. An orchestrator planning the next phase of a project doesn't need to see granular shape manipulations from earlier tasks. A worker executing a specific task doesn't need to see the orchestrator's strategic discussions with the user.

Including everything wastes tokens and distracts the model. The model's job is to predict the next action based on context. If that context is full of irrelevant history, prediction quality drops. The model might reference old tasks instead of focusing on current work. It might try to continue patterns from unrelated actions.

We needed a way to show agents only the history relevant to their current scope of work.

## Three memory levels

Every chat history item in the system carries a memory level tag: `'fairy'`, `'project'`, or `'task'`.

**Fairy level** is long-term memory. It persists across all projects and tasks. When an agent is idle or working solo without explicit project structure, it operates at fairy level. Global instructions, personality traits, and high-level summaries of completed work live here.

**Project level** is medium-term memory. It covers the lifespan of a project—from when the orchestrator starts planning until project completion. Task creation, assignment, coordination messages, and review discussions happen at project level. When the project ends, project-level history is summarized and the agent returns to fairy level.

**Task level** is short-term memory. It's the granular, immediate context for executing a specific task. Shape manipulations, position adjustments, individual create and update actions—these live at task level. When a task completes, task-level history disappears from view, replaced by a brief summary.

The system assigns memory levels automatically based on the agent's current mode:

```typescript
export type FairyMemoryLevel = 'fairy' | 'project' | 'task'
```

Each mode definition specifies its memory level:

```typescript
{
    type: 'working-drone',
    memoryLevel: 'task',
    // ... other properties
}
```

When an agent executes actions or receives prompts, those items are tagged with the current mode's memory level:

```typescript
const historyItem: ChatHistoryItem = {
	id: uniqueId(),
	type: 'action',
	action,
	diff,
	memoryLevel: modeDefinition.memoryLevel,
	// ... other fields
}
```

## Filtering chat history

Before building a prompt, the system filters the full chat history to show only items relevant to the current memory level.

The filtering function implements three different behaviors depending on the level:

```typescript
export function filterChatHistoryByMode(
	allItems: ChatHistoryItem[],
	memoryLevel: FairyMemoryLevel
): ChatHistoryItem[] {
	switch (memoryLevel) {
		case 'fairy':
			return allItems.filter((item) => item.memoryLevel === 'fairy')
		case 'project': {
			const filteredItems: ChatHistoryItem[] = []
			for (let i = allItems.length - 1; i >= 0; i--) {
				const item = allItems[i]
				if (item.memoryLevel === 'project') {
					filteredItems.unshift(item)
				} else if (item.memoryLevel === 'task') {
					continue // Skip task-level items
				} else if (item.memoryLevel === 'fairy') {
					break // Stop at fairy-level boundary
				}
			}
			return filteredItems
		}
		case 'task': {
			const filteredItems: ChatHistoryItem[] = []
			for (let i = allItems.length - 1; i >= 0; i--) {
				const item = allItems[i]
				if (item.memoryLevel === 'task') {
					filteredItems.unshift(item)
				} else {
					break // Stop at any other level
				}
			}
			return filteredItems
		}
	}
}
```

For fairy level, the filter is simple: show only fairy-level items. The agent sees its long-term memory, nothing from current or past projects.

For project level, the filter walks backward through history, collecting project-level items. It skips task-level items—orchestrators don't need that detail—and stops when it hits a fairy-level item, which marks the boundary where the project began.

For task level, the filter collects only recent task-level items, stopping at the first non-task item. Workers see their immediate task context, nothing from the broader project or previous tasks.

This filtering happens during prompt building:

```typescript
override async getPart(_request: AgentRequest) {
    const allItems = structuredClone(this.agent.chat.getHistory())
    const modeDefinition = getFairyModeDefinition(this.agent.mode.getMode())
    const { memoryLevel } = modeDefinition
    const filteredItems = filterChatHistoryByMode(allItems, memoryLevel)

    return {
        type: 'chatHistory' as const,
        items: filteredItems,
    }
}
```

The model never sees the full history. It receives only the filtered items appropriate for its current level.

## Memory transitions

When an agent crosses memory boundaries—like finishing a task and returning to project-level coordination—the system inserts a memory transition item.

Here's what happens when a worker completes a task:

```typescript
this.agent.chat.push(
	{
		type: 'memory-transition',
		memoryLevel: 'fairy',
		agentFacingMessage: `[ACTIONS]: <Task actions filtered for brevity>`,
		userFacingMessage: null,
	},
	{
		type: 'prompt',
		memoryLevel: 'fairy',
		agentFacingMessage: `I just finished the task.\nID: "${currentTaskId}"\nTitle: "${currentTask.title}"`,
		userFacingMessage: null,
	}
)
```

The transition item marks the boundary. Its message, `<Task actions filtered for brevity>`, tells the model that detail exists but has been hidden. The subsequent prompt item carries the high-level summary: task completed, here's what it was.

From the model's perspective, it sees a condensed version of what happened. Instead of twenty shape manipulation actions, it sees one line: "I finished creating the organization chart."

Memory transitions also occur when projects end:

```typescript
{
    type: 'memory-transition',
    memoryLevel: 'fairy',
    agentFacingMessage: `[ACTIONS]: <Project actions filtered for brevity>`,
    userFacingMessage: null,
}
```

The full project history—task creation, assignments, reviews—gets replaced by a summary. The agent's long-term memory records that it completed a project with certain collaborators, without retaining every coordination message.

## What each level sees

A task-level agent sees:

- Current task description and instructions
- Recent shape creation and manipulation actions
- Immediate feedback on those actions

It doesn't see:

- Other tasks in the project
- Project planning discussions
- Orchestrator coordination with the user
- Work done by sibling agents

A project-level orchestrator sees:

- The user's initial request
- Project planning discussion
- Task creation and assignment actions
- High-level progress updates

It doesn't see:

- Individual shape manipulation details
- Internal execution steps within tasks
- Fine-grained coordinate adjustments

A fairy-level agent sees:

- Summaries of completed projects
- Global instructions and personality
- Long-term patterns and preferences

It doesn't see:

- Detailed project execution
- Specific task work
- Temporary project state

## Token efficiency

The memory system typically saves 80-90% of chat history tokens in multi-task projects.

Consider a project with three tasks. Each task involves creating shapes, adjusting positions, setting colors—twenty actions total. The orchestrator creates ten project-level actions (planning, task creation, assignments). Without filtering, the full chat history includes seventy actions.

With memory levels, when the orchestrator reviews completed work, it sees:

- Ten project-level actions (planning and coordination)
- Three memory transitions (one per completed task)
- Three summary messages (high-level task completion notes)

That's sixteen items instead of seventy. The token count drops by 75%.

But the benefit isn't just token efficiency. Showing fewer, more relevant items improves model performance. The model doesn't waste attention on irrelevant details. When deciding what to do next, it focuses on project-level concerns—are all tasks complete? Do any need revision? What should happen next?—instead of getting distracted by how individual shapes were positioned in task two.

## Where this lives

The memory level system is implemented across several files:

- `packages/fairy-shared/src/types/FairyMemoryLevel.ts` — Memory level type definition
- `packages/fairy-shared/src/types/ChatHistoryItem.ts` — Every chat item includes a memory level
- `apps/dotcom/client/src/fairy/fairy-ui/chat/filterChatHistoryByMode.ts` — Core filtering logic
- `apps/dotcom/client/src/fairy/fairy-part-utils/ChatHistoryPartUtil.ts` — Integration with prompt building
- `packages/fairy-shared/src/schema/FairyModeDefinition.ts` — Modes specify their memory levels

The filtering is automatic. When we add new modes or change how agents work, we just specify the appropriate memory level in the mode definition. The context management handles itself.
