import { google } from './google'
import { openai } from './openai'
import { placeholder } from './placeholder'
import { replicate } from './replicate'
import { stability } from './stability'
import type { ImageProvider } from './types'

export type {
	GenerateParams,
	GenerateResult,
	ImageProvider,
	UpscaleParams,
	UpscaleResult,
} from './types'

const providers: Record<string, ImageProvider> = {
	'stable-diffusion': stability,
	flux: replicate,
	dalle: openai,
	'nano-banana': google,
}

export function getProvider(name: string): ImageProvider {
	return providers[name] ?? placeholder
}

const upscaleProviders: Record<string, ImageProvider> = {
	ai_enhanced: replicate,
	standard: stability,
}

export function getUpscaleProvider(method: string): ImageProvider {
	return upscaleProviders[method] ?? placeholder
}
