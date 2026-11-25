// @vitest-environment node
//
// The headless entry (`createEditor`, the Editor class and the built-in kernel plugins) must not
// load React. React is an output layer: the React plugins and `legacyEditorPlugins` bring it in.
import { vi } from 'vitest'

vi.mock('react', () => {
	throw Error('react was imported')
})
vi.mock('react-dom', () => {
	throw Error('react-dom was imported')
})
vi.mock('react-dom/client', () => {
	throw Error('react-dom/client was imported')
})
vi.mock('react/jsx-runtime', () => {
	throw Error('react/jsx-runtime was imported')
})
vi.mock('react/jsx-dev-runtime', () => {
	throw Error('react/jsx-dev-runtime was imported')
})

test('the headless editor and its kernel plugins load without React', async () => {
	const { createEditor } = await import('./createEditor')
	const { approximateTextMeasurementPlugin } = await import('./builtin/textMeasurement')
	const { snappingPlugin } = await import('./builtin/snappingPlugin')
	const { externalContentPlugin } = await import('./builtin/externalContent')

	const editor = createEditor({
		plugins: [approximateTextMeasurementPlugin(), snappingPlugin, externalContentPlugin],
	})
	editor.createShape({ type: 'group' })
	expect(editor.getCurrentPageShapes()).toHaveLength(1)
})
