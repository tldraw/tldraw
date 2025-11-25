import { FairyPartDefinition, FairyPartType } from './FairyPartType'
import { FairyPose } from './FairyPose'

// Note: The image paths below are no longer used for rendering (FairySprite2 uses SVG components),
// but the variant keys are still needed for random outfit generation in FairyApp.tsx
const FAIRY_HAT_VARIANTS = {
	top: { idle: [''] },
	pointy: { idle: [''] },
	bald: { idle: [''] },
	antenna: { idle: [''] },
	spiky: { idle: [''] },
	hair: { idle: [''] },
	ears: { idle: [''] },
	propellor: { idle: [''] },
} as const satisfies FairyPartDefinition

const FAIRY_WINGS_VARIANTS = {
	plain: {
		idle: [''],
	},
} as const satisfies FairyPartDefinition

const FAIRY_BODY_VARIANTS = {
	plain: {
		idle: [''],
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
