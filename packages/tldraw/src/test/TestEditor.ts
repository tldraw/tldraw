import { TLEditorOptions } from '@tldraw/editor'
import { TestEditor as _TestEditor } from '@tldraw/editor/src/lib/test/TestEditor'
import { defaultShapes } from '../lib/defaultShapes'
export { TL } from '@tldraw/editor/src/lib/test/test-jsx'

export class TestEditor extends _TestEditor {
	constructor(opts = {} as Partial<Omit<TLEditorOptions, 'store'>>) {
		super({ ...opts, shapes: [...(opts.shapes ?? []), ...defaultShapes] })
	}
}
