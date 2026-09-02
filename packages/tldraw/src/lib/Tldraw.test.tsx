import { act, screen } from '@testing-library/react'
import { BaseBoxShapeUtil, Editor, StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { useState } from 'react'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from '../test/testutils/renderTldrawComponent'
import { Tldraw } from './Tldraw'

describe('<Tldraw />', () => {
	it('Renders without crashing', async () => {
		await renderTldrawComponent(
			<Tldraw>
				<div data-testid="canvas-1" />
			</Tldraw>,
			{ waitForPatterns: true }
		)

		await screen.findByTestId('canvas-1')
	})

	it('Doesnt cause re-render loops with unstable shape utils + tools', async () => {
		function TestComponent() {
			const [_, setEditor] = useState<Editor | null>(null)

			return (
				<Tldraw onMount={setEditor} shapeUtils={[]} tools={[]}>
					<div data-testid="canvas-1" />
				</Tldraw>
			)
		}

		await renderTldrawComponent(<TestComponent />, { waitForPatterns: true })
		await screen.findByTestId('canvas-1')
	})

	it('Doesnt cause re-render loops when shape utils change', async () => {
		class FakeShapeUtil1 extends BaseBoxShapeUtil<any> {
			static override type = 'fake' as const
			override getDefaultProps() {
				throw new Error('Method not implemented.')
			}
			override component(_: any) {
				throw new Error('Method not implemented.')
			}
			override getIndicatorPath(_: any): undefined {
				throw new Error('Method not implemented.')
			}
		}
		class FakeShapeUtil2 extends BaseBoxShapeUtil<any> {
			static override type = 'fake' as const
			override getDefaultProps() {
				throw new Error('Method not implemented.')
			}
			override component(_: any) {
				throw new Error('Method not implemented.')
			}
			override getIndicatorPath(_: any): undefined {
				throw new Error('Method not implemented.')
			}
		}

		const rendered = await renderTldrawComponent(
			<Tldraw shapeUtils={[FakeShapeUtil1]}>
				<div data-testid="canvas-1" />
			</Tldraw>,
			{ waitForPatterns: false }
		)

		await screen.findByTestId('canvas-1')

		await act(async () => {
			rendered.rerender(
				<Tldraw shapeUtils={[FakeShapeUtil2]}>
					<div data-testid="canvas-2" />
				</Tldraw>
			)
		})
		await screen.findByTestId('canvas-2')
	})

	it('correctly merges custom tools with default tools, allowing custom tools to override defaults', async () => {
		// Create a custom tool that overrides a default tool
		class CustomSelectTool extends StateNode {
			static override id = 'select' // This should override the default select tool
			static override initial = 'idle'
			static override children(): TLStateNodeConstructor[] {
				return [CustomIdleState]
			}
		}

		class CustomIdleState extends StateNode {
			static override id = 'idle'
		}

		// Create a custom tool that doesn't conflict with defaults
		class CustomTool extends StateNode {
			static override id = 'custom-tool'
			static override initial = 'idle'
			static override children(): TLStateNodeConstructor[] {
				return [CustomToolIdleState]
			}
		}

		class CustomToolIdleState extends StateNode {
			static override id = 'idle'
		}

		let editor: Editor
		await renderTldrawComponent(
			<Tldraw
				tools={[CustomSelectTool, CustomTool]}
				onMount={(e) => {
					editor = e
				}}
			/>,
			{ waitForPatterns: false }
		)

		// Verify that the custom select tool overrides the default select tool
		expect(editor!.root.children!['select']).toBeInstanceOf(CustomSelectTool)

		// Verify that the custom tool is also available
		expect(editor!.root.children!['custom-tool']).toBeInstanceOf(CustomTool)

		// Verify that other default tools are still available
		expect(editor!.root.children!['eraser']).toBeDefined()
		expect(editor!.root.children!['hand']).toBeDefined()
		expect(editor!.root.children!['zoom']).toBeDefined()
	})

	it('keyboard shortcuts work when hideUi is true', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw hideUi onMount={onMount} />,
			{ waitForPatterns: false }
		)

		// Focus the editor so keyboard shortcuts are active
		await act(async () => {
			editor.focus()
		})

		// Start on select tool
		expect(editor.getCurrentToolId()).toBe('select')

		await act(async () => {
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true })
			)
			document.body.dispatchEvent(
				new KeyboardEvent('keyup', { key: 'd', code: 'KeyD', bubbles: true })
			)
		})

		// Should now be on draw tool
		expect(editor.getCurrentToolId()).toBe('draw')

		await act(async () => {
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', bubbles: true })
			)
			document.body.dispatchEvent(
				new KeyboardEvent('keyup', { key: 'h', code: 'KeyH', bubbles: true })
			)
		})

		// Should now be on hand tool
		expect(editor.getCurrentToolId()).toBe('hand')
	})

	it('matches typed-character shortcuts on alternative Latin layouts (Dvorak)', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw hideUi onMount={onMount} />,
			{ waitForPatterns: false }
		)

		await act(async () => {
			editor.focus()
		})

		// Dvorak's 'd' lives at the physical position QWERTY calls 'KeyH'. The user typed 'd';
		// matching by typed character (event.key) selects the draw tool regardless of physical position.
		await act(async () => {
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'd', code: 'KeyH', bubbles: true })
			)
			document.body.dispatchEvent(
				new KeyboardEvent('keyup', { key: 'd', code: 'KeyH', bubbles: true })
			)
		})
		expect(editor.getCurrentToolId()).toBe('draw')

		// Dvorak's 'e' lives at the physical position QWERTY calls 'KeyD'.
		await act(async () => {
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'e', code: 'KeyD', bubbles: true })
			)
			document.body.dispatchEvent(
				new KeyboardEvent('keyup', { key: 'e', code: 'KeyD', bubbles: true })
			)
		})
		expect(editor.getCurrentToolId()).toBe('eraser')
	})

	it('falls back to physical key for non-Latin layouts (Cyrillic)', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw hideUi onMount={onMount} />,
			{ waitForPatterns: false }
		)

		await act(async () => {
			editor.focus()
		})

		// Cyrillic users pressing the physical KeyA position type 'ф'. Since the typed character
		// has no ASCII shortcut, we fall back to event.code's US-QWERTY equivalent ('a') — which
		// activates the arrow tool just as it would on a QWERTY keyboard.
		await act(async () => {
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'ф', code: 'KeyA', bubbles: true })
			)
			document.body.dispatchEvent(
				new KeyboardEvent('keyup', { key: 'ф', code: 'KeyA', bubbles: true })
			)
		})
		expect(editor.getCurrentToolId()).toBe('arrow')
	})

	it('matches modifier shortcuts (cmd/ctrl) regardless of layout', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw hideUi onMount={onMount} />,
			{ waitForPatterns: false }
		)

		await act(async () => {
			editor.focus()
		})

		await act(async () => {
			editor.createShape({ id: 'shape:test' as any, type: 'geo', x: 0, y: 0 })
		})
		expect(editor.getCurrentPageShapeIds().size).toBe(1)

		await act(async () => {
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: 'z',
					code: 'KeyZ',
					metaKey: true,
					bubbles: true,
				})
			)
			document.body.dispatchEvent(
				new KeyboardEvent('keyup', {
					key: 'z',
					code: 'KeyZ',
					metaKey: true,
					bubbles: true,
				})
			)
		})

		// cmd+z should undo the shape creation (kbd is 'cmd+z,ctrl+z')
		expect(editor.getCurrentPageShapeIds().size).toBe(0)
	})

	it('matches the comma key for the temporary zoom shortcut on Dvorak', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw hideUi onMount={onMount} />,
			{ waitForPatterns: false }
		)

		await act(async () => {
			editor.focus()
		})

		// Dvorak's comma is at the physical KeyW position. With layout-independent matching by
		// event.code (the v4 hotkeys-js bug) the library would read this as 'w' and the comma
		// zoom would never engage. We match by typed character so the registered ',' shortcut
		// fires correctly.
		await act(async () => {
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', { key: ',', code: 'KeyW', bubbles: true })
			)
		})
		expect(editor.inputs.keys.has('Comma')).toBe(true)

		await act(async () => {
			document.body.dispatchEvent(
				new KeyboardEvent('keyup', { key: ',', code: 'KeyW', bubbles: true })
			)
		})
		expect(editor.inputs.keys.has('Comma')).toBe(false)
	})

	it('does not fire shortcuts when typing into a textarea', async () => {
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => <Tldraw hideUi onMount={onMount} />,
			{ waitForPatterns: false }
		)

		await act(async () => {
			editor.focus()
		})

		expect(editor.getCurrentToolId()).toBe('select')

		const textarea = document.createElement('textarea')
		document.body.appendChild(textarea)
		try {
			await act(async () => {
				textarea.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true })
				)
				textarea.dispatchEvent(
					new KeyboardEvent('keyup', { key: 'd', code: 'KeyD', bubbles: true })
				)
			})
			// Should remain on select tool — the shortcut is filtered out for textarea targets.
			expect(editor.getCurrentToolId()).toBe('select')
		} finally {
			textarea.remove()
		}
	})
})
