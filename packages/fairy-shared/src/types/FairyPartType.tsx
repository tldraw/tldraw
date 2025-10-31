import { FairyVariantDefinition } from './FairyVariant'

/**
 * The parts of a fairy.
 */
export type FairyPartType = 'hat' | 'body' | 'wings'

/**
 * A definition of a fairy part, eg: the hat part.
 * It's a map of variants, where the key is the variant name and the value is a definition of that variant.
 */
export interface FairyPartDefinition {
	[key: string]: FairyVariantDefinition
}
