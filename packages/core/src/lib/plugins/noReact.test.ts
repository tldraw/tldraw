// @vitest-environment node
//
// `@tldraw/core` must not load React. React is an output layer in `@tldraw/editor`. Core names
// React types in its declarations, so React is an optional peer dependency, never a dependency.
import { readFileSync } from 'fs'
import { join } from 'path'
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

test('the core entry loads without React and runs a headless editor', async () => {
	const { createEditor, approximateTextMeasurementPlugin, snappingPlugin, externalContentPlugin } =
		await import('../../index')

	const editor = createEditor({
		plugins: [approximateTextMeasurementPlugin(), snappingPlugin, externalContentPlugin],
	})
	editor.createShape({ type: 'group' })
	expect(editor.getCurrentPageShapes()).toHaveLength(1)
})

test('core does not depend on React', () => {
	const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf8'))
	const react = ['react', 'react-dom', '@tiptap/react', '@tldraw/state-react']
	expect(Object.keys(pkg.dependencies).filter((name) => react.includes(name))).toEqual([])
	for (const name of Object.keys(pkg.peerDependencies ?? {})) {
		if (react.includes(name)) expect(pkg.peerDependenciesMeta?.[name]?.optional).toBe(true)
	}
})
