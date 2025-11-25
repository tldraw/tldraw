import { FairyPartDefinition, FairyPartType } from './FairyPartType'
import { FairyPose } from './FairyPose'

const FAIRY_HAT_VARIANTS = {
	top: { idle: ['/fairy/fairy-hat-top.png'], poof: ['/fairy/fairy-loading.png'] },
	pointy: { idle: ['/fairy/fairy-hat-point.png'], poof: ['/fairy/fairy-loading.png'] },
	bald: { idle: ['/fairy/fairy-hat-bald.png'], poof: ['/fairy/fairy-loading.png'] },
	antenna: { idle: ['/fairy/fairy-hat-antenna.png'], poof: ['/fairy/fairy-loading.png'] },
	spiky: { idle: ['/fairy/fairy-hat-spiky.png'], poof: ['/fairy/fairy-loading.png'] },
	hair: { idle: ['/fairy/fairy-hat-hair.png'], poof: ['/fairy/fairy-loading.png'] },
	ears: { idle: ['/fairy/fairy-hat-ears.png'], poof: ['/fairy/fairy-loading.png'] },
	propellor: { idle: ['/fairy/fairy-hat-propellor.png'], poof: ['/fairy/fairy-loading.png'] },
} as const satisfies FairyPartDefinition

const FAIRY_WINGS_VARIANTS = {
	plain: {
		idle: ['/fairy/fairy-wing-0.png'],
		active: ['/fairy/fairy-wing-0.png', '/fairy/fairy-wing-1.png'],
		thinking: ['/fairy/fairy-wing-0.png', '/fairy/fairy-wing-1.png'],
		poof: ['/fairy/fairy-loading.png'],
	},
} as const satisfies FairyPartDefinition

const FAIRY_BODY_VARIANTS = {
	plain: {
		idle: ['/fairy/fairy-body-default.png'],
		thinking: ['/fairy/fairy-body-think.png'],
		poof: ['/fairy/fairy-loading.png'],
	},
} as const satisfies FairyPartDefinition

export const FAIRY_VARIANTS = {
	hat: FAIRY_HAT_VARIANTS,
	body: FAIRY_BODY_VARIANTS,
	wings: FAIRY_WINGS_VARIANTS,
}

/**
 * A type of variant. eg: The 'pointy' hat variant.
 *
 * @example
 *
 * ```ts
 * const topHatVariant: FairyVariantType<'hat'> = 'top'
 * ```
 */
export type FairyVariantType<T extends FairyPartType> = keyof (typeof FAIRY_VARIANTS)[T]

/**
 * A definition of a variant.
 * It's a map of poses to frames.
 *
 * The idle pose is required, and used for all other undefined poses.
 *
 * @example
 *
 * ```ts
 * const topHatVariant: FairyVariantDefinition = {
 *   idle: ['/fairy/fairy-hat-top-0.png', '/fairy/fairy-hat-top-1.png'],
 *   thinking: ['/fairy/fairy-hat-top-think.png'],
 * }
 * ```
 */
export type FairyVariantDefinition = Partial<Record<FairyPose, string[]>> & { idle: string[] }
