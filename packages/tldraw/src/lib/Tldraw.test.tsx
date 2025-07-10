import { act, screen } from '@testing-library/react'
import { BaseBoxShapeUtil, Editor, StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { useState } from 'react'
import { renderTldrawComponent } from '../test/testutils/renderTldrawComponent'
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
			override indicator(_: any) {
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
			override indicator(_: any) {
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
})
