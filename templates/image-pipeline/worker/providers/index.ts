import { replicate } from './replicate'
import type { ImageProvider } from './types'

export type {
	GenerateParams,
	GenerateResult,
	ImageProvider,
	UpscaleParams,
	UpscaleResult,
} from './types'

export function getProvider(_name: string): ImageProvider {
	return replicate
}

export function getUpscaleProvider(_method: string): ImageProvider {
	return replicate
}
