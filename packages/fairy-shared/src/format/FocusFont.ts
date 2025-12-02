import { z } from 'zod'

/**
 * Schema for font styles available in tldraw.
 * - `draw` - Hand-drawn, sketchy font style (default)
 * - `sans` - Clean sans-serif font
 * - `serif` - Traditional serif font
 * - `mono` - Monospace font for code-like text
 */
export const FocusFontSchema = z
	.enum(['draw', 'sans', 'serif', 'mono'])
	.describe(
		'Font style for text. Only specify if the user explicitly requests a specific font (e.g., "use monospace", "make it serif"). If omitted, the default hand-drawn font is used, which matches the sketchy canvas style.'
	)

export type FocusFont = z.infer<typeof FocusFontSchema>
