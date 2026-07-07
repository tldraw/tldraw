/**
 * Calls `event.preventDefault()`.
 *
 * @param event - To prevent default on
 * @public
 */
export function preventDefault(event: React.BaseSyntheticEvent | Event) {
	if ('cancelable' in event && !event.cancelable) return
	event.preventDefault()
}

/**
 * Calls `event.stopPropagation()`.
 *
 * @public
 */
export function stopEventPropagation(e: { stopPropagation(): void }) {
	return e.stopPropagation()
}
