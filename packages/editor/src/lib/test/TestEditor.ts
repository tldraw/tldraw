import { createTLStore } from '../config/createTLStore'
import { Editor, TLEditorContainer, TLEditorOptions } from '../editor/Editor'
import { StateNode } from '../editor/tools/StateNode'

class CustomTool extends StateNode {
	static override id = 'custom'
}

export class TestEditor extends Editor {
	constructor(options: Partial<Omit<TLEditorOptions, 'store'>> = {}) {
		const elm = document.createElement('div') as unknown as TLEditorContainer
		elm.__tldraw__ = {}
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
