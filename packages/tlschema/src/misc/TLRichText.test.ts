import { toRichText } from './TLRichText'

describe('toRichText', () => {
	it('should convert a single line of text to a TipTap document', () => {
		const input = 'Hello, world!'
		const expectedOutput = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Hello, world!' }],
				},
			],
		}
		expect(toRichText(input)).toEqual(expectedOutput)
	})

	it('should convert multiple lines of text to a TipTap document', () => {
		const input = 'Hello, world!\nThis is a test.'
		const expectedOutput = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Hello, world!' }],
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'This is a test.' }],
				},
			],
		}
		expect(toRichText(input)).toEqual(expectedOutput)
	})

	it('should handle empty lines correctly', () => {
		const input = 'Hello, world!\n\nThis is a test.'
		const expectedOutput = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Hello, world!' }],
				},
				{
					type: 'paragraph',
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'This is a test.' }],
				},
			],
		}
		expect(toRichText(input)).toEqual(expectedOutput)
	})
})
