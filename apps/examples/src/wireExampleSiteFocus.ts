import type { Editor } from '@tldraw/editor'

const SIDEBAR_SELECTOR = '.example__sidebar'

export function isExampleSiteSidebarRoute() {
	const path = window.location.pathname
	return path !== '/develop' && path !== '/end-to-end' && !path.endsWith('/full')
}

/** Wire sidebar/canvas focus using plain DOM class selectors. */
export function wireExampleSiteFocus(editor: Editor) {
	if (!isExampleSiteSidebarRoute()) return () => {}

	const container = editor.getContainer()
	const sidebar = document.querySelector(SIDEBAR_SELECTOR)

	const blur = () => editor.blur()
	const focus = () => editor.focus()

	sidebar?.addEventListener('pointerenter', blur)
	container.addEventListener('pointerenter', focus)

	return () => {
		sidebar?.removeEventListener('pointerenter', blur)
		container.removeEventListener('pointerenter', focus)
	}
}
