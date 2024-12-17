import { convertTextToTipTapDocument } from './TLRichText'

describe('convertTextToTipTapDocument', () => {
	it('should convert a single line of text to a TipTap document', () => {
		const input = 'Hello, world!'
		const expectedOutput = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Hello,\u00A0world!' }],
				},
			],
		}
		expect(convertTextToTipTapDocument(input)).toEqual(expectedOutput)
	})

	it('should convert multiple lines of text to a TipTap document', () => {
		const input = 'Hello, world!\nThis is a test.'
		const expectedOutput = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Hello,\u00A0world!' }],
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'This\u00A0is\u00A0a\u00A0test.' }],
				},
			],
		}
		expect(convertTextToTipTapDocument(input)).toEqual(expectedOutput)
	})

	it('should handle empty lines correctly', () => {
		const input = 'Hello, world!\n\nThis is a test.'
		const expectedOutput = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Hello,\u00A0world!' }],
				},
				{
					type: 'paragraph',
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'This\u00A0is\u00A0a\u00A0test.' }],
				},
			],
		}
		expect(convertTextToTipTapDocument(input)).toEqual(expectedOutput)
	})

	it('should sanitize special characters', () => {
		const input = 'Hello & welcome to <coding>!'
		const expectedOutput = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Hello\u00A0&amp;\u00A0welcome\u00A0to\u00A0&lt;coding&gt;!' },
					],
				},
			],
		}
		expect(convertTextToTipTapDocument(input)).toEqual(expectedOutput)
	})
})
