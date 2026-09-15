import { isEqual } from '@tldraw/utils'
import type { Mermaid, MermaidConfig } from 'mermaid'
import type { FlowDB } from 'mermaid/dist/diagrams/flowchart/flowDb.d.ts'
import type { FlowEdge, FlowSubGraph, FlowVertex } from 'mermaid/dist/diagrams/flowchart/types.js'
import type { MindmapDB } from 'mermaid/dist/diagrams/mindmap/mindmapDb.d.ts'
import type { SequenceDB } from 'mermaid/dist/diagrams/sequence/sequenceDb.d.ts'
import type { StateDB } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import { Editor } from 'tldraw'
import { flowchartToBlueprint, parseFlowchartLayout } from './flowchartDiagram'
import { mindmapToBlueprint, parseMindmapLayout } from './mindmapDiagram'
import { BlueprintRenderingOptions, renderBlueprint } from './renderBlueprint'
import { countSequenceEvents, parseSequenceLayout, sequenceToBlueprint } from './sequenceDiagram'
import { parseStateDiagramLayout, stateToBlueprint } from './stateDiagram'

let nextMermaidId = 0

/** @public */
export class MermaidDiagramError extends Error {
	constructor(
		public diagramType: string,
		public type: 'parse' | 'unsupported'
	) {
		super(`mermaid diagram error: ${diagramType}`)
		this.name = 'MermaidDiagramError'
	}
}

// Inflate the font size so Mermaid's layout engine allocates larger nodes,
// compensating for tldraw's hand-drawn font being wider than Mermaid's default.
const FONT_INFLATE = 1.4

const MERMAID_CONFIG = {
	startOnLoad: false,
	flowchart: { nodeSpacing: 80, rankSpacing: 80, padding: 20 },
	state: { nodeSpacing: 80, rankSpacing: 80, padding: 20 },
	mindmap: { padding: 20 },
	sequence: { actorMargin: 50, noteMargin: 20 },
	themeVariables: { fontSize: `${18 * FONT_INFLATE}px` },
}

/** @public */
export interface MermaidDiagramOptions {
	mermaidConfig?: Record<string, any>
	blueprintRender?: BlueprintRenderingOptions
	onUnsupportedDiagram?(svg: string): Promise<void>
}

/**
 * Parse mermaid text and create tldraw shapes for supported diagram types.
 * Returns the SVG string for supported diagrams, or `null` when the diagram type
 * is unsupported (after calling `onUnsupportedDiagram` if provided).
 * Throws {@link MermaidDiagramError} if parsing fails.
 * @public
 */
export async function createMermaidDiagram(
	editor: Editor,
	text: string,
	options: MermaidDiagramOptions = {}
): Promise<void> {
	// load mermaid lazily: it's a large, ESM-only dependency only needed when a
	// diagram is actually created. a dynamic import() works from CommonJS (unlike
	// a static import, which compiles to require(<esm>) and throws
	// ERR_REQUIRE_ESM on Node <20.19, Jest, and ts-node) and avoids pulling
	// mermaid in when @tldraw/mermaid is merely imported.
	const mermaid = (await import('mermaid')).default

	const restoreHostConfig = await applyMermaidConfig(mermaid, {
		...MERMAID_CONFIG,
		...(options.mermaidConfig ?? {}),
		flowchart: { ...MERMAID_CONFIG.flowchart, ...options.mermaidConfig?.flowchart },
		state: { ...MERMAID_CONFIG.state, ...options.mermaidConfig?.state },
		mindmap: { ...MERMAID_CONFIG.mindmap, ...options.mermaidConfig?.mindmap },
		sequence: { ...MERMAID_CONFIG.sequence, ...options.mermaidConfig?.sequence },
		themeVariables: { ...MERMAID_CONFIG.themeVariables, ...options.mermaidConfig?.themeVariables },
		// A diagram's own `%%{init}%%` or frontmatter config outranks `initialize`, so one that sets
		// `fontSize` undoes FONT_INFLATE: every box is measured small while tldraw still draws its
		// wider face, and labels break mid-word. Mermaid strips `secure` keys from in-diagram config
		// at any depth, and keeps its own defaults alongside the ones listed here.
		secure: [...(options.mermaidConfig?.secure ?? []), 'fontSize'],
	})

	try {
		await convertMermaidDiagram(mermaid, editor, text, options, restoreHostConfig)
	} finally {
		restoreHostConfig()
	}
}

let mermaidConfigLock = Promise.resolve()

/**
 * Mermaid has one page-wide config, so ours is only applied for the length of a conversion and the
 * host app's is put back afterwards. Conversions take turns: otherwise one finishing would restore
 * the host's config while another is still laying out.
 */
async function applyMermaidConfig(mermaid: Mermaid, config: MermaidConfig) {
	const previousLock = mermaidConfigLock
	let unlock!: () => void
	mermaidConfigLock = new Promise((resolve) => (unlock = resolve))
	await previousLock

	let hostConfig: MermaidConfig | undefined
	let restored = false
	const restoreHostConfig = () => {
		if (restored) return
		restored = true
		try {
			if (hostConfig) mermaid.initialize(hostConfig)
		} finally {
			unlock()
		}
	}

	try {
		hostConfig = getHostConfig(mermaid)
		// Throws on theme variables mermaid can't parse as colors, for example.
		mermaid.initialize(config)
	} catch (e) {
		restoreHostConfig()
		throw e
	}
	return restoreHostConfig
}

/**
 * Mermaid exposes the config the host's `initialize` produced, not what it passed. Re-initializing
 * with all of it would pin every default as if the host had chosen it: a `layout` of `dagre`, for
 * one, overrides the layout a mindmap or `flowchart-elk` diagram asks for. So keep only what
 * differs from a bare `initialize` with the same theme, which the theme variables derive from.
 */
function getHostConfig(mermaid: Mermaid): MermaidConfig {
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	const { getSiteConfig } = mermaid.mermaidAPI
	const siteConfig = getSiteConfig()
	mermaid.initialize({ theme: siteConfig.theme })
	return { theme: siteConfig.theme, ...diffConfig(siteConfig, getSiteConfig()) }
}

function diffConfig(config: Record<string, any>, base: Record<string, any>) {
	const diff: Record<string, any> = {}
	for (const [key, value] of Object.entries(config)) {
		if (isPlainObject(value) && isPlainObject(base[key])) {
			const nested = diffConfig(value, base[key])
			if (Object.keys(nested).length) diff[key] = nested
		} else if (!isEqual(value, base[key])) {
			diff[key] = value
		}
	}
	return diff
}

function isPlainObject(value: unknown): value is Record<string, any> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function convertMermaidDiagram(
	mermaid: Mermaid,
	editor: Editor,
	text: string,
	options: MermaidDiagramOptions,
	restoreHostConfig: () => void
) {
	const parsedResult = await mermaid.parse(text, { suppressErrors: true })

	if (!parsedResult) {
		throw new MermaidDiagramError('not a mermaid diagram', 'parse')
	}

	const offscreen = document.createElement('div')
	Object.assign(offscreen.style, {
		position: 'absolute',
		left: '-9999px',
		top: '-9999px',
		overflow: 'hidden',
	})
	document.body.appendChild(offscreen)

	try {
		const parsedSvg = (await mermaid.render(`mermaid-${nextMermaidId++}`, text, offscreen)).svg

		// Reuse the live SVG that mermaid.render() already mounted into the
		// offscreen container.  This avoids a second DOM mount and ensures
		// getBBox() works for every diagram type (state diagrams in particular
		// lack explicit dimension attributes and rely on live layout).
		let liveSvg = offscreen.querySelector('svg')

		if (!liveSvg) {
			offscreen.innerHTML = parsedSvg
			liveSvg = offscreen.querySelector('svg')
			if (!liveSvg) {
				throw new MermaidDiagramError(parsedResult.diagramType, 'parse')
			}
		}

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const diagramResult = await mermaid.mermaidAPI.getDiagramFromText(text)

		let blueprint
		switch (parsedResult.diagramType) {
			case 'flowchart-v2': {
				const db = diagramResult.db as FlowDB
				const vertices = db.getVertices() as Map<string, FlowVertex>
				const edges = db.getEdges() as FlowEdge[]
				const subGraphs = db.getSubGraphs() as FlowSubGraph[]
				const classes = db.getClasses()
				const layout = parseFlowchartLayout(liveSvg)
				blueprint = flowchartToBlueprint(layout, vertices, edges, subGraphs, classes)
				break
			}
			case 'sequence': {
				const db = diagramResult.db as SequenceDB
				const actors = db.getActors()
				const actorKeys = db.getActorKeys()
				const messages = db.getMessages()
				const layout = parseSequenceLayout(liveSvg, actorKeys.length, countSequenceEvents(messages))
				blueprint = sequenceToBlueprint(
					layout,
					actors,
					actorKeys,
					messages,
					db.getCreatedActors(),
					db.getDestroyedActors()
				)
				break
			}
			case 'state':
			case 'stateDiagram': {
				const db = diagramResult.db as StateDB
				const states = db.getStates()
				const relations = db.getRelations()
				const classes = db.getClasses()
				const layout = parseStateDiagramLayout(liveSvg)
				blueprint = stateToBlueprint(layout, states, relations, classes)
				break
			}
			case 'mindmap': {
				const db = diagramResult.db as MindmapDB
				const tree = db.getMindmap()
				if (tree) {
					db.assignSections(tree)
					const layout = parseMindmapLayout(liveSvg)
					blueprint = mindmapToBlueprint(layout, tree, liveSvg)
				}
				break
			}
			default:
				if (options.onUnsupportedDiagram) {
					// The callback may render with mermaid itself, or start another conversion.
					restoreHostConfig()
					await options.onUnsupportedDiagram(parsedSvg)
				} else {
					throw new MermaidDiagramError(parsedResult.diagramType, 'unsupported')
				}
				break
		}

		if (blueprint) {
			renderBlueprint(editor, blueprint, options.blueprintRender)
		}
	} catch (e) {
		if (e instanceof MermaidDiagramError) throw e
		console.error(e)
		throw new MermaidDiagramError(parsedResult.diagramType, 'parse')
	} finally {
		offscreen.remove()
	}
}
