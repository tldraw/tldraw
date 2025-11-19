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
 *
 * @param eventType - The type of event that occurred
 * @param event - The event data
 * @param editor - The editor instance
 * @param getMessage - Optional function to generate a wake-up message for each matched agent
 */
export function notifyWaitingAgents(
	eventType: FairyWaitEvent['type'],
	event: FairyWaitEvent,
	editor: Editor,
	getMessage?: (agentId: string, condition: FairyWaitCondition<FairyWaitEvent>) => string
) {
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
			const message = getMessage?.(agent.id, matchingCondition) ?? `Event "${eventType}" occurred.`
			agent.notifyWaitConditionFulfilled(message, matchingCondition, event)
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
	notifyWaitingAgents(
		'task-completed',
		{ type: 'task-completed', task },
		editor,
		() => `Task ${task.id} ("${task.text}") has been completed.`
	)
}

/**
 * Create a wait condition for waiting on a specific task completion.
 *
 * @param taskId - The task ID to wait for
 * @returns A WaitCondition that matches when the specified task completes
 */
export function createTaskWaitCondition(taskId: number): FairyWaitCondition<TaskCompletedEvent> {
	return {
		eventType: 'task-completed',
		matcher: (event) => event.task.id === taskId,
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
	notifyWaitingAgents(
		'agent-mode-transition',
		{ type: 'agent-mode-transition', agentId, mode },
		editor,
		() => `Agent ${agentId} has transitioned to mode ${mode}.`
	)
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
	}
}
