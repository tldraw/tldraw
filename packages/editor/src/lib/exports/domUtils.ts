export function getRenderedChildNodes(node: Element): Iterable<Node> {
	if (node.shadowRoot) {
		// if this is a custom element with a shadow root, then it's the shadow root's children that
		// are visible in the DOM. This is only accessible if they created the shadow root with
		// `mode: 'open'` though.
		return node.shadowRoot.childNodes
	}
	if (isShadowSlotElement(node)) {
		// if this is a `<slot>` within a shadow root, we should render the nodes that are being
		// templated into the slot instead of the slot children itself.
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
