import { APIGroup } from '@/types/content-types'
import { TldrawApiModel } from '@/utils/TldrawApiModel'
import { TABLE_OF_CONTENTS_CLASSNAME } from '@/utils/config'
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
	ApiOptionalMixin,
	ApiProperty,
	ApiPropertySignature,
	ApiReadonlyMixin,
	ApiStaticMixin,
	ApiTypeAlias,
	ApiVariable,
	Excerpt,
	HeritageType,
} from '@microsoft/api-extractor-model'
import { MarkdownWriter, formatWithPrettier, getPath, getSlug } from './utils'

interface Result {
	markdown: string
	keywords: string[]
}

const date = new Intl.DateTimeFormat('en-US', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
}).format(new Date())

interface Member {
	item: ApiItem
	inheritedFrom: ApiItem | null
}

export async function getApiMarkdown(
	model: TldrawApiModel,
	categoryName: string,
	item: ApiItem,
	j: number
) {
	const result: Result = { markdown: '', keywords: [] }
	const toc: Result = { markdown: '', keywords: [] }
	const membersResult: Result = { markdown: '', keywords: [] }

	const isComponent = model.isComponent(item)
	const componentProps = isComponent ? model.getReactPropsItem(item) : null

	const contents = collectMembersAndExtends(model, item)

	if (contents.constructors.length) {
		const constructorResult: Result = { markdown: '', keywords: [] }
		for (const member of contents.constructors) {
			await addMarkdownForMember(model, constructorResult, member)
			addHorizontalRule(constructorResult)
		}
		addMarkdown(membersResult, constructorResult.markdown)
	}

	if (contents.properties.length || isComponent) {
		const propertiesResult: Result = { markdown: '', keywords: [] }
		if (componentProps) addExtends(propertiesResult, item, contents.heritage)
		for (const member of contents.properties) {
			const slug = getSlug(member.item)
			addMarkdown(toc, `  - [${member.item.displayName}](#${slug})\n`)
			await addMarkdownForMember(model, propertiesResult, member, {
				isComponentProp: isComponent,
			})
			addHorizontalRule(propertiesResult)
		}
		if (
			componentProps &&
			componentProps instanceof ApiDeclaredItem &&
			componentProps?.kind !== 'Interface'
		) {
			propertiesResult.markdown += await excerptToMarkdown(componentProps, componentProps.excerpt, {
				kind: componentProps.kind,
			})
		}

		if (propertiesResult.markdown.trim()) {
			addMarkdown(toc, `- [Properties](#properties)\n`)
			addMarkdown(membersResult, `## Properties\n\n`)
			addMarkdown(membersResult, propertiesResult.markdown)
		} else if (isComponent && !componentProps) {
			addMarkdown(membersResult, `## Properties\n\n`)
			addMarkdown(membersResult, `This component does not take any props.\n\n`)
		}
	}

	if (contents.methods.length) {
		const methodsResult: Result = { markdown: '', keywords: [] }
		addMarkdown(toc, `- [Methods](#methods)\n`)
		addMarkdown(methodsResult, `## Methods\n\n`)
		for (const member of contents.methods) {
			const slug = getSlug(member.item)
			addMarkdown(toc, `  - [${member.item.displayName}](#${slug})\n`)
			await addMarkdownForMember(model, methodsResult, member)
			addHorizontalRule(methodsResult)
		}
		addMarkdown(membersResult, methodsResult.markdown)
	}

	await addFrontmatter(model, result, item, categoryName, j)
	await addDeprecationNotice(result, item)

	if (toc.markdown.length) {
		result.markdown += `<details className="${TABLE_OF_CONTENTS_CLASSNAME}">\n\t<summary>Table of contents</summary>\n`
		addMarkdown(result, toc.markdown)
		result.markdown += `</details>\n\n`
	}

	if (!isComponent) {
		addExtends(result, item, contents.heritage)
	}

	await addDocComment(model, result, item)

	if (membersResult.markdown.length) {
		addHorizontalRule(result)
		addMarkdown(result, membersResult.markdown)
	}

	return result
}

/* --------------------- Helpers -------------------- */

function sortMembers(members: Member[]) {
	return members.sort((a, b) => {
		const aIsStatic = ApiStaticMixin.isBaseClassOf(a.item) && a.item.isStatic
		const bIsStatic = ApiStaticMixin.isBaseClassOf(b.item) && b.item.isStatic
		if (aIsStatic && !bIsStatic) return -1
		if (!aIsStatic && bIsStatic) return 1
		return a.item.displayName.localeCompare(b.item.displayName)
	})
}

function collectMembersAndExtends(model: TldrawApiModel, item: ApiItem) {
	const isComponent = model.isComponent(item)

	const constructors: Member[] = []
	const properties: Member[] = []
	const methods: Member[] = []
	const heritage: HeritageType[] = []

	function visit(item: ApiItem, inheritedFrom: ApiItem | null) {
		if (item.members) {
			for (const member of item.members) {
				switch (member.kind) {
					case ApiItemKind.Constructor:
					case ApiItemKind.ConstructSignature:
						addMember(constructors, member, inheritedFrom)
						break
					case ApiItemKind.Variable:
					case ApiItemKind.Property:
					case ApiItemKind.PropertySignature:
						addMember(properties, member, inheritedFrom)
						break
					case ApiItemKind.Method:
					case ApiItemKind.Function:
					case ApiItemKind.MethodSignature:
						if (isComponent) {
							addMember(properties, member, inheritedFrom)
						} else {
							addMember(methods, member, inheritedFrom)
						}

						break
					case ApiItemKind.EnumMember:
					case ApiItemKind.Class:
					case ApiItemKind.TypeAlias:
					case ApiItemKind.Interface:
						// TODO: document these
						break
					default:
						model.nonBlockingError(
							member,
							`Unknown member kind: ${member.kind} in ${item.displayName}`
						)
						break
				}
			}
		}

		if (model.isComponent(item)) {
			const componentProps = model.getReactPropsItem(item)
			if (componentProps) {
				visit(componentProps, null)
			}
		}

		const extendsTypes =
			item instanceof ApiClass && item.extendsType
				? [item.extendsType]
				: item instanceof ApiInterface
					? item.extendsTypes
					: []

		for (const extendsType of extendsTypes) {
			if (!inheritedFrom) {
				heritage.push(extendsType)
			}

			const tokens = extendsType.excerpt.spannedTokens
			let extendedItem = null
			if (tokens[0].kind === 'Reference') {
				extendedItem = model.tryResolveToken(item, tokens[0])
			}

			if (extendedItem) {
				visit(extendedItem, extendedItem)
			}
		}
	}

	visit(item, null)

	sortMembers(constructors)
	sortMembers(properties)
	sortMembers(methods)

	return { constructors, properties, methods, heritage }
}

function addMember(members: Member[], item: ApiItem, inheritedFrom: ApiItem | null) {
	if (members.some((m) => m.item.displayName === item.displayName)) return
	members.push({ item, inheritedFrom })
}

function addMarkdown(result: Result, markdown: string) {
	result.markdown += markdown
}

async function addMarkdownForMember(
	model: TldrawApiModel,
	result: Result,
	{ item, inheritedFrom }: Member,
	{ isComponentProp = false } = {}
) {
	if (item.displayName.startsWith('_')) return
	addMemberNameAndMeta(result, model, item, { isComponentProp, inheritedFrom })
	await addDeprecationNotice(result, item)
	await addDocComment(model, result, item)
}

async function addFrontmatter(
	model: TldrawApiModel,
	result: Result,
	member: ApiItem,
	categoryName: string,
	order: number
) {
	let kw = ''

	if (result.keywords.length) {
		kw += `\nkeywords:`
		for (const k of result.keywords) {
			if (k.startsWith('_')) continue
			kw += `\n  - ${k.trim().split('\n')[0]}`
		}
	}

	const frontmatter: Record<string, string> = {
		title: member.displayName,
		status: 'published',
		category: categoryName,
		group: model.isComponent(member) ? APIGroup.Component : member.kind,
		date,
		order: order.toString(),
		apiTags: getTags(model, member).join(','),
	}

	if (member instanceof ApiDeclaredItem && member.sourceLocation.fileUrl) {
		frontmatter.sourceUrl = member.sourceLocation.fileUrl
	}

	result.markdown += [
		'---',
		...Object.entries(frontmatter).map(([key, value]) => `${key}: ${value}`),
		kw,
		'---',
		'',
	].join('\n')
}

function addHorizontalRule(result: Result) {
	result.markdown += `---\n\n`
}

function getItemTitle(item: ApiItem) {
	if (item.kind === ApiItemKind.Constructor) {
		return 'Constructor'
	}

	const name = item.displayName
	if (item.kind === ApiItemKind.Method || item.kind === ApiItemKind.Function) {
		return `${name}(\u00A0)`
	}

	return name
}
function addMemberNameAndMeta(
	result: Result,
	model: TldrawApiModel,
	item: ApiItem,
	{
		level = 3,
		isComponentProp = false,
		inheritedFrom = null,
	}: { level?: number; isComponentProp?: boolean; inheritedFrom?: ApiItem | null } = {}
) {
	const heading = `${'#'.repeat(level)} ${getItemTitle(item)}`

	const inherited = inheritedFrom
		? { name: inheritedFrom.displayName, link: `/reference/${getPath(inheritedFrom)}` }
		: null

	const tags = getTags(model, item, { isComponentProp, includeKind: false })
	result.markdown += [
		`<ApiMemberTitle tags={${JSON.stringify(tags)}} inherited={${JSON.stringify(inherited)}}>`,
		'',
		heading,
		'',
		'</ApiMemberTitle>',
		'',
	].join('\n')
}

async function addDocComment(model: TldrawApiModel, result: Result, member: ApiItem) {
	if (!(member instanceof ApiDocumentedItem)) {
		return
	}

	const isComponent = model.isComponent(member)

	if (member.tsdocComment) {
		result.markdown += await MarkdownWriter.docNodeToMarkdown(
			member,
			member.tsdocComment.summarySection
		)
	}

	if (
		!isComponent &&
		(member instanceof ApiVariable ||
			member instanceof ApiTypeAlias ||
			member instanceof ApiProperty ||
			member instanceof ApiPropertySignature ||
			member instanceof ApiClass ||
			member instanceof ApiFunction ||
			member instanceof ApiInterface ||
			member instanceof ApiEnum ||
			member instanceof ApiNamespace ||
			member instanceof ApiMethod)
	) {
		result.markdown += await excerptToMarkdown(member, member.excerpt, {
			kind: member.kind,
		})
		result.markdown += `\n\n`
	}

	if (member.tsdocComment) {
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

	if (isComponent) return

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
				result.markdown += await excerptToMarkdown(member, param.parameterTypeExcerpt, {
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
			result.markdown += await excerptToMarkdown(member, member.returnTypeExcerpt, {
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
		model.nonBlockingError(member, `Unknown member kind: ${member.kind}`)
	}
}

async function addDeprecationNotice(result: Result, member: ApiItem) {
	if (member instanceof ApiDocumentedItem && member.tsdocComment?.deprecatedBlock?.content) {
		result.markdown += `<Callout type="warning">\n\n**Deprecated:**`
		result.markdown += await MarkdownWriter.docNodeToMarkdown(
			member,
			member.tsdocComment.deprecatedBlock.content
		)
		result.markdown += `\n\n</Callout>\n\n`
	}
}

async function excerptToMarkdown(
	item: ApiItem,
	excerpt: Excerpt,
	{ kind, printWidth }: { kind: ApiItemKind | 'ReturnType' | 'ParameterType'; printWidth?: number }
) {
	const links = {} as Record<string, string>

	let code = ''
	for (const token of excerpt.spannedTokens) {
		code += token.text

		if (!token.canonicalReference) continue

		const apiItemResult = item
			.getAssociatedModel()!
			.resolveDeclarationReference(token.canonicalReference!, item)

		if (apiItemResult.errorMessage) continue

		const apiItem = apiItemResult.resolvedApiItem!
		const url = `/reference/${getPath(apiItem)}`
		links[token.text] = url
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

	return [
		`<CodeLinks links={${JSON.stringify(links)}}>`,
		'',
		'```ts',
		code,
		'```',
		'',
		'</CodeLinks>',
	].join('\n')
}

function getTags(
	model: TldrawApiModel,
	member: ApiItem,
	{ isComponentProp = false, includeKind = true } = {}
) {
	const tags = []

	if (ApiStaticMixin.isBaseClassOf(member) && member.isStatic) {
		tags.push('static')
	}
	let kind = member.kind.toLowerCase()
	if (ApiReadonlyMixin.isBaseClassOf(member) && member.isReadonly) {
		if (member.kind === ApiItemKind.Variable) {
			kind = 'constant'
		} else if (!isComponentProp) {
			tags.push('readonly')
		}
	}
	if (model.isComponent(member)) {
		kind = 'component'
	}

	if (ApiOptionalMixin.isBaseClassOf(member) && member.isOptional) {
		tags.push('optional')
	}

	if (includeKind) {
		tags.push(kind)
	}

	return tags
}

function addExtends(result: Result, item: ApiItem, heritage: HeritageType[]) {
	if (!heritage.length) return

	const links = {} as Record<string, string>
	for (const type of heritage) {
		for (const token of type.excerpt.spannedTokens) {
			if (!token.canonicalReference) continue

			const apiItemResult = item
				.getAssociatedModel()!
				.resolveDeclarationReference(token.canonicalReference!, item)

			if (apiItemResult.errorMessage) continue

			const apiItem = apiItemResult.resolvedApiItem!
			links[token.text] = `/reference/${getPath(apiItem)}`
		}
	}

	result.markdown += [
		`<CodeLinks links={${JSON.stringify(links)}}>`,
		'',
		`Extends \`${heritage.map((type) => type.excerpt.text).join(', ')}\`.`,
		'',
		'</CodeLinks>',
		'',
	].join('\n')
}
