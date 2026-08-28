/**
 * Data in, .tldr file out — diagram generation with no browser anywhere.
 *
 * A common server-side job: something structured (a build pipeline, a service graph, an
 * agent's plan) needs to become a canvas people can open in tldraw and edit. The headless
 * editor makes this a plain function: create shapes, connect them with bindings, serialize
 * with the same `.tldr` writer the app uses, done.
 *
 * Two details worth stealing:
 * - Layout is computed from the data (longest-path layering), then handed to the editor as
 *   coordinates. The editor is the document authority, not the layout engine — align/stack
 *   helpers exist, but a generator usually knows its own geometry.
 * - The round-trip at the end (`parseTldrawJsonFile` into a second editor) is the cheap
 *   generation-time test that the file you wrote is one tldraw can read — worth keeping in
 *   any production generator.
 *
 * Run it: yarn tsx packages/headless/examples/generate-tldr.ts [output.tldr]
 */

import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	TLArrowShape,
	TLGeoShape,
	TLShapeId,
	TLTextShape,
	createShapeId,
	loadSnapshot,
} from '@tldraw/editor'
import { createHeadlessEditor } from '@tldraw/headless'
import { toRichText } from '@tldraw/tlschema'
import { parseTldrawJsonFile, serializeTldrawJson } from 'tldraw/headless-defaults'

interface Stage {
	id: string
	label: string
	status: 'passed' | 'failed' | 'pending'
	needs: string[]
}

// In production this comes from your CI API, your service registry, or an agent's plan.
const PIPELINE: Stage[] = [
	{ id: 'checkout', label: 'Checkout', status: 'passed', needs: [] },
	{ id: 'deps', label: 'Install deps', status: 'passed', needs: ['checkout'] },
	{ id: 'lint', label: 'Lint', status: 'passed', needs: ['deps'] },
	{ id: 'unit', label: 'Unit tests', status: 'passed', needs: ['deps'] },
	{ id: 'e2e', label: 'E2E tests', status: 'failed', needs: ['deps'] },
	{ id: 'build', label: 'Build', status: 'passed', needs: ['lint', 'unit'] },
	{ id: 'deploy', label: 'Deploy', status: 'pending', needs: ['build', 'e2e'] },
]

const STATUS_COLOR = { passed: 'green', failed: 'red', pending: 'grey' } as const

/**
 * Longest-path layering: a stage sits one column right of its deepest dependency. Real
 * pipeline data has real problems, so dangling references and cycles are reported as
 * errors instead of a stack overflow.
 */
function computeLayers(stages: Stage[]): Map<string, number> {
	const layers = new Map<string, number>()
	const visiting = new Set<string>()
	const visit = (stage: Stage): number => {
		const cached = layers.get(stage.id)
		if (cached !== undefined) return cached
		if (visiting.has(stage.id)) {
			throw new Error(`dependency cycle through "${stage.id}"`)
		}
		visiting.add(stage.id)
		const deps = stage.needs.map((need) => {
			const dep = stages.find((s) => s.id === need)
			if (!dep) throw new Error(`stage "${stage.id}" needs unknown stage "${need}"`)
			return dep
		})
		const layer = deps.length === 0 ? 0 : Math.max(...deps.map(visit)) + 1
		visiting.delete(stage.id)
		layers.set(stage.id, layer)
		return layer
	}
	for (const stage of stages) visit(stage)
	return layers
}

export async function run(
	// A fresh temp dir per run: concurrent runs can't collide on the output file.
	outputPath = join(mkdtempSync(join(tmpdir(), 'tldraw-example-')), 'release-pipeline.tldr'),
	log: (message: string) => void = console.log
) {
	const editor = createHeadlessEditor()
	try {
		const layers = computeLayers(PIPELINE)
		const columns = new Map<number, number>()
		const shapeIds = new Map<string, TLShapeId>()

		editor.createShape<TLTextShape>({
			id: createShapeId(),
			type: 'text',
			x: 0,
			y: -120,
			props: { richText: toRichText('Release pipeline — run #1284'), size: 'l' },
		})

		for (const stage of PIPELINE) {
			const layer = layers.get(stage.id)!
			const row = columns.get(layer) ?? 0
			columns.set(layer, row + 1)
			const id = createShapeId()
			shapeIds.set(stage.id, id)
			editor.createShape<TLGeoShape>({
				id,
				type: 'geo',
				x: layer * 280,
				y: row * 140,
				props: {
					geo: 'rectangle',
					w: 200,
					h: 90,
					richText: toRichText(stage.label),
					color: STATUS_COLOR[stage.status],
					fill: 'semi',
				},
			})
		}

		for (const stage of PIPELINE) {
			for (const need of stage.needs) {
				const arrowId = createShapeId()
				editor.createShape<TLArrowShape>({ id: arrowId, type: 'arrow', x: 0, y: 0 })
				editor.createBindings([
					{
						type: 'arrow',
						fromId: arrowId,
						toId: shapeIds.get(need)!,
						props: { terminal: 'start' },
					},
					{
						type: 'arrow',
						fromId: arrowId,
						toId: shapeIds.get(stage.id)!,
						props: { terminal: 'end' },
					},
				])
			}
		}

		// The same serializer the tldraw app's "Save as .tldr" uses — the output opens
		// directly in tldraw.com or any SDK app with the default shapes.
		const tldrJson = await serializeTldrawJson(editor)
		writeFileSync(outputPath, tldrJson)
		log(`wrote ${outputPath} (${tldrJson.length} bytes)`)

		// Round-trip verification in a second headless editor: parse, load, compare counts.
		const verifier = createHeadlessEditor()
		try {
			const parsed = parseTldrawJsonFile({ json: tldrJson, schema: verifier.store.schema })
			if (!parsed.ok) throw new Error(`generated file failed to parse: ${parsed.error.type}`)
			loadSnapshot(verifier.store, parsed.value.getStoreSnapshot())
			const shapes = verifier.getCurrentPageShapes()
			const expectedArrows = PIPELINE.reduce((sum, stage) => sum + stage.needs.length, 0)
			if (shapes.filter((s) => s.type === 'geo').length !== PIPELINE.length) {
				throw new Error('round-trip lost stage boxes')
			}
			if (shapes.filter((s) => s.type === 'arrow').length !== expectedArrows) {
				throw new Error('round-trip lost arrows')
			}
			// A healthy pipeline has no red stage — don't assume one exists.
			const failed = shapes.find(
				(s): s is TLGeoShape => s.type === 'geo' && (s as TLGeoShape).props.color === 'red'
			)
			const failedNote = failed
				? `, failing stage at ${verifier.getShapePageBounds(failed.id)!.x},${verifier.getShapePageBounds(failed.id)!.y}`
				: ''
			log(`round-trip ok: ${shapes.length} shapes${failedNote}`)
			return outputPath
		} finally {
			verifier.dispose()
		}
	} finally {
		editor.dispose()
	}
}

const isMain = (() => {
	if (!process.argv[1]) return false
	try {
		return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
	} catch {
		return false
	}
})()
if (isMain) {
	run(process.argv[2]).catch((e) => {
		console.error(e)
		process.exit(1)
	})
}
