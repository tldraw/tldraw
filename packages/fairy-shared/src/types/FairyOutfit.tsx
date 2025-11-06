import { T } from 'tldraw'
import { FAIRY_VARIANTS, FairyVariantType } from './FairyVariant'

/**
 * A fairy outfit is a combination of variants for each part of the fairy.
 */
export interface FairyOutfit {
	body: FairyVariantType<'body'>
	hat: FairyVariantType<'hat'>
	wings: FairyVariantType<'wings'>
}

export const fairyOutfitValidator: T.ObjectValidator<FairyOutfit> = T.object({
	body: T.literalEnum(...(Object.keys(FAIRY_VARIANTS.body) as FairyVariantType<'body'>[])),
	hat: T.literalEnum(...(Object.keys(FAIRY_VARIANTS.hat) as FairyVariantType<'hat'>[])),
	wings: T.literalEnum(...(Object.keys(FAIRY_VARIANTS.wings) as FairyVariantType<'wings'>[])),
})
