import { FairyModeDefinition } from '../schema/FairyModeDefinition'
import type { FairyTask } from './FairyTask'

export type FairyWaitEvent = TaskCompletedEvent | AgentModeTransitionEvent

/**
 * Event that occurs when a task is completed.
 */
export interface TaskCompletedEvent {
	type: 'task-completed'
	task: FairyTask
}

// not really implemented in FairyWaitNotifications yet
export interface AgentModeTransitionEvent {
	type: 'agent-mode-transition'
	agentId: string
	mode: FairyModeDefinition['type']
}

/**
 * The type of event being waited for.
 */
export type FairyWaitEventType = FairyWaitEvent['type']

/**
 * A condition that an agent is waiting for.
 * When an event matching this condition occurs, the agent will be notified.
 */
export interface FairyWaitCondition<T extends FairyWaitEvent> {
	/**
	 * The type of event being waited for.
	 */
	eventType: T['type']

	/**
	 * A function that checks if an event matches this condition.
	 * @param event - The event data to check
	 * @returns true if the event matches this condition
	 */
	matcher(event: T): boolean

	/**
	 * Optional metadata associated with this wait condition.
	 * Useful for storing context like task IDs, custom data, etc.
	 */
	metadata?: Record<string, any>
}
