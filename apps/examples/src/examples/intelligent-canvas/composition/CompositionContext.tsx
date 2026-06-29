import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Editor, TLShapeId, TLShapePartial } from 'tldraw'
import { evaluateBridge } from './embeddings'
import {
	createIdeaNode,
	getComposedIdeaPosition,
	getIdeaNodeById,
	getIdeaNodes,
	getMidpointPosition,
	repelOverlaps,
} from './graph'
import {
	composeCodeBlocks,
	composeCodePair,
	composeIdeaPair,
	composeIdeas,
	priorTemperature,
} from './llm'
import { prewarmPatterns } from './patternRetrieval'
import { CompositionDomain, IdeaNode } from './types'

interface CompositionState {
	domain: CompositionDomain
	setDomain: (domain: CompositionDomain) => void
	priorCompositions: Map<string, string[]>
	busyPairs: Set<string>
	agentAvailable: boolean
	error: string | null
	setError: (error: string | null) => void
	handleCompose: (editor: Editor, groupKey: string, parentIds: TLShapeId[]) => Promise<void>
	getPriorTemperature: (groupKey: string) => number | undefined
}

const CompositionContext = createContext<CompositionState | null>(null)

export function useComposition(): CompositionState {
	const ctx = useContext(CompositionContext)
	if (!ctx) throw new Error('useComposition must be used within CompositionProvider')
	return ctx
}

interface CompositionProviderProps {
	agentAvailable: boolean
	children: React.ReactNode
}

export function CompositionProvider({ agentAvailable, children }: CompositionProviderProps) {
	const [domain, setDomain] = useState<CompositionDomain>('idea')
	const [priorCompositions, setPriorCompositions] = useState<Map<string, string[]>>(new Map())
	const [busyPairs, setBusyPairs] = useState<Set<string>>(new Set())
	const [error, setError] = useState<string | null>(null)

	// Warm the game design pattern embeddings ahead of the first composition.
	useEffect(() => {
		if (agentAvailable) prewarmPatterns()
	}, [agentAvailable])

	const handleCompose = useCallback(
		async (editor: Editor, groupKey: string, parentIds: TLShapeId[]) => {
			if (!agentAvailable) {
				setError('Gemini API is not configured. Add GEMINI_API_KEY to .env.local.')
				return
			}
			const parents: IdeaNode[] = []
			for (const pid of parentIds) {
				const node = getIdeaNodeById(editor, pid)
				if (!node) return
				parents.push(node)
			}

			const priorTitles = priorCompositions.get(groupKey) ?? []

			setBusyPairs((prev) => new Set(prev).add(groupKey))
			setError(null)
			try {
				// For 2-node pairs, evaluate bridge reasoning (best-effort)
				let bridge: string | undefined
				if (parents.length === 2) {
					try {
						const bridgeResult = await evaluateBridge(parents[0], parents[1])
						if (bridgeResult.pass && bridgeResult.bridge) {
							bridge = bridgeResult.bridge
							console.log(`[Bridge] "${parents[0].title}" x "${parents[1].title}": ${bridge}`)
						}
					} catch {
						// Bridge evaluation is best-effort — compose without it
					}
				}

				const draft =
					parents.length === 2
						? domain === 'code'
							? await composeCodePair(parents[0], parents[1], priorTitles, bridge)
							: await composeIdeaPair(parents[0], parents[1], priorTitles, bridge)
						: domain === 'code'
							? await composeCodeBlocks(parents, priorTitles)
							: await composeIdeas(parents, priorTitles)
				const pIds = parents.map((p) => p.id)
				// Place at midpoint between parents (where the (+) was)
				const pos = getMidpointPosition(editor, pIds) ?? getComposedIdeaPosition(editor, pIds)
				const id = createIdeaNode(
					editor,
					{
						domain,
						title: draft.title,
						description: `${draft.description}\n\nWhy: ${draft.whyThisCombination}`,
						inputs: draft.inputs,
						outputs: draft.outputs,
						language: draft.language,
						code: draft.code,
						depth: Math.max(...parents.map((p) => p.depth)) + 1,
						parents: pIds,
						status: 'accepted',
					},
					pos
				)

				// Run overlap repulsion and animate everything apart
				const allNodes = getIdeaNodes(editor)
				const resolved = repelOverlaps(allNodes.map((n) => ({ id: n.id, x: n.x, y: n.y })))
				const partials = resolved
					.map((r) => {
						const shape = editor.getShape(r.id)
						if (!shape) return null
						// Skip nodes that didn't move
						if (Math.abs(shape.x - r.x) < 1 && Math.abs(shape.y - r.y) < 1) return null
						return { id: r.id, type: shape.type, x: r.x, y: r.y } as TLShapePartial
					})
					.filter((p): p is TLShapePartial => p !== null)
				if (partials.length > 0) {
					editor.animateShapes(partials, { animation: { duration: 400 } })
				}

				setPriorCompositions((prev) => {
					const next = new Map(prev)
					next.set(groupKey, [...(prev.get(groupKey) ?? []), draft.title])
					return next
				})
				editor.select(id)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Composition failed.')
			} finally {
				setBusyPairs((prev) => {
					const next = new Set(prev)
					next.delete(groupKey)
					return next
				})
			}
		},
		[agentAvailable, domain, priorCompositions]
	)

	const getPriorTemperature = useCallback(
		(groupKey: string) => {
			const count = priorCompositions.get(groupKey)?.length ?? 0
			return priorTemperature(count)
		},
		[priorCompositions]
	)

	const value = useMemo(
		(): CompositionState => ({
			domain,
			setDomain,
			priorCompositions,
			busyPairs,
			agentAvailable,
			error,
			setError,
			handleCompose,
			getPriorTemperature,
		}),
		[
			domain,
			priorCompositions,
			busyPairs,
			agentAvailable,
			error,
			handleCompose,
			getPriorTemperature,
		]
	)

	return <CompositionContext.Provider value={value}>{children}</CompositionContext.Provider>
}
