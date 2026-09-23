import { render } from '@testing-library/react'
import { ContainerProvider, EditorProvider, useLicenseContext } from '@tldraw/editor'
import { vi } from 'vitest'
import { Tldraw } from '../lib/Tldraw'
import { DefaultToolbar } from '../lib/ui/components/Toolbar/DefaultToolbar'
import { TldrawUiContextProvider } from '../lib/ui/context/TldrawUiContextProvider'
import { useCommentingEnabled } from '../lib/ui/hooks/useCommentingEnabled'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

// Default UI components can be mounted beside <Tldraw /> rather than inside it, wrapped in the
// providers the caller recreates (container, editor, ui context). The license provider is not
// among them — it only exists inside <TldrawEditor />.
describe('default UI mounted outside <Tldraw />', () => {
	it('renders the default toolbar and resolves license feature flags through the editor', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw onMount={onMount} components={{ Toolbar: null }} />,
			{ waitForPatterns: true }
		)

		expect(editor.licenseManager).toBeDefined()

		let commentingEnabled: boolean | undefined
		function CommentingProbe() {
			commentingEnabled = useCommentingEnabled()
			return null
		}

		const result = render(
			<ContainerProvider container={editor.getContainer()}>
				<EditorProvider editor={editor}>
					<TldrawUiContextProvider>
						<DefaultToolbar />
						<CommentingProbe />
					</TldrawUiContextProvider>
				</EditorProvider>
			</ContainerProvider>
		)

		expect(await result.findByTestId('tools.select')).toBeTruthy()
		// In tests the environment counts as development, where every feature is licensed — so a
		// `true` here proves the flag resolved via the editor's license manager, not the
		// fail-closed `false` of having no license manager at all.
		expect(commentingEnabled).toBe(true)
	})

	it('license feature flags fail closed with no editor and no license context', () => {
		let commentingEnabled: boolean | undefined
		function CommentingProbe() {
			commentingEnabled = useCommentingEnabled()
			return null
		}

		render(<CommentingProbe />)

		expect(commentingEnabled).toBe(false)
	})

	it('useLicenseContext throws when there is no license provider and no editor', () => {
		function LicenseProbe() {
			useLicenseContext()
			return null
		}

		// silence React's error boundary logging for the expected throw
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			expect(() => render(<LicenseProbe />)).toThrow(
				'useLicenseContext must be used inside of the <Tldraw /> or <TldrawEditor /> components'
			)
		} finally {
			consoleError.mockRestore()
		}
	})
})
