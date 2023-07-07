import { TLEditorOptions } from '@tldraw/editor'
import { TestEditor as _TestEditor } from '@tldraw/editor/src/lib/test/TestEditor'
import { defaultShapeTools } from '../lib/defaultShapeTools'
import { defaultShapeUtils } from '../lib/defaultShapeUtils'
export { TL } from '@tldraw/editor/src/lib/test/test-jsx'

export class TestEditor extends _TestEditor {
	constructor(opts = {} as Partial<Omit<TLEditorOptions, 'store'>>) {
		super({
			...opts,
			shapeUtils: [...(opts.shapeUtils ?? []), ...defaultShapeUtils],
			tools: [...(opts.tools ?? []), ...defaultShapeTools],
		})
	}
}
