import { useCallback } from 'react'
import { Editor, Tldraw, toRichText } from 'tldraw'
import { mermaidFlowchartLoopFixtures } from '../../../../../../packages/tldraw/src/test/fixtures/mermaidFlowchartLoopFixtures'
import { mermaidStateLoopFixtures } from '../../../../../../packages/tldraw/src/test/fixtures/mermaidStateLoopFixtures'

interface MermaidFixture {
	id: string
	title: string
	source: string
	kind: 'flowchart' | 'state'
}

const GRID_COLUMNS = 6
const GRID_STEP_X = 1900
const GRID_STEP_Y = 1500
const GRID_ORIGIN_X = 600
const GRID_ORIGIN_Y = 500

const allFixtures: MermaidFixture[] = [
	...mermaidFlowchartLoopFixtures.map((fixture) => ({ ...fixture, kind: 'flowchart' as const })),
	...mermaidStateLoopFixtures.map((fixture) => ({ ...fixture, kind: 'state' as const })),
]

export default function MermaidGalleryExample() {
	const handleMount = useCallback((editor: Editor) => {
		void (async () => {
			const existingShapeIds = Array.from(editor.getCurrentPageShapeIds())
			if (existingShapeIds.length) {
				editor.deleteShapes(existingShapeIds)
			}

			editor.selectNone()
			editor.setCurrentTool('select')
			editor.user.updateUserPreferences({ colorScheme: 'light', animationSpeed: 0 })

			for (const [index, fixture] of allFixtures.entries()) {
				const col = index % GRID_COLUMNS
				const row = Math.floor(index / GRID_COLUMNS)
				const point = {
					x: GRID_ORIGIN_X + col * GRID_STEP_X,
					y: GRID_ORIGIN_Y + row * GRID_STEP_Y,
				}

				editor.createShape({
					type: 'text',
					x: point.x - 650,
					y: point.y - 520,
					props: {
						richText: toRichText(`${index + 1}. [${fixture.kind}] ${fixture.id}`),
					},
				})

				await editor.putExternalContent({
					type: 'text',
					text: fixture.source,
					point,
				})

				await waitForAnimationFrames(2)
			}

			const shapes = editor.getCurrentPageShapes()
			if (shapes.length) {
				editor.select(...shapes.map((shape) => shape.id))
				editor.zoomToSelection()
				editor.selectNone()
			}
		})()
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} />
		</div>
	)
}

function waitForAnimationFrames(count: number) {
	return new Promise<void>((resolve) => {
		const tick = (remaining: number) => {
			if (remaining <= 0) {
				resolve()
				return
			}
			requestAnimationFrame(() => tick(remaining - 1))
		}

		tick(count)
	})
}
