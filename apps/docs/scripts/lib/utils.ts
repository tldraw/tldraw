import { ApiItem, ApiItemKind, ApiModel } from '@microsoft/api-extractor-model'
import {
	DocBlock,
	DocCodeSpan,
	DocEscapedText,
	DocFencedCode,
	DocLinkTag,
	DocNode,
	DocParagraph,
	DocPlainText,
	DocSection,
} from '@microsoft/tsdoc'
import { assert } from '@tldraw/utils'
import { slug as githubSlug } from 'github-slugger'
import path from 'path'
import prettier from 'prettier'

export const API_DIR = path.join(process.cwd(), 'api')
export const CONTENT_DIR = path.join(process.cwd(), 'content')
export const PUBLIC_DIR = path.join(process.cwd(), 'public')

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
	} catch {
		console.warn(`☢️ Could not format code: ${code}`)
	}

	// sometimes prettier adds a semicolon to the start of the code when formatting expressions (JSX
	// in particular), so strip it if we see it
	if (formattedCode.startsWith(';')) {
		formattedCode = formattedCode.slice(1)
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
		// Use kind property instead of instanceof checks for better compatibility
		switch (docNode.kind) {
			case 'PlainText':
				this.write((docNode as DocPlainText).text)
				break

			case 'Section':
			case 'Paragraph':
				await this.writeDocNodes((docNode as DocSection | DocParagraph).nodes)
				this.writeIfNeeded('\n\n')
				break

			case 'Block':
				// DocBlock is a container node, process its content
				await this.writeDocNodes((docNode as DocBlock).content.nodes)
				this.writeIfNeeded('\n\n')
				break

			case 'SoftBreak':
				this.writeIfNeeded('\n')
				break

			case 'CodeSpan':
				this.write('`', (docNode as DocCodeSpan).code, '`')
				break

			case 'FencedCode': {
				const fencedCode = docNode as DocFencedCode
				this.writeIfNeeded('\n').write(
					'```',
					fencedCode.language,
					'\n',
					await formatWithPrettier(fencedCode.code, {
						languageTag: fencedCode.language,
					}),
					'\n',
					'```\n'
				)
				break
			}

			case 'EscapedText':
				this.write((docNode as DocEscapedText).encodedText)
				break

			case 'ErrorText':
				// Skip error text nodes
				break

			case 'LinkTag': {
				const linkTag = docNode as DocLinkTag
				if (linkTag.urlDestination) {
					this.write(
						'[',
						linkTag.linkText ?? linkTag.urlDestination,
						'](',
						linkTag.urlDestination,
						')'
					)
				} else {
					assert(linkTag.codeDestination)
					const apiModel = getTopLevelModel(this.apiContext)
					const refResult = apiModel.resolveDeclarationReference(
						// Cast to any to work around type incompatibility between different versions of @microsoft/tsdoc
						linkTag.codeDestination as any,
						this.apiContext
					)

					if (refResult.errorMessage) {
						console.warn(`☢️ Error processing API: ${refResult.errorMessage}`)
						break
					}
					const linkedItem = refResult.resolvedApiItem!
					const path = getPath(linkedItem)

					this.write(
						'[',
						linkTag.linkText ?? getDefaultReferenceText(linkedItem),
						'](/reference/',
						path,
						')'
					)
				}
				break
			}

			default:
				// Handle any unknown container nodes generically by checking if they have a 'nodes' property
				if ('nodes' in docNode && Array.isArray((docNode as any).nodes)) {
					await this.writeDocNodes((docNode as any).nodes)
					this.writeIfNeeded('\n\n')
				} else if ('content' in docNode && (docNode as any).content?.nodes) {
					await this.writeDocNodes((docNode as any).content.nodes)
					this.writeIfNeeded('\n\n')
				} else {
					console.warn(`⚠️  Unknown docNode kind: ${docNode.kind}, skipping...`)
				}
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
