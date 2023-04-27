import { TLTranslationLocale, getDefaultTranslationLocale } from './translations'

type DefaultLanguageTest = {
	name: string
	input: string[]
	output: TLTranslationLocale
}

describe('Choosing a sensible default translation locale', () => {
	const tests: DefaultLanguageTest[] = [
		{
			name: 'finds a matching language locale',
			input: ['fr'],
			output: 'fr',
		},
		{
			name: 'finds a matching region locale',
			input: ['pt-BR'],
			output: 'pt-br',
		},
		{
			name: 'picks a region locale if no language locale available',
			input: ['pt'],
			output: 'pt-pt',
		},
		{
			name: 'picks a language locale if no region locale available',
			input: ['fr-CA'],
			output: 'fr',
		},
		{
			name: 'prioritises an exact region match when the language is the same',
			input: ['pt', 'pt-BR'],
			output: 'pt-br',
		},
		{
			name: 'prioritises the first language when the language is different',
			input: ['fr-CA', 'pt-BR'],
			output: 'fr',
		},
	]

	for (const test of tests) {
		it(test.name, () => {
			expect(getDefaultTranslationLocale(test.input)).toEqual(test.output)
		})
	}
})
