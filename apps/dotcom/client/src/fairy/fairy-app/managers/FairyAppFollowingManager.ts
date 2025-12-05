import { Atom, atom, Box, react } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { BaseFairyAppManager } from './BaseFairyAppManager'

/**
 * Manager for fairy camera following - controls which fairy the camera follows.
 *
 * This duplicates functionality from FairyAgentPositionManager
 * but in a centralized form tied to FairyApp.
 */
export class FairyAppFollowingManager extends BaseFairyAppManager {
	/**
	 * Atom to track which fairy is currently being followed by the camera.
	 * Contains the fairy ID being followed, or null if not following any fairy.
	 */
	private $followingFairyId: Atom<string | null> = atom('fairyAppFollowingFairyId', null)

	/**
	 * Cleanup functions for following reactions.
	 */
	private cleanupFns: (() => void)[] = []

	/**
	 * Get the ID of the fairy currently being followed, or null if not following.
	 */
	getFollowingFairyId(): string | null {
		return this.$followingFairyId.get()
	}

	/**
	 * Check if currently following a specific fairy.
	 */
	isFollowingFairy(fairyId: string): boolean {
		return this.$followingFairyId.get() === fairyId
	}

	/**
	 * Check if currently following any fairy.
	 */
	isFollowing(): boolean {
		return this.$followingFairyId.get() !== null
	}

	/**
	 * Start following a fairy with the camera.
	 * The camera will automatically zoom to the fairy's position whenever it moves or changes pages.
	 * Following stops automatically when the user scrolls (wheel event) or manually changes pages.
	 */
	startFollowing(fairyId: string) {
		// Stop any existing following first
		this.stopFollowing()

		const agent = this.fairyApp.agents.getAgentById(fairyId)
		if (!agent) {
			console.warn('Could not find fairy agent with id:', fairyId)
			return
		}

		this.$followingFairyId.set(fairyId)

		// Track last seen position/page to avoid redundant zooms and feedback loops
		let lastX: number | null = null
		let lastY: number | null = null
		let lastPageId: string | null = null

		const disposeFollow = react('follow fairy', () => {
			const currentFairyId = this.$followingFairyId.get()
			if (currentFairyId !== fairyId) {
				// We're no longer following this fairy
				return
			}

			const currentAgent = this.fairyApp.agents.getAgentById(fairyId)
			if (!currentAgent) {
				this.stopFollowing()
				return
			}

			const fairyEntity = currentAgent.getEntity()
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

			this.zoomToFairy(currentAgent)
		})

		// Listen for user input events that should stop following
		const onWheel = () => this.stopFollowing()
		document.addEventListener('wheel', onWheel, { passive: false, capture: true })

		// Also stop following when the user manually changes pages
		const disposePageChange = react('stop following on page change', () => {
			const { editor } = this.fairyApp
			const currentPageId = editor.getCurrentPageId()

			// Skip initial page check
			if (!lastPageId) {
				return
			}

			// If user changed page manually (not from following), stop following
			const currentAgent = this.fairyApp.agents.getAgentById(fairyId)
			if (currentAgent) {
				const fairyPageId = currentAgent.getEntity()?.currentPageId
				if (currentPageId !== fairyPageId && currentPageId !== lastPageId) {
					this.stopFollowing()
				}
			}
		})

		// Store dispose functions so we can clean them up later
		this.cleanupFns.push(
			() => disposeFollow(),
			() => disposePageChange(),
			() => document.removeEventListener('wheel', onWheel)
		)
	}

	/**
	 * Stop following any fairy with the camera.
	 * Cleans up all reactive subscriptions and event listeners associated with following.
	 */
	stopFollowing() {
		this.cleanupFns.forEach((cleanup) => cleanup())
		this.cleanupFns = []
		this.$followingFairyId.set(null)
	}

	/**
	 * Zoom the camera to a fairy's position.
	 * Also switches to the page where the fairy is located.
	 */
	zoomToFairy(agent: FairyAgent) {
		const entity = agent.getEntity()
		if (!entity) return

		const { editor } = this.fairyApp

		// Switch to the fairy's page
		if (entity.currentPageId !== editor.getCurrentPageId()) {
			editor.setCurrentPage(entity.currentPageId)
		}

		// Zoom to the fairy's position
		editor.zoomToBounds(Box.FromCenter(entity.position, { x: 100, y: 100 }), {
			animation: { duration: 220 },
			targetZoom: 1,
		})
	}

	/**
	 * Reset the manager to its initial state.
	 */
	reset() {
		this.stopFollowing()
	}

	/**
	 * Dispose of the following manager. Call this during cleanup.
	 */
	dispose() {
		this.stopFollowing()
		super.dispose()
	}
}
