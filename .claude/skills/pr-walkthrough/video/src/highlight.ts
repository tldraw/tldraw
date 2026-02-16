import { createHighlighter, type Highlighter } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null

const LANGUAGES = [
	'typescript',
	'javascript',
	'tsx',
	'jsx',
	'css',
	'html',
	'json',
	'markdown',
	'bash',
	'yaml',
	'python',
	'go',
	'rust',
	'sql',
	'text',
]

export function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['github-light'],
			langs: LANGUAGES,
		})
	}
	return highlighterPromise
}

export interface HighlightedToken {
	content: string
	color?: string
	fontStyle?: string
}

export interface HighlightedLine {
	tokens: HighlightedToken[]
}

export async function highlightCode(code: string, language: string): Promise<HighlightedLine[]> {
	const highlighter = await getHighlighter()

	// Normalize language name
	let lang = language.toLowerCase()
	if (lang === 'ts') lang = 'typescript'
	if (lang === 'js') lang = 'javascript'
	if (!highlighter.getLoadedLanguages().includes(lang as any)) {
		lang = 'text'
	}

	const result = highlighter.codeToTokens(code, {
		lang: lang as any,
		theme: 'github-light',
	})

	return result.tokens.map((line) => ({
		tokens: line.map((token) => ({
			content: token.content,
			color: token.color,
			fontStyle: token.fontStyle === 1 ? 'italic' : undefined,
		})),
	}))
}
