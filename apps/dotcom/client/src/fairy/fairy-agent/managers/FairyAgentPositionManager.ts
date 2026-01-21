import { Box, Vec, VecModel } from 'tldraw'
import { AgentHelpers } from '../AgentHelpers'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Manages fairy positioning and camera operations.
 * Handles moving the fairy, camera following, and page synchronization.
 */
export class FairyAgentPositionManager extends BaseFairyAgentManager {
	/**
	 * Creates a new position manager for the given fairy agent.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
	}

	/**
	 * Resets the position manager to its initial state.
	 * Note: Position is managed by FairyAgent, so this is a no-op.
	 * @returns void
	 */
	reset(): void {
		// Reset position state if needed - position is managed by FairyAgent
	}

	/**
	 * Move the fairy to a position.
	 * The position is rounded and the fairy's horizontal flip is reset to false.
	 * @param position - The position to move the fairy to.
	 * @returns void
	 */
	moveTo(position: VecModel) {
		const roundedCandidatePosition = AgentHelpers.RoundVec(position)
		const roundedCurrentPosition = AgentHelpers.RoundVec(this.agent.getEntity().position)
		if (Vec.Equals(roundedCurrentPosition, roundedCandidatePosition)) {
			// avoid moving and reseting flipX if the position is the same
			return
		}
		this.agent.updateEntity((fairy) => {
			return {
				...fairy,
				position: roundedCandidatePosition,
				velocity: { x: 0, y: 0 },
				flipX: false,
			}
		})
	}

	/**
	 * Move the camera to the fairy's position.
	 * Also switches to the page where the fairy is located.
	 * Does nothing if the fairy entity doesn't exist.
	 * @returns void
	 */
	zoomTo() {
		const entity = this.agent.getEntity()
		if (!entity) return

		// Switch to the fairy's page
		if (entity.currentPageId !== this.agent.editor.getCurrentPageId()) {
			this.agent.editor.setCurrentPage(entity.currentPageId)
		}

		// Zoom to the fairy's position
		this.agent.editor.zoomToBounds(Box.FromCenter(entity.position, { x: 100, y: 100 }), {
			animation: { duration: 220 },
			targetZoom: 1,
		})
	}

	/**
	 * Instantly move the fairy to the center of the screen on the current page.
	 * Updates the fairy's currentPageId to match the current editor page.
	 * Triggers a 'poof' gesture animation.
	 * @param offset - Optional offset from the center position.
	 * @returns void
	 */
	summon(offset?: { x: number; y: number }) {
		const center = this.agent.editor.getViewportPageBounds().center
		const position = offset ? { x: center.x + offset.x, y: center.y + offset.y } : center
		const currentPageId = this.agent.editor.getCurrentPageId()
		this.agent.gesture.push('poof', 400)
		this.agent.updateEntity((f) =>
			f ? { ...f, position, currentPageId, velocity: { x: 0, y: 0 } } : f
		)
	}

	/**
	 * Move the fairy to a spawn point near the center of the viewport.
	 * Uses findFairySpawnPoint to avoid overlapping with other fairies.
	 * Updates the fairy's currentPageId to match the current editor page.
	 * Triggers a 'poof' gesture animation.
	 * @returns void
	 */
	moveToSpawnPoint() {
		const spawnPoint = this.findFairySpawnPoint()
		const currentPageId = this.agent.editor.getCurrentPageId()
		this.agent.updateEntity((f) =>
			f
				? {
						...f,
						position: AgentHelpers.RoundVec(spawnPoint),
						currentPageId,
						velocity: { x: 0, y: 0 },
					}
				: f
		)
		this.agent.gesture.push('poof', 400)
	}

	/**
	 * Start following this fairy with the camera.
	 * The camera will automatically zoom to the fairy's position whenever it moves or changes pages.
	 * Following stops automatically when the user scrolls (wheel event) or manually changes pages.
	 * @returns void
	 */
	startFollowing() {
		const fairyId = this.agent.id
		this.stopFollowing()
		// Delegate to the following manager which handles all the following logic
		this.agent.fairyApp.following.startFollowing(fairyId)
	}

	/**
	 * Stop following this fairy with the camera.
	 * Cleans up all reactive subscriptions and event listeners associated with following.
	 * @returns void
	 */
	stopFollowing() {
		this.agent.fairyApp.following.stopFollowing()
	}

	/**
	 * Check if this fairy is currently being followed.
	 * @returns True if this fairy is being followed, false otherwise.
	 */
	isFollowing() {
		return this.getFollowingFairyId() === this.agent.id
	}

	/**
	 * Find a spawn point for the fairy near the center of the viewport.
	 * Attempts to place the fairy at least MIN_DISTANCE (200px) away from other fairies.
	 * Starts searching near the viewport center and expands outward if needed.
	 * @returns A position vector representing the spawn point.
	 */
	findFairySpawnPoint(): VecModel {
		const editor = this.agent.editor
		const existingAgents = this.agent.fairyApp.agents.getAgents()
		const MIN_DISTANCE = 200
		const INITIAL_BOX_SIZE = 100 // Start with a smaller box near center
		const BOX_EXPANSION = 50 // Smaller expansion increments to stay closer to center

		const viewportCenter = editor.getViewportPageBounds().center

		// If no other fairies exist, use the center
		if (existingAgents.length === 0) {
			return viewportCenter
		}

		// Try to find a valid spawn point near the center
		let boxSize = INITIAL_BOX_SIZE
		let attempts = 0
		const MAX_ATTEMPTS = 100

		while (attempts < MAX_ATTEMPTS) {
			// Generate a candidate position near the viewport center
			const candidate = {
				x: viewportCenter.x + (Math.random() - 0.5) * boxSize,
				y: viewportCenter.y + (Math.random() - 0.5) * boxSize,
			}

			// Check if the candidate is far enough from all existing fairies
			const tooClose = existingAgents.some((agent: FairyAgent) => {
				const otherPosition = agent.getEntity().position
				const distance = Math.sqrt(
					Math.pow(candidate.x - otherPosition.x, 2) + Math.pow(candidate.y - otherPosition.y, 2)
				)
				return distance < MIN_DISTANCE
			})

			if (!tooClose) {
				return candidate
			}

			// Expand the search area after every 10 attempts
			if (attempts % 10 === 9) {
				boxSize += BOX_EXPANSION
			}

			attempts++
		}

		// If we couldn't find a good spot, return a position near the center anyway
		return {
			x: viewportCenter.x + (Math.random() - 0.5) * boxSize,
			y: viewportCenter.y + (Math.random() - 0.5) * boxSize,
		}
	}

	/**
	 * Get the ID of the fairy that is currently being followed by the camera.
	 * @returns The ID of the fairy being followed, or null if no fairy is being followed.
	 */
	getFollowingFairyId(): string | null {
		return this.agent.fairyApp.following.getFollowingFairyId()
	}

	/**
	 * How much the velocity gets multiplied by each second.
	 */
	DAMPING_FACTOR = 0.85 as const

	/**
	 * Apply the fairy's velocity to the its position for a given time delta.
	 * @param delta - The time delta to apply the velocity for.
	 * @returns void
	 */
	applyVelocity(delta: number) {
		const entity = this.agent.getEntity()
		const { velocity, position } = entity
		const speed = Vec.Len(velocity)

		if (speed < 0.003) {
			if (this.agent.gesture.hasGestureInStack('soaring')) {
				this.agent.gesture.reset()
			}
			if (speed !== 0) {
				this.agent.updateEntity((entity) => {
					return {
						...entity,
						velocity: { x: 0, y: 0 },
					}
				})
			}
			return
		} else if (!this.agent.gesture.hasGestureInStack('soaring') && speed > 0.2) {
			this.agent.gesture.push('soaring')
		}
		const dampingFactor = this.DAMPING_FACTOR
		const scaledDampingFactor = dampingFactor * Math.max(0, 1 - delta / 1000)
		const newVelocity = Vec.Mul(velocity, scaledDampingFactor)

		const scaledVelocity = Vec.Mul(newVelocity, delta)
		const newPosition = Vec.Add(position, scaledVelocity)
		this.agent.updateEntity((entity) => {
			return {
				...entity,
				position: newPosition,
				velocity: newVelocity,
			}
		})
	}
}
