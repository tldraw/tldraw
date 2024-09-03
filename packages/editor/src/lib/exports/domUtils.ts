export function getRenderedChildNodes(node: Element): Iterable<Node> {
	if (node.shadowRoot) {
		return node.shadowRoot.childNodes
	}
	if (isShadowSlotElement(node)) {
		const assignedNodes = node.assignedNodes()
		if (assignedNodes?.length) {
			return assignedNodes
		}
	}
	return node.childNodes
}

export function* getRenderedChildren(node: Element) {
	for (const child of getRenderedChildNodes(node)) {
		if (isElement(child)) yield child
	}
}

function getWindow(node: Node) {
	return node.ownerDocument?.defaultView ?? globalThis
}

export function isElement(node: Node): node is Element {
	return node instanceof getWindow(node).Element
}

function isShadowRoot(node: Node): node is ShadowRoot {
	return node instanceof getWindow(node).ShadowRoot
}

function isInShadowRoot(node: Node) {
	return 'getRootNode' in node && isShadowRoot(node.getRootNode())
}

function isShadowSlotElement(node: Node): node is HTMLSlotElement {
	return isInShadowRoot(node) && node instanceof getWindow(node).HTMLSlotElement
}

export function elementStyle(element: Element) {
	return (element as HTMLElement | SVGElement).style
}

export function getComputedStyle(element: Element, pseudoElement?: string) {
	return getWindow(element).getComputedStyle(element, pseudoElement)
}
