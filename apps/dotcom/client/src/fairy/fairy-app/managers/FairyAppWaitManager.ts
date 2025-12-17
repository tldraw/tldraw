import {
	AgentId,
	AgentModeTransitionEvent,
	FairyModeDefinition,
	FairyTask,
	TaskCompletedEvent,
	TaskId,
	type FairyWaitCondition,
	type FairyWaitEvent,
} from '@tldraw/fairy-shared'
import { Box, BoxModel } from 'tldraw'
import { BaseFairyAppManager } from './BaseFairyAppManager'

/**
 * Manager for fairy wait/notification system.
 *
 * This duplicates functionality from fairy-wait-notifications.ts
 * but in a class-based form tied to FairyApp.
 */
export class FairyAppWaitManager extends BaseFairyAppManager {
	/**
	 * Notify all agents that are waiting for an event.
	 * This is the central function for broadcasting events to waiting agents.
	 */
	notifyWaitingAgents({
		event,
		getAgentFacingMessage,
		getUserFacingMessage,
		getBounds,
	}: {
		event: FairyWaitEvent
		getAgentFacingMessage(agentId: AgentId, condition: FairyWaitCondition<FairyWaitEvent>): string
		getUserFacingMessage?(agentId: AgentId, condition: FairyWaitCondition<FairyWaitEvent>): string
		getBounds?(
			agentId: AgentId,
			condition: FairyWaitCondition<FairyWaitEvent>
		): BoxModel | undefined
	}) {
		const eventType = event.type
		const agents = this.fairyApp.agents.getAgents()

		for (const agent of agents) {
			const waitingConditions = agent.waits.getWaitingFor()
			const matchingCondition = waitingConditions.find(
				(condition) => condition.eventType === eventType && condition.matcher(event)
			)

			if (matchingCondition) {
				// Remove the matched condition from the agent's waiting list
				const remainingConditions = waitingConditions.filter(
					(condition) => condition !== matchingCondition
				)
				agent.waits.setWaitingFor(remainingConditions)

				// Wake up the agent with a notification message
				const agentFacingMessage = getAgentFacingMessage(agent.id, matchingCondition)
				const userFacingMessage = getUserFacingMessage?.(agent.id, matchingCondition)
				const bounds = getBounds?.(agent.id, matchingCondition)
				// Fire and forget - we don't want to block on multiple agents

				if (bounds) {
					agent.position.moveTo(Box.From(bounds).center)
				}

				agent.waits
					.notifyWaitConditionFulfilled({
						agentMessages: [agentFacingMessage],
						userMessages: userFacingMessage ? [userFacingMessage] : undefined,
						bounds,
					})
					.catch((error) => {
						console.error('Error notifying wait condition fulfilled:', error)
					})
			}
		}
	}

	/**
	 * Notify all agents waiting for task completion events.
	 */
	notifyTaskCompleted(task: FairyTask) {
		const agentFacingMessage = `A task you were awaiting has been completed.
ID:${task.id}
Title: "${task.title}"
Description: "${task.text}"`

		const bounds: BoxModel = { x: task.x, y: task.y, w: task.w, h: task.h }

		this.notifyWaitingAgents({
			event: { type: 'task-completed', task },
			getAgentFacingMessage: () => agentFacingMessage,
			getBounds: () => bounds,
		})
	}

	/**
	 * Create a wait condition for waiting on a specific task completion.
	 */
	createTaskWaitCondition(taskId: TaskId): FairyWaitCondition<TaskCompletedEvent> {
		return {
			eventType: 'task-completed',
			matcher: (event) => event.task.id === taskId,
			id: `task-completed:${taskId}`,
		}
	}

	/**
	 * Notify all agents waiting for a mode transition event.
	 */
	notifyAgentModeTransition(agentId: AgentId, mode: FairyModeDefinition['type']) {
		this.notifyWaitingAgents({
			event: { type: 'agent-mode-transition', agentId, mode },
			getAgentFacingMessage: () => `Agent ${agentId} has transitioned to mode ${mode}.`,
		})
	}

	/**
	 * Create a wait condition for waiting on a specific mode transition.
	 */
	createAgentModeTransitionWaitCondition(
		agentId: AgentId,
		mode: FairyModeDefinition['type']
	): FairyWaitCondition<AgentModeTransitionEvent> {
		return {
			eventType: 'agent-mode-transition',
			matcher: (event) => event.agentId === agentId && event.mode === mode,
			id: `agent-mode-transition:${agentId}:${mode}`,
		}
	}

	/**
	 * Reset the manager to its initial state.
	 * WaitManager has no persistent state of its own - agents manage their own wait conditions.
	 */
	reset() {
		// Nothing to reset - wait conditions are stored on individual agents
	}
}
