import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DefaultReactionTooltipContent } from './reaction'

function sentence(...names: string[]) {
	return renderToStaticMarkup(
		<DefaultReactionTooltipContent
			reactors={names.map((name) => ({ name, you: name === 'You' }))}
		/>
	)
}

describe('DefaultReactionTooltipContent', () => {
	// Rendered outside a translation provider, so this is the shipped English of `comments.reacted`.
	it('picks the phrasing by number of reactors', () => {
		expect(sentence('You')).toBe('You reacted')
		expect(sentence('You', 'Bo')).toBe('You and Bo reacted')
		expect(sentence('Ada', 'Bo', 'Cy')).toBe('Ada, Bo and Cy reacted')
		expect(sentence('Ada', 'Bo', 'Cy', 'Di')).toBe('Ada, Bo, Cy and 1 other reacted')
		expect(sentence('Ada', 'Bo', 'Cy', 'Di', 'Ed', 'Fi')).toBe('Ada, Bo, Cy and 3 others reacted')
	})
})
