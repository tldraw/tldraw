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
import { assert, assertExists, exhaustiveSwitchError } from '@tldraw/utils'
import { MarkdownWriter, formatWithPrettier, getPath, getSlug } from './utils'

type Result = { markdown: string }

const date = new Intl.DateTimeFormat('en-US', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
}).format(new Date())

export async function getApiMarkdown(categoryName: string, item: ApiItem, j: number) {
	const result = { markdown: '' }

	addFrontmatter(result, item, categoryName, j)
	addTags(result, item)

	const toc: Result = { markdown: '' }
	const membersResult: Result = { markdown: '' }

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
		const constructorResult = { markdown: '' }
		const propertiesResult = { markdown: '' }
		const methodsResult = { markdown: '' }

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
				addMarkdown(toc, `  - [${member.displayName}](#${getSlug(member)})\n`)
				await addMarkdownForMember(propertiesResult, member)
				addHorizontalRule(propertiesResult)
			}
			addMarkdown(membersResult, propertiesResult.markdown)
		}

		if (methods.length) {
			addMarkdown(toc, `- [Methods](#methods)\n`)
			addMarkdown(methodsResult, `## Methods\n\n`)
			for (const member of methods) {
				addMarkdown(toc, `  - [${member.displayName}](#${getSlug(member)})\n`)
				await addMarkdownForMember(methodsResult, member)
				addHorizontalRule(methodsResult)
			}
			addMarkdown(membersResult, methodsResult.markdown)
		}
	}

	if (toc.markdown.length) {
		result.markdown += `<details>\n\t<summary>Table of Contents</summary>\n`
		addMarkdown(result, toc.markdown)
		result.markdown += `</details>\n\n`
	}

	await addDocComment(result, item)
	addReferences(result, item)

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
	addMemberName(result, member)
	addTags(result, member)
	await addDocComment(result, member)
	addReferences(result, member)
}

function addFrontmatter(result: Result, member: ApiItem, categoryName: string, order: number) {
	result.markdown += `---
title: ${member.displayName}
status: published
category: ${categoryName}
group: ${member.kind}
author: api
date: ${date}
order: ${order}
---`
}

function addHorizontalRule(result: Result) {
	result.markdown += `---\n\n`
}

function addMemberName(result: Result, member: ApiItem) {
	if (member.kind === 'Constructor') {
		result.markdown += `### \`Constructor\`\n\n`
		return
	}

	if (!member.displayName) return
	result.markdown += `### \`${member.displayName}${
		member.kind === 'Method' ? '()' : ''
	}\` \\{#${getSlug(member)}}\n\n`
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
			result.markdown += `##### Example\n\n`
			for (const example of exampleBlocks) {
				result.markdown += await MarkdownWriter.docNodeToMarkdown(member, example.content)
			}
		}
	}

	if (
		member instanceof ApiMethod ||
		member instanceof ApiMethodSignature ||
		member instanceof ApiConstructor ||
		member instanceof ApiConstructSignature ||
		member instanceof ApiFunction
	) {
		result.markdown += `##### Parameters\n\n\n`
		if (!member.parameters.length) {
			result.markdown += `None\n\n`
		} else {
			result.markdown += '<ParametersTable>\n\n'
			for (const param of member.parameters) {
				result.markdown += '<ParametersTableRow>\n'
				result.markdown += '<ParametersTableName>\n\n'
				result.markdown += `\`${param.name}\`\n\n`

				if (param.isOptional) {
					result.markdown += ` <Small>(optional)</Small>\n\n`
				}
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
			result.markdown += `##### Returns\n\n\n`
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
			result.markdown += `##### Parameters\n\n\n`
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

		// no specific docs for these types
		result.markdown += `##### Signature\n\n\n`
		result.markdown += await typeExcerptToMarkdown(member.excerpt, { kind: member.kind })
		result.markdown += `\n\n`
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
			assert(code.startsWith('type X = () =>'))
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
			assert(code.startsWith('class X {\n'))
			assert(code.endsWith('\n}'))
			code = code.slice('class X {\n'.length, -'\n}'.length)
			code = code.replace(/^ {2}/gm, '')
			break
		default:
			exhaustiveSwitchError(kind)
	}

	return ['```ts', code, '```'].join('\n')
}

function addTags(result: Result, member: ApiItem) {
	const tags = []
	if (ApiReleaseTagMixin.isBaseClassOf(member)) {
		tags.push(ReleaseTag[member.releaseTag])
	}
	if (ApiStaticMixin.isBaseClassOf(member) && member.isStatic) {
		tags.push('Static')
	}
	if (ApiReadonlyMixin.isBaseClassOf(member) && member.isReadonly) {
		tags.push('Readonly')
	}
	tags.push(member.kind)
	result.markdown += `<Small>${tags.join(' ')}</Small>\n\n`
}

function addReferences(result: Result, member: ApiItem) {
	if (!(member instanceof ApiDeclaredItem)) return
	const references = new Set<string>()

	member.excerptTokens.forEach((token) => {
		if (token.kind !== 'Reference') return
		const apiItemResult = assertExists(member.getAssociatedModel()).resolveDeclarationReference(
			assertExists(token.canonicalReference),
			member
		)
		if (apiItemResult.errorMessage) {
			return
		}
		const apiItem = assertExists(apiItemResult.resolvedApiItem)
		const url = `/gen/${getPath(apiItem)}`
		references.add(`[${token.text}](${url})`)
	})

	if (references.size) {
		result.markdown += `##### References\n\n`
		result.markdown += Array.from(references).join(', ') + '\n\n'
	}
}
