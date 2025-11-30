import { Box, react, VecModel } from 'tldraw'
import { $fairyAgentsAtom, $followingFairyId } from '../../fairy-globals'
import { AgentHelpers } from '../AgentHelpers'
import { FairyAgent } from '../FairyAgent'
import { getFairyAgentById } from '../fairyAgentsAtom'
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
		this.agent.$fairyEntity.update((fairy) => {
			return {
				...fairy,
				position: AgentHelpers.RoundVec(position),
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
		const entity = this.agent.$fairyEntity.get()
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
		this.agent.$fairyEntity.update((f) => (f ? { ...f, position, currentPageId } : f))
		this.agent.gestureManager.push('poof', 400)
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
		this.agent.$fairyEntity.update((f) =>
			f ? { ...f, position: AgentHelpers.RoundVec(spawnPoint), currentPageId } : f
		)
		this.agent.gestureManager.push('poof', 400)
	}

	/**
	 * Start following this fairy with the camera.
	 * The camera will automatically zoom to the fairy's position whenever it moves or changes pages.
	 * Following stops automatically when the user scrolls (wheel event) or manually changes pages.
	 * @returns void
	 */
	startFollowing() {
		const { editor } = this.agent
		const fairyId = this.agent.id
		this.stopFollowing()

		const agent = getFairyAgentById(fairyId, editor)
		if (!agent) {
			console.warn('Could not find fairy agent with id:', fairyId)
			return
		}

		$followingFairyId.update(editor, () => fairyId)

		// Track last seen position/page to avoid redundant zooms and feedback loops
		let lastX: number | null = null
		let lastY: number | null = null
		let lastPageId: string | null = null

		const disposeFollow = react('follow fairy', () => {
			const currentFairyId = this.getFollowingFairyId()
			if (currentFairyId !== fairyId) {
				// We're no longer following this fairy
				return
			}

			const currentAgent = getFairyAgentById(fairyId, editor)
			if (!currentAgent) {
				this.stopFollowing()
				return
			}

			const fairyEntity = currentAgent.$fairyEntity.get()
			if (!fairyEntity) {
				this.stopFollowing()
				return
			}

			// Only react when position or page actually changes
			const { x, y } = fairyEntity.position
			const pageId = fairyEntity.currentPageId
			const EPS = 0.5
			const samePage = lastPageId === pageId
			const sameX = lastX !== null && Math.abs(lastX - x) < EPS
			const sameY = lastY !== null && Math.abs(lastY - y) < EPS
			if (samePage && sameX && sameY) return

			lastX = x
			lastY = y
			lastPageId = pageId

			currentAgent.positionManager.zoomTo()
		})

		// Listen for user input events that should stop following
		const onWheel = () => this.stopFollowing()
		document.addEventListener('wheel', onWheel, { passive: false, capture: true })

		// Also stop following when the user manually changes pages
		const disposePageChange = react('stop following on page change', () => {
			const currentPageId = editor.getCurrentPageId()

			// Skip initial page check
			if (!lastPageId) {
				return
			}

			// If user changed page manually (not from following), stop following
			const currentAgent = getFairyAgentById(fairyId, editor)
			if (currentAgent) {
				const fairyPageId = currentAgent.$fairyEntity.get()?.currentPageId
				if (currentPageId !== fairyPageId && currentPageId !== lastPageId) {
					this.stopFollowing()
				}
			}
		})

		// Store dispose functions so we can clean them up later
		this.disposables.add(() => {
			disposeFollow()
			disposePageChange()
			document.removeEventListener('wheel', onWheel)
		})
	}

	/**
	 * Stop following this fairy with the camera.
	 * Cleans up all reactive subscriptions and event listeners associated with following.
	 * @returns void
	 */
	stopFollowing() {
		const { editor } = this.agent
		this.dispose()
		$followingFairyId.update(editor, () => null)
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
		const existingAgents = $fairyAgentsAtom.get(editor)
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
			const tooClose = existingAgents.some((agent) => {
				const otherPosition = agent.$fairyEntity.get().position
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
		const { editor } = this.agent
		return $followingFairyId.get(editor)
	}
}
