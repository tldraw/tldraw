import { useGetEmbedShapeUtil } from './useGetEmbedDefinition'

/** @public */
export function useGetEmbedDefinitions() {
	const embedUtil = useGetEmbedShapeUtil()
	return embedUtil ? embedUtil.getEmbedDefinitions() : []
}
