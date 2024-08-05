import { useEmbedDefinitions } from '@tldraw/editor'
import { TLEmbedResult, getEmbedInfoUnsafely } from '../../utils/embeds/embeds'

/** @public */
export function useEmbedDefinition(url: string): TLEmbedResult {
	const definitions = useEmbedDefinitions()
	return getEmbedInfoUnsafely(definitions, url)
}
