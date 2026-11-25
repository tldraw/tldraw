/**
 * For a menu's `onCloseAutoFocus`: leaves focus where it is when something took it as the menu
 * closed, such as the input Rename opens, instead of handing it back to the menu's trigger.
 */
export function keepClaimedFocus(event: Event) {
	const { ownerDocument } = event.target as Node
	if (!ownerDocument) return
	const active = ownerDocument.activeElement
	if (active && active !== ownerDocument.body) event.preventDefault()
}
