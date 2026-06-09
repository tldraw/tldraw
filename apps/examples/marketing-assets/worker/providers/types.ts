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
}

export interface PlanResult {
	/** The full set of text layers to render. */
	textLayers: TextLayer[]
	/** On revise, edits to apply to the background image (empty on create). */
	backgroundInstructions: string[]
}

export interface ImageProvider {
	name: string
	generate(params: GenerateParams, env: Env): Promise<GenerateResult>
}

export interface PlanProvider {
	name: string
	plan(params: PlanParams, env: Env): Promise<PlanResult>
}

/** Split a `data:` URL into its mime type and base64 payload. */
export function parseDataUrl(url: string): { mimeType: string; data: string } {
	const match = url.match(/^data:([^;]+);base64,(.*)$/)
	if (!match) {
		throw new Error('Expected a base64 data URL')
	}
	return { mimeType: match[1], data: match[2] }
}
