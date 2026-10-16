import { NodeRegistry } from './types'

/**
 * Node registry covering the TipTap StarterKit node set. Consumers with extra nodes spread this
 * into their own registry.
 *
 * @public
 */
export const defaultNodeRegistry: NodeRegistry = {
	doc: { kind: 'block' },
	paragraph: { kind: 'block' },
	heading: { kind: 'block' },
	blockquote: { kind: 'block' },
	codeBlock: { kind: 'block' },
	horizontalRule: { kind: 'block' },
	bulletList: { kind: 'list', ordered: false },
	orderedList: { kind: 'list', ordered: true, startAttr: 'start' },
	listItem: { kind: 'listItem' },
	hardBreak: { kind: 'hardBreak' },
	text: { kind: 'text' },
}
