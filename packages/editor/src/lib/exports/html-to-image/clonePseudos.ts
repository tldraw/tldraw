import { uniqueId } from '../../utils/uniqueId'
import { embedCssValueUrlsIfNeeded } from './embedCss'

type Pseudo = ':before' | ':after'

async function formatCSSProperties(style: CSSStyleDeclaration) {
	let cssText = ''
	for (const property of style) {
		let value = style.getPropertyValue(property)
		const priority = style.getPropertyPriority(property)

		const replaced = embedCssValueUrlsIfNeeded(value)
		if (replaced) {
			value = await replaced
		}

		cssText += `${property}: ${value}${priority ? ' !important' : ''};`
	}
	return cssText
}

async function getPseudoElementStyle(
	className: string,
	pseudo: Pseudo,
	style: CSSStyleDeclaration
): Promise<Text> {
	const selector = `.${className}:${pseudo}`
	const cssText = await formatCSSProperties(style)

	return document.createTextNode(`${selector}{${cssText}}`)
}

async function clonePseudoElement(node: HTMLElement, pseudo: Pseudo) {
	const style = window.getComputedStyle(node, pseudo)
	const content = style.getPropertyValue('content')
	if (content === '' || content === 'none') {
		return
	}

	const className = `pseudo-${uniqueId()}`
	try {
		node.className = `${node.className} ${className}`
	} catch (err) {
		return
	}

	const styleElement = document.createElement('style')
	styleElement.appendChild(await getPseudoElementStyle(className, pseudo, style))
	node.parentNode!.insertBefore(styleElement, node)
}

export async function clonePseudoElements(node: HTMLElement) {
	await clonePseudoElement(node, ':before')
	await clonePseudoElement(node, ':after')
}
