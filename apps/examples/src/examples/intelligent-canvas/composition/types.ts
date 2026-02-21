import { TLShapeId } from 'tldraw'

export type IdeaStatus = 'seed' | 'accepted'
export type CompositionDomain = 'idea' | 'code'

export interface IdeaShapeMeta {
	kind: 'idea-node'
	domain?: CompositionDomain
	title: string
	description: string
	inputs: string[]
	outputs: string[]
	language?: string
	code?: string
	depth: number
	parents: TLShapeId[]
	status: IdeaStatus
}

export interface IdeaNode {
	id: TLShapeId
	domain: CompositionDomain
	title: string
	description: string
	inputs: string[]
	outputs: string[]
	language?: string
	code?: string
	depth: number
	parents: TLShapeId[]
	status: IdeaStatus
	x: number
	y: number
}

export interface PairSuggestion {
	a: IdeaNode
	b: IdeaNode
	interfaceScore: number
	diversityScore: number
	depthPenalty: number
	finalScore: number
	pairKey: string
	bridge?: string
}

export interface GroupSuggestion {
	members: IdeaNode[]
	arity: number
	groupKey: string
	spreadScore: number
	meshScore: number
	depthPenalty: number
	finalScore: number
	source: 'beam' | 'random' | 'exhaustive'
}

export interface RankedSuggestions {
	pairs: PairSuggestion[]
	groups: GroupSuggestion[]
}

export interface ParsedIdea {
	title: string
	description: string
	inputs: string[]
	outputs: string[]
	language?: string
	code?: string
}

export interface ComposedIdeaDraft {
	title: string
	description: string
	inputs: string[]
	outputs: string[]
	language?: string
	code?: string
	whyThisCombination: string
}
