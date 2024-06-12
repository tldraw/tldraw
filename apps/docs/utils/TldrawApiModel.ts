import { MarkdownWriter } from '@/scripts/utils'
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
import { assert } from './assert'

export class TldrawApiModel extends ApiModel {
	private reactComponents = new Set<ApiItem>()
	private reactComponentProps = new Set<ApiItem>()

	async preprocessReactComponents() {
		const errors = []
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
							this.error(
								props,
								"Component props should not contain documentation as it won't be included in the docs site. Add it to the component instead."
							)
						}
					}
					if (props) this.reactComponentProps.add(props)
				} catch (e) {
					errors.push(e)
				}
			}
		}

		if (errors.length > 0) {
			throw new Error(errors.map((e) => (e as any).message).join('\n\n'))
		}
	}

	resolveToken(origin: ApiItem, token: ExcerptToken) {
		const apiItemResult = this.resolveDeclarationReference(token.canonicalReference!, origin)
		if (apiItemResult.errorMessage) {
			this.error(origin, apiItemResult.errorMessage)
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

			this.error(
				component,
				`Expected props parameter to be a simple reference. Rewrite this to use a \`${component.displayName}Props\` interface.\nFound: ${propsParam.parameterTypeExcerpt.text}`
			)
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

			if (component.variableTypeExcerpt.text === 'import("react").NamedExoticComponent<object>') {
				// this is a `memo` component with no props
				return null
			}

			this.error(
				component,
				`Expected a simple props interface for react component. Got: ${component.variableTypeExcerpt.text}`
			)
		} else {
			this.error(component, `Unknown item kind for @react component: ${component.kind}`)
		}
	}

	isComponent(item: ApiItem): boolean {
		return this.reactComponents.has(item)
	}

	isComponentProps(item: ApiItem): boolean {
		return this.reactComponentProps.has(item)
	}

	error(item: ApiItem, message: string): never {
		const suffix =
			'_fileUrlPath' in item && typeof item._fileUrlPath === 'string'
				? `\nin ${item._fileUrlPath}`
				: ''
		throw new Error(`${item.displayName}: ${message}${suffix}`)
	}

	assert(item: ApiItem, condition: unknown, message: string): asserts condition {
		if (!condition) {
			this.error(item, message)
		}
	}
}
