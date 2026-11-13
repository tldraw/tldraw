import { act, render } from '@testing-library/react'
import { Editor, EditorProvider } from '@tldraw/editor'
import { vi } from 'vitest'
import { renderTldrawComponentWithEditor } from '../../../test/testutils/renderTldrawComponent'
import { Tldraw } from '../../Tldraw'
import { getFillDefForCanvas } from './defaultStyleDefs'

let editor: Editor
let fillStyles: string[]

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor

	fillStyles = []
	vi.spyOn(CanvasRenderingContext2D.prototype, 'fillRect').mockImplementation(
		function (this: CanvasRenderingContext2D) {
			fillStyles.push(String(this.fillStyle))
		}
	)
	// The pattern generator is skipped when NODE_ENV is 'test'.
	vi.stubEnv('NODE_ENV', 'development')
})

afterEach(() => {
	vi.unstubAllEnvs()
	vi.restoreAllMocks()
})

it('regenerates the pattern images when the theme solid colors change', async () => {
	const { component: PatternFillDef } = getFillDefForCanvas()
	render(
		<EditorProvider editor={editor}>
			<svg>
				<defs>
					<PatternFillDef />
				</defs>
			</svg>
		</EditorProvider>
	)

	const theme = editor.getCurrentTheme()
	await act(async () => {
		editor.updateTheme({
			...theme,
			colors: {
				light: { ...theme.colors.light, solid: '#123456' },
				dark: { ...theme.colors.dark, solid: '#654321' },
			},
		})
	})

	expect(fillStyles).toContain('#123456')
	expect(fillStyles).toContain('#654321')
})
