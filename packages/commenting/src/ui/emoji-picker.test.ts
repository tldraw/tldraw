import { describe, expect, it } from 'vitest'
import { DEFAULT_REACTION_EMOJI, isAllowedReactionEmoji } from './emoji-picker'

describe('isAllowedReactionEmoji', () => {
	it('accepts every emoji in the default palette', () => {
		for (const emoji of DEFAULT_REACTION_EMOJI) {
			expect(isAllowedReactionEmoji(emoji)).toBe(true)
		}
	})

	it('rejects emoji not in the palette', () => {
		expect(isAllowedReactionEmoji('🦄')).toBe(false)
	})

	// the record's emoji field is a free string, so this is the guard against junk values
	it('rejects arbitrary non-emoji strings', () => {
		expect(isAllowedReactionEmoji('not an emoji')).toBe(false)
		expect(isAllowedReactionEmoji('')).toBe(false)
	})

	it('checks against a custom palette when given one', () => {
		expect(isAllowedReactionEmoji('🦄', ['🦄', '🌈'])).toBe(true)
		expect(isAllowedReactionEmoji('👍', ['🦄', '🌈'])).toBe(false)
	})
})
