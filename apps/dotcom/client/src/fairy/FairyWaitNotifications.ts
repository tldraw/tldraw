import {
	AgentModeTransitionEvent,
	FairyModeDefinition,
	FairyTask,
	TaskCompletedEvent,
	type FairyWaitCondition,
	type FairyWaitEvent,
} from '@tldraw/fairy-shared'
import { Editor } from 'tldraw'
import { $fairyAgentsAtom } from './fairy-agent/agent/fairyAgentsAtom'

/**
 * Notify all agents that are waiting for an event.
 * This is the central function for broadcasting events to waiting agents.
 */
export function notifyWaitingAgents({
	event,
	editor,
	getAgentFacingMessage,
	getUserFacingMessage,
}: {
	event: FairyWaitEvent
	editor: Editor
	getAgentFacingMessage(agentId: string, condition: FairyWaitCondition<FairyWaitEvent>): string
	getUserFacingMessage?(agentId: string, condition: FairyWaitCondition<FairyWaitEvent>): string
}) {
	const eventType = event.type
	const agents = $fairyAgentsAtom.get(editor)

	for (const agent of agents) {
		const waitingConditions = agent.$waitingFor.get()
		const matchingCondition = waitingConditions.find(
			(condition) => condition.eventType === eventType && condition.matcher(event)
		) // if there are multiple matching conditions, this will miss all but the first

		if (matchingCondition) {
			// Remove the matched condition from the agent's waiting list
			const remainingConditions = waitingConditions.filter(
				(condition) => condition !== matchingCondition
			)
			agent.$waitingFor.set(remainingConditions)

			// Wake up the agent with a notification message
			const agentFacingMessage = getAgentFacingMessage(agent.id, matchingCondition)
			const userFacingMessage = getUserFacingMessage?.(agent.id, matchingCondition) ?? null
			agent.notifyWaitConditionFulfilled({
				agentFacingMessage,
				userFacingMessage,
			})
		}
	}
}

/**
 * Notify all agents waiting for task completion events.
 *
 * @param taskId - The ID of the completed task
 * @param task - The completed task object
 * @param editor - The editor instance
 */
export function notifyTaskCompleted(task: FairyTask, editor: Editor) {
	const agentFacingMessage = `A task you were awaiting has been completed.
ID:${task.id}
Title: "${task.title}"
Description: "${task.text}"`

	notifyWaitingAgents({
		event: { type: 'task-completed', task },
		editor,
		getAgentFacingMessage: () => agentFacingMessage,
	})
}

/**
 * Create a wait condition for waiting on a specific task completion.
 *
 * @param taskId - The task ID to wait for
 * @returns A WaitCondition that matches when the specified task completes
 */
export function createTaskWaitCondition(taskId: string): FairyWaitCondition<TaskCompletedEvent> {
	return {
		eventType: 'task-completed',
		matcher: (event) => event.task.id === taskId,
		id: `task-completed:${taskId}`,
	}
}

/**
 * Notify all agents waiting for a mode transition event.
 *
 * @param agentId - The ID of the agent that transitioned
 * @param mode - The mode to transition to
 * @param editor - The editor instance
 */
export function notifyAgentModeTransition(
	agentId: string,
	mode: FairyModeDefinition['type'],
	editor: Editor
) {
	notifyWaitingAgents({
		event: { type: 'agent-mode-transition', agentId, mode },
		editor,
		getAgentFacingMessage: () => `Agent ${agentId} has transitioned to mode ${mode}.`,
	})
}

/**
 * Create a wait condition for waiting on a specific mode transition.
 *
 * @param agentId - The ID of the agent that transitioned
 * @param mode - The mode to transition to
 * @returns A WaitCondition that matches when the specified mode transition occurs
 */
export function createAgentModeTransitionWaitCondition(
	agentId: string,
	mode: FairyModeDefinition['type']
): FairyWaitCondition<AgentModeTransitionEvent> {
	return {
		eventType: 'agent-mode-transition',
		matcher: (event) => event.agentId === agentId && event.mode === mode,
		id: `agent-mode-transition:${agentId}:${mode}`,
	}
}
