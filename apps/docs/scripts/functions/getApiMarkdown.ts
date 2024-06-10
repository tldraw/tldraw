import {
	ApiClass,
	ApiConstructSignature,
	ApiConstructor,
	ApiDeclaredItem,
	ApiDocumentedItem,
	ApiEnum,
	ApiFunction,
	ApiInterface,
	ApiItem,
	ApiItemKind,
	ApiMethod,
	ApiMethodSignature,
	ApiNamespace,
	ApiProperty,
	ApiPropertySignature,
	ApiReadonlyMixin,
	ApiReleaseTagMixin,
	ApiStaticMixin,
	ApiTypeAlias,
	ApiVariable,
	Excerpt,
	ReleaseTag,
} from '@microsoft/api-extractor-model'
import { MarkdownWriter, formatWithPrettier, getPath, getSlug } from '../utils'

interface Result {
	markdown: string
	keywords: string[]
}

const REPO_URL = 'https://github.com/tldraw/tldraw/blob/main/'

const date = new Intl.DateTimeFormat('en-US', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
}).format(new Date())

export async function getApiMarkdown(categoryName: string, item: ApiItem, j: number) {
	const result: Result = { markdown: '', keywords: [] }
	const toc: Result = { markdown: '', keywords: [] }
	const membersResult: Result = { markdown: '', keywords: [] }

	if (item.members) {
		const constructors = []
		const properties = []
		const methods = []
		for (const member of item.members) {
			switch (member.kind) {
				case ApiItemKind.Constructor:
				case ApiItemKind.ConstructSignature:
					constructors.push(member)
					break
				case ApiItemKind.Variable:
				case ApiItemKind.Property:
				case ApiItemKind.PropertySignature:
					properties.push(member)
					break
				case ApiItemKind.Method:
				case ApiItemKind.Function:
				case ApiItemKind.MethodSignature:
					methods.push(member)

					break
				case ApiItemKind.EnumMember:
				case ApiItemKind.Class:
				case ApiItemKind.TypeAlias:
				case ApiItemKind.Interface:
					// TODO: document these
					break
				default:
					throw new Error(`Unknown member kind: ${member.kind} ${member.displayName}`)
			}
		}

		const constructorResult: Result = { markdown: '', keywords: [] }
		const propertiesResult: Result = { markdown: '', keywords: [] }
		const methodsResult: Result = { markdown: '', keywords: [] }

		if (constructors.length) {
			for (const member of constructors) {
				await addMarkdownForMember(constructorResult, member)
				addHorizontalRule(constructorResult)
			}
			addMarkdown(membersResult, constructorResult.markdown)
		}

		if (properties.length) {
			addMarkdown(toc, `- [Properties](#properties)\n`)
			addMarkdown(propertiesResult, `## Properties\n\n`)
			for (const member of properties) {
				const slug = getSlug(member)
				addMarkdown(toc, `  - [${member.displayName}](#${slug})\n`)
				await addMarkdownForMember(propertiesResult, member)
				addHorizontalRule(propertiesResult)
			}
			addMarkdown(membersResult, propertiesResult.markdown)
		}

		if (methods.length) {
			addMarkdown(toc, `- [Methods](#methods)\n`)
			addMarkdown(methodsResult, `## Methods\n\n`)
			for (const member of methods) {
				const slug = getSlug(member)
				addMarkdown(toc, `  - [${member.displayName}](#${slug})\n`)
				await addMarkdownForMember(methodsResult, member)
				addHorizontalRule(methodsResult)
			}
			addMarkdown(membersResult, methodsResult.markdown)
		}
	}

	await addFrontmatter(result, item, categoryName, j)

	if (toc.markdown.length) {
		result.markdown += `<details className="article__table-of-contents">\n\t<summary>Table of contents</summary>\n`
		addMarkdown(result, toc.markdown)
		result.markdown += `</details>\n\n`
	}

	addTags(result, item)

	await addDocComment(result, item)

	addReferences(result, item)
	addLinkToSource(result, item)

	if (membersResult.markdown.length) {
		addHorizontalRule(result)
		addMarkdown(result, membersResult.markdown)
	}

	return result
}

/* --------------------- Helpers -------------------- */

function addMarkdown(result: Result, markdown: string) {
	result.markdown += markdown
}

async function addMarkdownForMember(result: Result, member: ApiItem) {
	if (member.displayName.startsWith('_')) return
	addMemberName(result, member)
	addTags(result, member)
	await addDocComment(result, member)
	addReferences(result, member)
	addLinkToSource(result, member)
}

async function addFrontmatter(
	result: Result,
	member: ApiItem,
	categoryName: string,
	order: number
) {
	let description = ''
	if (member instanceof ApiDocumentedItem && member.tsdocComment) {
		const comment = await MarkdownWriter.docNodeToMarkdown(
			member,
			member.tsdocComment.summarySection
		)
		// only up to the first newline
		description = comment.trim().split('\n')[0].replace(/:/g, '')
	}

	let kw = ''

	if (result.keywords.length) {
		kw += `\nkeywords:`
		for (const k of result.keywords) {
			if (k.startsWith('_')) continue
			kw += `\n  - ${k.trim().split('\n')[0]}`
		}
	}

	result.markdown += `---
title: ${member.displayName}
status: published
description: ${description}
category: ${categoryName}
group: ${member.kind}
author: api
date: ${date}
order: ${order}
sourceUrl: ${'_fileUrlPath' in member ? member._fileUrlPath : ''}${kw}
---
`
}

function addHorizontalRule(result: Result) {
	result.markdown += `---\n\n`
}

function addMemberName(result: Result, member: ApiItem) {
	if (member.kind === 'Constructor') {
		result.markdown += `### Constructor\n\n`
		return
	}

	if (!member.displayName) return
	result.markdown += `### \`${member.displayName}${member.kind === 'Method' ? '()' : ''}\`\n\n`
}

async function addDocComment(result: Result, member: ApiItem) {
	if (!(member instanceof ApiDocumentedItem)) {
		return
	}

	if (member.tsdocComment) {
		result.markdown += await MarkdownWriter.docNodeToMarkdown(
			member,
			member.tsdocComment.summarySection
		)

		const exampleBlocks = member.tsdocComment.customBlocks.filter(
			(block) => block.blockTag.tagNameWithUpperCase === '@EXAMPLE'
		)

		if (exampleBlocks.length) {
			result.markdown += `\n\n`
			result.markdown += `<ApiHeading>Example</ApiHeading>\n\n`
			for (const example of exampleBlocks) {
				result.markdown += await MarkdownWriter.docNodeToMarkdown(member, example.content)
			}
		}
	}

	if (
		member instanceof ApiVariable ||
		member instanceof ApiTypeAlias ||
		member instanceof ApiProperty ||
		member instanceof ApiPropertySignature ||
		member instanceof ApiClass ||
		member instanceof ApiFunction ||
		member instanceof ApiInterface ||
		member instanceof ApiEnum ||
		member instanceof ApiNamespace ||
		member instanceof ApiMethod
	) {
		result.markdown += `<ApiHeading>Signature</ApiHeading>\n\n`
		result.markdown += await typeExcerptToMarkdown(member.excerpt, {
			kind: member.kind,
		})
		result.markdown += `\n\n`
	}

	if (
		member instanceof ApiMethod ||
		member instanceof ApiMethodSignature ||
		member instanceof ApiConstructor ||
		member instanceof ApiConstructSignature ||
		member instanceof ApiFunction
	) {
		if (!member.parameters.length) {
			return
		} else {
			result.markdown += `<ApiHeading>Parameters</ApiHeading>\n\n`
			result.markdown += '<ParametersTable>\n\n'
			for (const param of member.parameters) {
				result.markdown += '<ParametersTableRow>\n'
				result.markdown += '<ParametersTableName>\n\n'
				result.markdown += `\`${param.name}\`\n\n`
				result.markdown += `</ParametersTableName>\n`
				result.markdown += `<ParametersTableDescription>\n\n`
				result.markdown += await typeExcerptToMarkdown(param.parameterTypeExcerpt, {
					kind: 'ParameterType',
					printWidth: 60,
				})
				result.markdown += `\n\n`
				if (param.tsdocParamBlock) {
					result.markdown += await MarkdownWriter.docNodeToMarkdown(
						member,
						param.tsdocParamBlock.content
					)
				}
				result.markdown += `\n\n</ParametersTableDescription>\n`
				result.markdown += `</ParametersTableRow>\n`
			}
			result.markdown += '</ParametersTable>\n\n'
		}

		if (!(member instanceof ApiConstructor)) {
			result.markdown += `<ApiHeading>Returns</ApiHeading>\n\n`
			result.markdown += await typeExcerptToMarkdown(member.returnTypeExcerpt, {
				kind: 'ReturnType',
			})
			result.markdown += `\n\n`
			if (member.tsdocComment && member.tsdocComment.returnsBlock) {
				result.markdown += await MarkdownWriter.docNodeToMarkdown(
					member,
					member.tsdocComment.returnsBlock.content
				)
			}
		}
	} else if (
		member instanceof ApiVariable ||
		member instanceof ApiTypeAlias ||
		member instanceof ApiProperty ||
		member instanceof ApiPropertySignature ||
		member instanceof ApiClass ||
		member instanceof ApiInterface ||
		member instanceof ApiEnum ||
		member instanceof ApiNamespace
	) {
		const params = member.tsdocComment?.params
		if (params && params.count > 0) {
			result.markdown += `<ApiHeading>Parameters</ApiHeading>\n\n`
			result.markdown += '<ParametersTable>\n\n'
			for (const block of params.blocks) {
				result.markdown += '<ParametersTableRow>\n'
				result.markdown += '<ParametersTableName>\n\n'
				result.markdown += `\`${block.parameterName}\`\n\n`
				result.markdown += `</ParametersTableName>\n`
				result.markdown += `<ParametersTableDescription>\n\n`
				result.markdown += await MarkdownWriter.docNodeToMarkdown(member, block.content)
				result.markdown += `\n\n</ParametersTableDescription>\n`
				result.markdown += `</ParametersTableRow>\n`
			}
			result.markdown += '</ParametersTable>\n\n'
		}
	} else {
		throw new Error('unknown member kind: ' + member.kind)
	}
}

async function typeExcerptToMarkdown(
	excerpt: Excerpt,
	{ kind, printWidth }: { kind: ApiItemKind | 'ReturnType' | 'ParameterType'; printWidth?: number }
) {
	let code = ''
	for (const token of excerpt.spannedTokens) {
		code += token.text
	}

	code = code.replace(/^export /, '')
	code = code.replace(/^declare /, '')

	switch (kind) {
		case ApiItemKind.CallSignature:
		case ApiItemKind.EntryPoint:
		case ApiItemKind.EnumMember:
		case ApiItemKind.Function:
		case ApiItemKind.Model:
		case ApiItemKind.Namespace:
		case ApiItemKind.None:
		case ApiItemKind.Package:
		case ApiItemKind.TypeAlias:
			code = await formatWithPrettier(code, { printWidth })
			break
		case 'ReturnType':
		case 'ParameterType':
			code = await formatWithPrettier(`type X = () =>${code}`, { printWidth })
			if (!code.startsWith('type X = () =>')) {
				throw Error()
			}
			code = code = code.replace(/^type X = \(\) =>[ \n]/, '')
			break
		case ApiItemKind.Class:
		case ApiItemKind.Enum:
		case ApiItemKind.Interface:
			code = await formatWithPrettier(`${code} {}`, { printWidth })
			break
		case ApiItemKind.Constructor:
		case ApiItemKind.ConstructSignature:
		case ApiItemKind.IndexSignature:
		case ApiItemKind.Method:
		case ApiItemKind.MethodSignature:
		case ApiItemKind.Property:
		case ApiItemKind.PropertySignature:
		case ApiItemKind.Variable:
			code = await formatWithPrettier(`class X { ${code} }`, { printWidth })
			if (!(code.startsWith('class X {\n') && code.endsWith('\n}'))) {
				throw Error()
			}
			code = code.slice('class X {\n'.length, -'\n}'.length)
			code = code.replace(/^ {2}/gm, '')
			break
		default:
			throw Error()
	}

	return ['```ts', code, '```'].join('\n')
}

function addTags(result: Result, member: ApiItem) {
	const tags = []
	if (ApiReleaseTagMixin.isBaseClassOf(member)) {
		tags.push(ReleaseTag[member.releaseTag])
	}
	if (ApiStaticMixin.isBaseClassOf(member) && member.isStatic) {
		tags.push('static')
	}
	if (ApiReadonlyMixin.isBaseClassOf(member) && member.isReadonly) {
		tags.push('readonly')
	}
	tags.push(member.kind.toLowerCase())
	result.markdown += `<Small>${tags.filter((t) => t.toLowerCase() !== 'none').join(' ')}</Small>\n\n`
}

function addReferences(result: Result, member: ApiItem) {
	if (!(member instanceof ApiDeclaredItem)) return
	const references = new Set<string>()

	member.excerptTokens.forEach((token) => {
		if (token.kind !== 'Reference') return
		const apiItemResult = member
			.getAssociatedModel()!
			.resolveDeclarationReference(token.canonicalReference!, member)
		if (apiItemResult.errorMessage) {
			return
		}
		const apiItem = apiItemResult.resolvedApiItem!
		const url = `/reference/${getPath(apiItem)}`
		references.add(`[${token.text}](${url})`)
	})

	if (references.size) {
		result.markdown += `<ApiHeading>References</ApiHeading>\n\n`
		result.markdown += Array.from(references).join(', ') + '\n\n'
	}
}

function addLinkToSource(result: Result, member: ApiItem) {
	if ('_fileUrlPath' in member && member._fileUrlPath) {
		result.markdown += `<ApiHeading>Source</ApiHeading>\n\n`
		result.markdown += `[${member._fileUrlPath}](${REPO_URL}${member._fileUrlPath})\n\n`
	}
}
