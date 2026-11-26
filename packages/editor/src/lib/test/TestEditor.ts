import { createTLStore } from '@tldraw/core'
import { Editor, TLEditorOptions } from '@tldraw/core'
import { StateNode } from '@tldraw/core'

class CustomTool extends StateNode {
	static override id = 'custom'
}

export class TestEditor extends Editor {
	constructor(options: Partial<Omit<TLEditorOptions, 'store'>> = {}) {
		// eslint-disable-next-line no-restricted-globals
		const elm = document.createElement('div')
		elm.tabIndex = 0

		const shapeUtils = [...(options.shapeUtils ?? [])]
		const bindingUtils = [...(options.bindingUtils ?? [])]

		super({
			...options,
			shapeUtils,
			bindingUtils,
			tools: [...(options.tools ?? [CustomTool])],
			store: createTLStore({
				shapeUtils,
				bindingUtils,
			}),
			getContainer: () => elm,
			initialState: options.initialState ?? 'custom',
		})
	}
}
