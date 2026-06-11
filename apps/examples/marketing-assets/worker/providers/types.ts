/**
 * The output format the user picked (Instagram square, story, etc.). Width and
 * height are the real target pixel dimensions; the label and id are passed to the
 * model as a format hint.
 */
export interface OutputType {
	id: string
	label: string
	width: number
	height: number
	/** The platform this format targets (LinkedIn, X, Instagram, …). Steers the
	 * voice and length of the accompanying copy. */
	platform?: string
}

/**
 * A single piece of text the app renders deterministically over the background.
 * All geometry is normalized to the asset: x/y/width are fractions of the asset's
 * width/height (x,y = top-left of the text box), fontSize is a fraction of the
 * asset height. Text never goes through the image model.
 */
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

/**
 * Parameters for a background render. A first generation has no `currentImage` or
 * `instruction`; a background edit supplies both. Backgrounds are always text-free.
 */
export interface GenerateParams {
	prompt: string
	brandText: string
	outputType: OutputType
	referenceImages: string[]
	currentImage?: string
	instruction?: string
}

export interface GenerateResult {
	/** The generated text-free background as a data URL. */
	imageUrl: string
}

/**
 * Parameters for the text-planning stage (Claude).
 * - `create`: lay out text for a fresh background.
 * - `revise`: update the text and/or request background edits from annotations.
 */
export interface PlanParams {
	mode: 'create' | 'revise'
	prompt: string
	brandText: string
	outputType: OutputType
	/** create: the text-free background. revise: the annotated composite. */
	image: string
	/** revise: the current text layers to update. */
	currentLayers?: TextLayer[]
	/** revise: located annotation descriptions. */
	annotations?: string[]
	/** A distinct messaging angle for this asset, so a batch's captions vary. */
	captionAngle?: string
}

export interface PlanResult {
	/**
	 * The text rendered over the background. Capped at a single headline so the
	 * image stays clean — all other words go in `caption`.
	 */
	textLayers: TextLayer[]
	/**
	 * The accompanying body copy shown beside the asset (the social post / caption),
	 * not rendered on the image. Voiced for the brand tone and tailored to the
	 * output platform (e.g. business for LinkedIn, developer-focused for X), at a
	 * length that suits that platform.
	 */
	caption: string
	/** On revise, edits to apply to the background image (empty on create). */
	backgroundInstructions: string[]
}

/**
 * Parameters for the clarifying-questions stage, run before the first batch from
 * the brief, brand, and chosen format alone (no image yet).
 */
export interface ClarifyParams {
	prompt: string
	brandText: string
	outputType: OutputType
}

export interface ClarifyResult {
	/** A few short questions to sharpen the brief, or empty if it's already clear. */
	questions: string[]
}

export interface ImageProvider {
	name: string
	generate(params: GenerateParams, env: Env): Promise<GenerateResult>
}

export interface PlanProvider {
	name: string
	plan(params: PlanParams, env: Env): Promise<PlanResult>
	clarify(params: ClarifyParams, env: Env): Promise<ClarifyResult>
}

/** Split a `data:` URL into its mime type and base64 payload. */
export function parseDataUrl(url: string): { mimeType: string; data: string } {
	const match = url.match(/^data:([^;]+);base64,(.*)$/)
	if (!match) {
		throw new Error('Expected a base64 data URL')
	}
	return { mimeType: match[1], data: match[2] }
}
