import { ApiItem, ApiItemKind, ApiModel } from '@microsoft/api-extractor-model'
import {
	DocCodeSpan,
	DocEscapedText,
	DocFencedCode,
	DocLinkTag,
	DocNode,
	DocParagraph,
	DocPlainText,
	DocSection,
	DocSoftBreak,
} from '@microsoft/tsdoc'
import assert from 'assert'
import { slug as githubSlug } from 'github-slugger'

import path from 'path'
import prettier from 'prettier'
export const API_DIR = path.join(process.cwd(), 'api')
export const CONTENT_DIR = path.join(process.cwd(), 'content')

function isOnParentPage(itemKind: ApiItemKind) {
	switch (itemKind) {
		case ApiItemKind.CallSignature:
		case ApiItemKind.Class:
		case ApiItemKind.EntryPoint:
		case ApiItemKind.Enum:
		case ApiItemKind.Function:
		case ApiItemKind.Interface:
		case ApiItemKind.Model:
		case ApiItemKind.Namespace:
		case ApiItemKind.Package:
		case ApiItemKind.TypeAlias:
		case ApiItemKind.Variable:
		case ApiItemKind.None:
			return false
		case ApiItemKind.Constructor:
		case ApiItemKind.ConstructSignature:
		case ApiItemKind.EnumMember:
		case ApiItemKind.Method:
		case ApiItemKind.MethodSignature:
		case ApiItemKind.Property:
		case ApiItemKind.PropertySignature:
		case ApiItemKind.IndexSignature:
			return true
		default:
			throw Error(itemKind)
	}
}

export function getSlug(item: ApiItem): string {
	return githubSlug(item.displayName, true)
}

export function getPath(item: ApiItem): string {
	if (isOnParentPage(item.kind)) {
		const parentPath = getPath(item.parent!)
		const childSlug = getSlug(item)
		return `${parentPath}#${childSlug}`
	}

	return item.canonicalReference
		.toString()
		.replace(/^@tldraw\//, '')
		.replace(/:.+$/, '')
		.replace(/!/g, '/')
		.replace(/\./g, '-')
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
	let formattedCode = code
	try {
		formattedCode = await prettier.format(code, {
			...prettierConfig,
			parser: language,
			printWidth,
			tabWidth: 2,
			useTabs: false,
		})
	} catch (e) {
		console.warn(`☢️ Could not format code: ${code}`)
	}

	return formattedCode.trimEnd()
}

export class MarkdownWriter {
	static async docNodeToMarkdown(apiContext: ApiItem, docNode: DocNode) {
		const writer = new MarkdownWriter(apiContext)
		await writer.writeDocNode(docNode)
		return writer.toString()
	}

	private constructor(private readonly apiContext: ApiItem) {}

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
				await formatWithPrettier(docNode.code, {
					languageTag: docNode.language,
				}),
				'\n',
				'```\n'
			)
		} else if (docNode instanceof DocEscapedText) {
			this.write(docNode.encodedText)
		} else if (docNode instanceof DocLinkTag) {
			if (docNode.urlDestination) {
				this.write(
					'[',
					docNode.linkText ?? docNode.urlDestination,
					'](',
					docNode.urlDestination,
					')'
				)
			} else {
				assert(docNode.codeDestination)
				const apiModel = getTopLevelModel(this.apiContext)
				const refResult = apiModel.resolveDeclarationReference(
					docNode.codeDestination,
					this.apiContext
				)

				if (refResult.errorMessage) {
					console.warn(`☢️ Error processing API: ${refResult.errorMessage}`)
					return
				}
				const linkedItem = refResult.resolvedApiItem!
				const path = getPath(linkedItem)

				this.write(
					'[',
					docNode.linkText ?? getDefaultReferenceText(linkedItem),
					'](/reference/',
					path,
					')'
				)
			}
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

function getDefaultReferenceText(item: ApiItem): string {
	function parentPrefix(str: string, sep = '.'): string {
		if (!item.parent) return str
		return `${getDefaultReferenceText(item.parent)}${sep}${str}`
	}
	switch (item.kind) {
		case ApiItemKind.CallSignature:
			return parentPrefix(`${item.displayName}()`)
		case ApiItemKind.Constructor:
		case ApiItemKind.ConstructSignature: {
			const parent = item.parent!
			return `new ${getDefaultReferenceText(parent)}()`
		}
		case ApiItemKind.EnumMember:
		case ApiItemKind.Method:
		case ApiItemKind.MethodSignature:
		case ApiItemKind.Property:
		case ApiItemKind.PropertySignature:
			return parentPrefix(item.displayName)
		case ApiItemKind.IndexSignature:
			return parentPrefix(`[${item.displayName}]`, '')
		case ApiItemKind.Class:
		case ApiItemKind.EntryPoint:
		case ApiItemKind.Enum:
		case ApiItemKind.Function:
		case ApiItemKind.Interface:
		case ApiItemKind.Model:
		case ApiItemKind.Namespace:
		case ApiItemKind.Package:
		case ApiItemKind.TypeAlias:
		case ApiItemKind.Variable:
		case ApiItemKind.None:
			return item.displayName
		default:
			throw Error(item.kind)
	}
}

function getTopLevelModel(item: ApiItem): ApiModel {
	const model = item.getAssociatedModel()!
	if (model.parent) {
		return getTopLevelModel(model.parent)
	}
	return model
}
