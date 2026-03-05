import { TLGeoShape } from '@tldraw/editor'
import { defaultHandleExternalTextContent } from '../lib/defaultExternalContentHandlers'
import { renderPlaintextFromRichText } from '../lib/utils/text/richText'
import {
	MermaidBlockLoopFixture,
	mermaidBlockLoopFixtures,
} from './fixtures/mermaidBlockLoopFixtures'
import { TestEditor } from './TestEditor'

const isStrictLoopMode = process.env.TLDRAW_MERMAID_LOOP_STRICT === '1'

describe('mermaid block loop fixtures', () => {
	for (const fixture of mermaidBlockLoopFixtures) {
		const shouldRun = isStrictLoopMode || fixture.status === 'supported'
		const testFn = shouldRun ? it : it.skip

		testFn(`[${fixture.status}] ${fixture.id}: ${fixture.title}`, async () => {
			const result = await importFixture(fixture)

			expect(result.geoCount).toBe(fixture.expected.geo)
			expect(result.arrowCount).toBe(fixture.expected.arrow)
			expect(result.textCount).toBe(fixture.expected.text)

			for (const requiredLabel of fixture.expected.requiredGeoLabels ?? []) {
				expect(result.geoLabels).toContain(requiredLabel)
			}

			for (const forbiddenLabel of fixture.expected.forbiddenGeoLabels ?? []) {
				expect(result.geoLabels).not.toContain(forbiddenLabel)
			}
		})
	}
})

async function importFixture(fixture: MermaidBlockLoopFixture) {
	const editor = new TestEditor()
	await defaultHandleExternalTextContent(editor, { text: fixture.source })

	const shapes = editor.getCurrentPageShapes()
	const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')

	return {
		geoCount: geoShapes.length,
		arrowCount: shapes.filter((shape) => shape.type === 'arrow').length,
		textCount: shapes.filter((shape) => shape.type === 'text').length,
		geoLabels: geoShapes.map((shape) =>
			renderPlaintextFromRichText(editor, shape.props.richText).trim()
		),
	}
}
