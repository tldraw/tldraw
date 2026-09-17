import {
	DefaultColorStyle,
	DefaultDashStyle,
	DefaultFillStyle,
	DefaultFontStyle,
	DefaultHorizontalAlignStyle,
	DefaultSizeStyle,
	DefaultVerticalAlignStyle,
	GeoShapeGeoStyle,
} from '@tldraw/tlschema'

export const JEV_MAX_STATE_BYTES = 32_000

export type JevMode = 'single' | 'staged'

export interface JevDecisionStep {
	question: string
	choice: string
	probability: number | null
	confidence: number | null
}

export const jevTools = {
	select: 'Select, move, resize, or edit existing shapes',
	draw: 'Draw freehand strokes',
	geo: 'Draw geometric shapes',
	arrow: 'Connect or point at shapes with arrows',
	line: 'Draw straight or multi-segment lines',
	text: 'Add a text label',
	note: 'Add a sticky note',
	frame: 'Group an area in a frame',
	highlight: 'Highlight with a freehand marker',
} as const

export const jevStyles = {
	color: DefaultColorStyle,
	dash: DefaultDashStyle,
	fill: DefaultFillStyle,
	size: DefaultSizeStyle,
	font: DefaultFontStyle,
	align: DefaultHorizontalAlignStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	geo: GeoShapeGeoStyle,
}

export type JevAction =
	| { type: 'none' }
	| { type: 'tool'; tool: keyof typeof jevTools }
	| { type: 'style'; style: keyof typeof jevStyles; value: string }

export interface JevPrediction {
	mode?: JevMode
	choices?: string[]
	steps?: JevDecisionStep[]
	choice: string
	suggestedChoice: string
	probability: number | null
	confidence: number | null
}

export function getJevQuestionWinner(
	response: unknown,
	question: string,
	criteria: Record<string, string>
): JevDecisionStep {
	const answer = (
		response as {
			answers?: Record<
				string,
				{ type?: unknown; choice?: unknown; probabilities?: unknown; confidence?: unknown }
			>
		} | null
	)?.answers?.[question]
	if (
		answer?.type !== 'choice' ||
		!answer.probabilities ||
		typeof answer.probabilities !== 'object' ||
		Array.isArray(answer.probabilities)
	)
		throw new Error('Invalid Jev answer')
	let choice = ''
	let probability = 0
	for (const [candidate, value] of Object.entries(answer.probabilities)) {
		if (
			!Object.hasOwn(criteria, candidate) ||
			typeof value !== 'number' ||
			!Number.isFinite(value) ||
			value < 0 ||
			value > 1
		)
			throw new Error('Invalid Jev probabilities')
		if (value > probability || (value === probability && answer.choice === candidate)) {
			choice = candidate
			probability = value
		}
	}
	if (!choice || probability <= 0) throw new Error('Missing Jev winner')
	return {
		question,
		choice,
		probability,
		confidence:
			typeof answer.confidence === 'number' && Number.isFinite(answer.confidence)
				? answer.confidence
				: null,
	}
}

export function getJevPrediction(response: unknown): JevPrediction {
	const choice = getJevDecision(response)
	const answer = (
		response as {
			answers?: {
				action?: { choice?: unknown; probabilities?: Record<string, unknown>; confidence?: unknown }
			}
		} | null
	)?.answers?.action
	const suggestedChoice = choice
	const probability = answer?.probabilities?.[suggestedChoice]
	return {
		choice,
		suggestedChoice,
		probability:
			typeof probability === 'number' && Number.isFinite(probability) ? probability : null,
		confidence:
			typeof answer?.confidence === 'number' && Number.isFinite(answer.confidence)
				? answer.confidence
				: null,
	}
}

export function getJevChoices(): Record<string, string> {
	const jevChoices = Object.fromEntries([
		[
			'none',
			'The current tool and styles already suit the predicted next action, or there is no meaningful basis to predict an adjustment.',
		],
		...Object.entries(jevTools).map(([tool, description]) => [`tool:${tool}`, description]),
		...Object.entries(jevStyles).flatMap(([style, prop]) =>
			prop.values
				.filter((value) => !value.endsWith('-legacy'))
				.map((value) => [`style:${style}:${value}`, `Set next-shape ${style} to ${value}`])
		),
	])
	console.warn('jev choiced', jevChoices)
	return jevChoices
}

export function parseJevAction(choice: unknown): JevAction | null {
	if (choice === 'none') return { type: 'none' }
	if (typeof choice !== 'string') return null
	const [type, name, value, extra] = choice.split(':')
	if (type === 'tool' && Object.hasOwn(jevTools, name) && value === undefined) {
		return { type, tool: name as keyof typeof jevTools }
	}
	if (type === 'style' && Object.hasOwn(jevStyles, name) && extra === undefined) {
		const style = name as keyof typeof jevStyles
		if ((jevStyles[style].values as readonly string[]).includes(value)) {
			return { type, style, value }
		}
	}
	return null
}

export function getJevDecision(response: unknown): string {
	if (!response || typeof response !== 'object' || !('answers' in response)) return 'none'
	const answers = response.answers
	if (!answers || typeof answers !== 'object' || !('action' in answers)) return 'none'
	const answer = answers.action
	if (!answer || typeof answer !== 'object') return 'none'
	if (!('type' in answer) || answer.type !== 'choice') return 'none'
	if (
		!('probabilities' in answer) ||
		!answer.probabilities ||
		typeof answer.probabilities !== 'object' ||
		Array.isArray(answer.probabilities)
	)
		return 'none'
	let winner = 'none'
	let highestProbability = 0
	for (const [choice, probability] of Object.entries(answer.probabilities)) {
		if (
			typeof probability !== 'number' ||
			!Number.isFinite(probability) ||
			probability < 0 ||
			probability > 1
		)
			return 'none'
		if (
			probability > highestProbability ||
			(probability === highestProbability && 'choice' in answer && answer.choice === choice)
		) {
			winner = choice
			highestProbability = probability
		}
	}
	return highestProbability > 0 && parseJevAction(winner) ? winner : 'none'
}
