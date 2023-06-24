import { ApiItem } from '@microsoft/api-extractor-model'
import {
	DocCodeSpan,
	DocEscapedText,
	DocFencedCode,
	DocNode,
	DocParagraph,
	DocPlainText,
	DocSection,
	DocSoftBreak,
} from '@microsoft/tsdoc'
import prettier from 'prettier'

export function getPath(item: { canonicalReference: ApiItem['canonicalReference'] }): string {
	return item.canonicalReference
		.toString()
		.replace(/^@tldraw\/([^!]+)/, '$1/')
		.replace(/[!:()#.]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-/, '')
		.replace(/\/-/, '/')
		.replace(/-$/, '')
}

export function getSlug(item: { canonicalReference: ApiItem['canonicalReference'] }): string {
	return getPath(item).replace(/^[^/]+\//, '')
}

const prettierConfigPromise = prettier.resolveConfig(__dirname)
const languages: { [tag: string]: string | undefined } = {
	ts: 'typescript',
	tsx: 'typescript',
}

export async function formatWithPrettier(
	code: string,
	{
		languageTag,
		// roughly the width of our code blocks on a desktop
		printWidth = 80,
	}: { languageTag?: string; printWidth?: number } = {}
) {
	const language = languages[languageTag || 'ts']
	if (!language) {
		throw new Error(`Unknown language: ${languageTag}`)
	}
	const prettierConfig = await prettierConfigPromise
	const formattedCode = prettier.format(code, {
		...prettierConfig,
		parser: language,
		printWidth,
		tabWidth: 2,
		useTabs: false,
	})

	return formattedCode.trimEnd()
}

export class MarkdownWriter {
	static async docNodeToMarkdown(docNode: DocNode) {
		const writer = new MarkdownWriter()
		await writer.writeDocNode(docNode)
		return writer.toString()
	}

	private result = ''

	write(...parts: string[]): this {
		this.result += parts.join('')
		return this
	}

	endsWith(str: string) {
		return this.result.endsWith(str)
	}

	writeIfNeeded(str: string): this {
		if (!this.endsWith(str)) {
			this.write(str)
		}
		return this
	}

	async writeDocNode(docNode: DocNode) {
		if (docNode instanceof DocPlainText) {
			this.write(docNode.text)
		} else if (docNode instanceof DocSection || docNode instanceof DocParagraph) {
			await this.writeDocNodes(docNode.nodes)
			this.writeIfNeeded('\n\n')
		} else if (docNode instanceof DocSoftBreak) {
			this.writeIfNeeded('\n')
		} else if (docNode instanceof DocCodeSpan) {
			this.write('`', docNode.code, '`')
		} else if (docNode instanceof DocFencedCode) {
			this.writeIfNeeded('\n').write(
				'```',
				docNode.language,
				'\n',
				await formatWithPrettier(docNode.code, { languageTag: docNode.language }),
				'\n',
				'```\n'
			)
		} else if (docNode instanceof DocEscapedText) {
			this.write(docNode.encodedText)
		} else {
			throw new Error(`Unknown docNode kind: ${docNode.kind}`)
		}
	}

	async writeDocNodes(docNodes: readonly DocNode[]) {
		for (const docNode of docNodes) {
			await this.writeDocNode(docNode)
		}
		return this
	}

	toString() {
		return this.result
	}
}
