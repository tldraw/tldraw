/**
 * Frontend API client for the Cloudflare Worker backend.
 * Mirrors the worker's provider types so the contract stays in one shape.
 */

export interface OutputType {
	id: string
	label: string
	width: number
	height: number
	/** The platform this format targets, used to group the format picker. */
	platform?: string
}

/** A piece of text the app renders deterministically over the background. */
export interface TextLayer {
	text: string
	x: number
	y: number
	width: number
	fontRole: 'heading' | 'body'
	fontSize: number
	color: string
	align: 'left' | 'center' | 'right'
	weight: 'normal' | 'bold'
	scrim: boolean
}

export interface GenerateRequest {
	prompt: string
	brandText: string
	outputType: OutputType
	referenceImages: string[]
	/** On a background edit, the current background as a data URL. */
	currentImage?: string
	/** On a background edit, the instruction to apply. */
	instruction?: string
}

export interface GenerateResult {
	imageUrl: string
}

/** Render or edit the text-free background image. */
export async function apiGenerate(params: GenerateRequest): Promise<GenerateResult> {
	const response = await fetch('/api/generate', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(params),
	})
	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }))
		throw new Error((err as { error?: string }).error ?? 'Generation failed')
	}
	return (await response.json()) as GenerateResult
}

export interface PlanRequest {
	mode: 'create' | 'revise'
	prompt: string
	brandText: string
	outputType: OutputType
	image: string
	currentLayers?: TextLayer[]
	annotations?: string[]
	/** A distinct messaging angle for this asset, so a batch's captions vary. */
	captionAngle?: string
}

export interface PlanResult {
	textLayers: TextLayer[]
	/** Body copy shown beside the asset (the social caption), not on the image. */
	caption: string
	backgroundInstructions: string[]
}

/** Plan the text layers (and, on revise, any background edits). */
export async function apiPlan(params: PlanRequest): Promise<PlanResult> {
	const response = await fetch('/api/plan', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(params),
	})
	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }))
		throw new Error((err as { error?: string }).error ?? 'Planning failed')
	}
	return (await response.json()) as PlanResult
}

export interface ClarifyRequest {
	prompt: string
	brandText: string
	outputType: OutputType
}

export interface ClarifyResult {
	questions: string[]
}

/**
 * Ask the planner for a few clarifying questions before the first batch, given
 * the brief, the brand, and the chosen format. Returns an empty list if the brief
 * is already clear.
 */
export async function apiClarify(params: ClarifyRequest): Promise<ClarifyResult> {
	const response = await fetch('/api/clarify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(params),
	})
	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }))
		throw new Error((err as { error?: string }).error ?? 'Could not get questions')
	}
	return (await response.json()) as ClarifyResult
}
