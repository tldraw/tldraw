import { mergePluginComponents } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { commentsPlugin } from './commentsPlugin'

describe('commentsPlugin', () => {
	it('does not claim the Toolbar component slot', () => {
		expect(commentsPlugin().components).not.toHaveProperty('Toolbar')
	})

	it('composes with another plugin that sets the Toolbar slot', () => {
		const otherPlugin = {
			id: 'test.other',
			components: { Toolbar: () => null },
		}
		expect(() => mergePluginComponents([commentsPlugin(), otherPlugin])).not.toThrow()
	})
})
