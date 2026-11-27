/** @internal */
export function getOwnerWindow(
	nodeOrDocument: Node | Document | null | undefined
): Window & typeof globalThis {
	if (!nodeOrDocument) return globalThis as Window & typeof globalThis
	const doc = isDocument(nodeOrDocument) ? nodeOrDocument : nodeOrDocument.ownerDocument
	return (doc?.defaultView ?? globalThis) as Window & typeof globalThis
}

/** @internal */
export function getOwnerDocument(nodeOrDocument: Node | Document | null | undefined): Document {
	if (!nodeOrDocument) return globalThis.document
	if (isDocument(nodeOrDocument)) return nodeOrDocument
	return nodeOrDocument.ownerDocument ?? globalThis.document
}

function isDocument(node: Node | Document): node is Document {
	return node.nodeType === Node.DOCUMENT_NODE
}
