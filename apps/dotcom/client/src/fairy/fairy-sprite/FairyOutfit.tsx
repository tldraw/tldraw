import { FairyVariantType } from './FairyVariant'

/**
 * A fairy outfit is a combination of variants for each part of the fairy.
 */
export interface FairyOutfit {
	body: FairyVariantType<'body'>
	hat: FairyVariantType<'hat'>
	wings: FairyVariantType<'wings'>
}
