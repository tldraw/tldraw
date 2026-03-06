import { useCallback } from 'react'
import { Editor, Tldraw, toRichText } from 'tldraw'
import { mermaidBlockLoopFixtures } from '../../../../../../packages/tldraw/src/test/fixtures/mermaidBlockLoopFixtures'
import { mermaidClassLoopFixtures } from '../../../../../../packages/tldraw/src/test/fixtures/mermaidClassLoopFixtures'
import { mermaidERLoopFixtures } from '../../../../../../packages/tldraw/src/test/fixtures/mermaidERLoopFixtures'
import { mermaidFlowchartLoopFixtures } from '../../../../../../packages/tldraw/src/test/fixtures/mermaidFlowchartLoopFixtures'
import { mermaidSequenceLoopFixtures } from '../../../../../../packages/tldraw/src/test/fixtures/mermaidSequenceLoopFixtures'
import { mermaidStateLoopFixtures } from '../../../../../../packages/tldraw/src/test/fixtures/mermaidStateLoopFixtures'

interface MermaidFixture {
	id: string
	title: string
	source: string
	kind: 'flowchart' | 'state' | 'sequence' | 'class' | 'er' | 'block'
}

const GRID_COLUMNS = 6
const GRID_STEP_X = 1900
const GRID_STEP_Y = 1500
const GRID_ORIGIN_X = 600
const GRID_ORIGIN_Y = 500

const allFixtures: MermaidFixture[] = [
	...mermaidFlowchartLoopFixtures.map((fixture) => ({ ...fixture, kind: 'flowchart' as const })),
	...mermaidStateLoopFixtures.map((fixture) => ({ ...fixture, kind: 'state' as const })),
	...mermaidSequenceLoopFixtures.map((fixture) => ({ ...fixture, kind: 'sequence' as const })),
	...mermaidClassLoopFixtures.map((fixture) => ({ ...fixture, kind: 'class' as const })),
	...mermaidERLoopFixtures.map((fixture) => ({ ...fixture, kind: 'er' as const })),
	...mermaidBlockLoopFixtures.map((fixture) => ({ ...fixture, kind: 'block' as const })),
]

export default function MermaidGalleryExample() {
	const handleMount = useCallback((editor: Editor) => {
		void (async () => {
			;(window as typeof window & { editor?: Editor }).editor = editor
			const existingShapeIds = Array.from(editor.getCurrentPageShapeIds())
			if (existingShapeIds.length) {
				editor.deleteShapes(existingShapeIds)
			}

			editor.selectNone()
			editor.setCurrentTool('select')

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
		})()
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} persistenceKey="mermaid" />
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
