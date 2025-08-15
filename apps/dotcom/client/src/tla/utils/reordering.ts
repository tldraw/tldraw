import { IndexKey, getIndexBetween } from 'tldraw'

export interface ReorderDragState {
	itemId: string
	cursorLineY: number | null
	nextIndex: IndexKey | null
}

export interface ReorderingConfig {
	/** Selector to find draggable items in the DOM */
	itemSelector: string
	/** Attribute name that contains the item ID */
	itemIdAttribute: string
	/** Attribute name that contains the current index */
	itemIndexAttribute: string
	/** Function called when an item's index should be updated */
	updateIndex(itemId: string, index: IndexKey): void | Promise<void>
}

export function createReorderingSystem(config: ReorderingConfig) {
	function getNearestItems(mouseY: number): [HTMLElement | undefined, HTMLElement | undefined] {
		const itemDivs = document.querySelectorAll(config.itemSelector) as NodeListOf<HTMLElement>

		let minDistance = Infinity
		let closestDivIndex = -1
		let insertType = 'before' as 'before' | 'after'

		for (let i = 0; i < itemDivs.length; i++) {
			const itemDiv = itemDivs[i]
			const itemDivRect = itemDiv.getBoundingClientRect()
			const centerY = itemDivRect.top + itemDivRect.height / 2
			const distance = Math.abs(centerY - mouseY)
			if (distance < minDistance) {
				minDistance = distance
				closestDivIndex = i
				insertType = centerY > mouseY ? 'before' : 'after'
			}
		}

		const closestDiv = itemDivs[closestDivIndex]
		const neighborDiv = itemDivs[closestDivIndex + (insertType === 'before' ? -1 : 1)]

		return insertType === 'before' ? [neighborDiv, closestDiv] : [closestDiv, neighborDiv]
	}

	function calculateDragState(
		itemId: string,
		mouseY: number
	): { cursorLineY: number | null; nextIndex: IndexKey | null } {
		const [before, after] = getNearestItems(mouseY)

		// If dropping here would not change the item's position, don't show drag state
		if (
			before?.getAttribute(config.itemIdAttribute) === itemId ||
			after?.getAttribute(config.itemIdAttribute) === itemId
		) {
			return {
				cursorLineY: null,
				nextIndex: null,
			}
		}

		const nextIndex = getIndexBetween(
			before?.getAttribute(config.itemIndexAttribute) as IndexKey | undefined,
			after?.getAttribute(config.itemIndexAttribute) as IndexKey | undefined
		)

		const beforeRect = before?.getBoundingClientRect()
		const afterRect = after?.getBoundingClientRect()
		const margin = 2
		const cursorLineY = !before
			? afterRect!.top - margin
			: !after
				? beforeRect!.bottom + margin
				: (beforeRect!.bottom + afterRect!.top) / 2

		return {
			cursorLineY,
			nextIndex,
		}
	}

	return {
		calculateDragState,
		getNearestItems,
	}
}
