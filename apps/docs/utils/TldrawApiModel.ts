import { MarkdownWriter } from '@/scripts/lib/utils'
import {
	ApiDocumentedItem,
	ApiFunction,
	ApiItem,
	ApiModel,
	ApiPackage,
	ApiVariable,
	ExcerptToken,
	ExcerptTokenKind,
} from '@microsoft/api-extractor-model'
import { assert } from '@tldraw/utils'

export class TldrawApiModel extends ApiModel {
	private reactComponents = new Set<ApiItem>()
	private reactComponentProps = new Set<ApiItem>()

	nonBlockingErrors: Error[] = []

	async preprocessReactComponents() {
		for (const packageModel of this.members) {
			assert(packageModel instanceof ApiPackage)
			if (packageModel.name !== 'tldraw') continue

			const entrypoint = packageModel.entryPoints[0]
			for (const member of entrypoint.members) {
				assert(member instanceof ApiDocumentedItem)
				if (!member.tsdocComment) continue
				if (!member.tsdocComment.modifierTagSet.hasTagName('@react')) continue

				this.reactComponents.add(member)
				try {
					const props = this.getReactPropsItem(member)

					if (props instanceof ApiDocumentedItem && props.tsdocComment) {
						const markdown = await MarkdownWriter.docNodeToMarkdown(
							props,
							props.tsdocComment.summarySection
						)
						if (markdown.trim()) {
							this.nonBlockingError(
								props,
								"Component props should not contain documentation as it won't be included in the docs site. Add it to the component instead."
							)
						}
					}
					if (props) this.reactComponentProps.add(props)
				} catch (e: any) {
					this.nonBlockingErrors.push(e)
				}
			}
		}
	}

	resolveToken(origin: ApiItem, token: ExcerptToken) {
		const apiItemResult = this.resolveDeclarationReference(token.canonicalReference!, origin)
		if (apiItemResult.errorMessage) {
			this.error(origin, apiItemResult.errorMessage)
		}
		return apiItemResult.resolvedApiItem!
	}

	tryResolveToken(origin: ApiItem, token: ExcerptToken) {
		const apiItemResult = this.resolveDeclarationReference(token.canonicalReference!, origin)
		if (apiItemResult.errorMessage) {
			return null
		}
		return apiItemResult.resolvedApiItem!
	}

	getReactPropsItem(component: ApiItem): ApiItem | null {
		if (component instanceof ApiFunction) {
			if (component.parameters.length === 0) return null
			this.assert(
				component,
				component.parameters.length === 1,
				`Expected 1 parameter for @react component`
			)

			const propsParam = component.parameters[0]
			const tokens = propsParam.parameterTypeExcerpt.spannedTokens
			if (tokens.length === 1 && tokens[0].kind === 'Reference') {
				return this.resolveToken(component, tokens[0])
			} else if (
				tokens.length === 2 &&
				tokens[0].kind === 'Reference' &&
				tokens[1].text.startsWith('<')
			) {
				return this.resolveToken(component, tokens[0])
			}

			this.nonBlockingError(
				component,
				`Expected props parameter to be a simple reference. Rewrite this to use a \`${component.displayName}Props\` interface.\nFound: ${propsParam.parameterTypeExcerpt.text}`
			)
			return null
		} else if (component instanceof ApiVariable) {
			const tokens = component.variableTypeExcerpt.spannedTokens
			if (
				tokens.length === 5 &&
				tokens[0].text === 'import("react").' &&
				tokens[1].text === 'NamedExoticComponent' &&
				tokens[2].text === '<' &&
				tokens[3].kind === ExcerptTokenKind.Reference &&
				tokens[4].text === '>'
			) {
				return this.resolveToken(component, tokens[3])
			}

			if (
				tokens.length === 4 &&
				tokens[0].text === 'React.NamedExoticComponent' &&
				tokens[1].text === '<' &&
				tokens[2].kind === ExcerptTokenKind.Reference &&
				tokens[3].text === '>'
			) {
				return this.resolveToken(component, tokens[2])
			}

			if (
				tokens.length === 8 &&
				tokens[0].text === 'React.ForwardRefExoticComponent' &&
				tokens[1].text === '<' &&
				tokens[2].kind === ExcerptTokenKind.Reference &&
				tokens[3].text === ' & ' &&
				tokens[4].text === 'React.RefAttributes' &&
				tokens[5].text === '<' &&
				tokens[6].kind === ExcerptTokenKind.Reference &&
				tokens[7].text === '>>'
			) {
				return this.resolveToken(component, tokens[2])
			}

			if (
				tokens.length === 9 &&
				tokens[0].text === 'import("react").' &&
				tokens[1].text === 'ForwardRefExoticComponent' &&
				tokens[2].text === '<' &&
				tokens[3].kind === ExcerptTokenKind.Reference &&
				tokens[4].text === ' & import("react").' &&
				tokens[5].text === 'RefAttributes' &&
				tokens[6].text === '<' &&
				tokens[7].kind === ExcerptTokenKind.Reference &&
				tokens[8].text === '>>'
			) {
				return this.resolveToken(component, tokens[3])
			}

			if (component.variableTypeExcerpt.text === 'import("react").NamedExoticComponent<object>') {
				// this is a `memo` component with no props
				return null
			}

			this.nonBlockingError(
				component,
				`Expected a simple props interface for react component. Got: ${component.variableTypeExcerpt.text}`
			)

			return null
		} else {
			this.nonBlockingError(component, `Unknown item kind for @react component: ${component.kind}`)

			return null
		}
	}

	isComponent(item: ApiItem): boolean {
		return this.reactComponents.has(item)
	}

	isComponentProps(item: ApiItem): boolean {
		return this.reactComponentProps.has(item)
	}

	private createError(item: ApiItem, message: string) {
		const suffix =
			'_fileUrlPath' in item && typeof item._fileUrlPath === 'string'
				? `\nin ${item._fileUrlPath}`
				: ''
		return new Error(`${item.displayName}: ${message}${suffix}`)
	}

	nonBlockingError(item: ApiItem, message: string) {
		this.nonBlockingErrors.push(this.createError(item, message))
	}

	throwEncounteredErrors() {
		if (this.nonBlockingErrors.length > 0) {
			throw new Error(this.nonBlockingErrors.map((e) => (e as any).message).join('\n\n'))
		}
	}

	error(item: ApiItem, message: string): never {
		throw this.createError(item, message)
	}

	assert(item: ApiItem, condition: unknown, message: string): asserts condition {
		if (!condition) {
			this.error(item, message)
		}
	}
}
