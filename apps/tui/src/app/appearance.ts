import type { StrokeMode } from '../render/raster'
import { getGlyphs, type GlyphTier } from '../terminal/chars'
import type { ColorMode } from '../terminal/colors'
import { defaultGlyphTier, resolveColorScheme, type ColorScheme } from '../terminal/probe'
import type { TerminalCapabilities } from '../terminal/Terminal'

export interface AppearanceInput {
	capabilities: TerminalCapabilities
	env: NodeJS.ProcessEnv
	/** `--light` / `--dark`. */
	scheme?: ColorScheme | null
	/** `--glyphs`. */
	glyphs?: GlyphTier | null
	/** Sub-cell stroke override; derived from the glyph tier otherwise. */
	stroke?: StrokeMode | null
}

export interface Appearance {
	scheme: ColorScheme
	glyphTier: GlyphTier
	colorDepth: ColorMode
	stroke: StrokeMode
	keyboardEncoding: 'legacy' | 'full'
}

/**
 * Turns the probe results and the command line into the look of the session: colour scheme
 * (`--light/--dark` > OSC 11 > COLORFGBG > dark), glyph tier, colour depth (the terminal already
 * applied `--color`), sub-cell stroke glyphs and the shortcut encoding.
 */
export function resolveAppearance(input: AppearanceInput): Appearance {
	const { capabilities, env } = input
	const scheme = resolveColorScheme({
		override: input.scheme ?? null,
		osc11: capabilities.background,
		env,
	})
	const glyphTier = defaultGlyphTier(env, capabilities.ambiguousWide, input.glyphs ?? null)
	const stroke = input.stroke ?? strokeForTier(glyphTier)
	return {
		scheme,
		glyphTier,
		colorDepth: capabilities.truecolor,
		stroke,
		keyboardEncoding: capabilities.kitty || capabilities.modifyOtherKeys ? 'full' : 'legacy',
	}
}

export function strokeForTier(tier: GlyphTier): StrokeMode {
	if (tier === 'ascii') return 'ascii'
	return getGlyphs(tier).braille ? 'braille' : 'blocks'
}
