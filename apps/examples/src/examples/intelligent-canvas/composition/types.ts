import { TLShapeId } from 'tldraw'

export type IdeaStatus = 'seed' | 'proposed' | 'accepted' | 'rejected'
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
}

export interface PairDecision {
	pairKey: string
	decision: 'accepted' | 'rejected'
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
