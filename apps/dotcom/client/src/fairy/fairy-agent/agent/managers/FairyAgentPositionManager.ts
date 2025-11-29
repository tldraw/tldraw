import { Box, Editor, react, VecModel } from 'tldraw'
import { $followingFairyId } from '../../../fairy-globals'
import { AgentHelpers } from '../AgentHelpers'
import { FairyAgent } from '../FairyAgent'
import { getFairyAgentById } from '../fairyAgentsAtom'

/**
 * Store for the reactive dispose functions so we can properly clean them up.
 */
const followDisposeHandlers = new WeakMap<Editor, () => void>()

/**
 * Manages fairy positioning and camera operations.
 * Handles moving the fairy, camera following, and page synchronization.
 */
export class FairyAgentPositionManager {
	constructor(public agent: FairyAgent) {}

	/**
	 * Move the fairy to a position.
	 * @param position - The position to move the fairy to.
	 */
	moveToPosition(position: VecModel) {
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
	 * @param offset - Optional offset from the center position
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
	 */
	moveToSpawnPoint() {
		// This method would need access to the findFairySpawnPoint function
		// which is currently defined at the module level in FairyAgent.ts
		// For now, this is a placeholder
		const center = this.agent.editor.getViewportPageBounds().center
		const currentPageId = this.agent.editor.getCurrentPageId()
		this.agent.$fairyEntity.update((f) =>
			f ? { ...f, position: AgentHelpers.RoundVec(center), currentPageId } : f
		)
		this.agent.gestureManager.push('poof', 400)
	}

	/**
	 * Start following this fairy with the camera.
	 */
	startFollowing() {
		startFollowingFairy(this.agent.editor, this.agent.id)
	}

	/**
	 * Stop following this fairy with the camera.
	 */
	stopFollowing() {
		stopFollowingFairy(this.agent.editor)
	}

	/**
	 * Check if this fairy is currently being followed.
	 */
	isFollowing() {
		return getFollowingFairyId(this.agent.editor) === this.agent.id
	}
}

/**
 * Get the ID of the fairy currently being followed for a given editor.
 */
export function getFollowingFairyId(editor: Editor): string | null {
	return $followingFairyId.get(editor)
}

/**
 * Start following a fairy with the camera.
 * Similar to editor.startFollowingUser but for fairies.
 */
export function startFollowingFairy(editor: Editor, fairyId: string) {
	stopFollowingFairy(editor)

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
		const currentFairyId = getFollowingFairyId(editor)
		if (currentFairyId !== fairyId) {
			// We're no longer following this fairy
			return
		}

		const currentAgent = getFairyAgentById(fairyId, editor)
		if (!currentAgent) {
			stopFollowingFairy(editor)
			return
		}

		const fairyEntity = currentAgent.$fairyEntity.get()
		if (!fairyEntity) {
			stopFollowingFairy(editor)
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

		currentAgent.zoomTo()
	})

	// Listen for user input events that should stop following
	const onWheel = () => stopFollowingFairy(editor)
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
				stopFollowingFairy(editor)
			}
		}
	})

	// Store dispose functions so we can clean them up later
	const dispose = () => {
		disposeFollow()
		disposePageChange()
		document.removeEventListener('wheel', onWheel)
	}
	followDisposeHandlers.set(editor, dispose)
}

/**
 * Stop following any fairy with the camera.
 */
export function stopFollowingFairy(editor: Editor) {
	const dispose = followDisposeHandlers.get(editor)
	if (dispose) {
		dispose()
		followDisposeHandlers.delete(editor)
	}
	$followingFairyId.update(editor, () => null)
}
