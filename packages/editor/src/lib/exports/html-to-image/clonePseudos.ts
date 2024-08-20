import { uniqueId } from '../../utils/uniqueId'

type Pseudo = ':before' | ':after'

function formatCSSText(style: CSSStyleDeclaration) {
	const content = style.getPropertyValue('content')
	return `${style.cssText} content: '${content.replace(/'|"/g, '')}';`
}

function formatCSSProperties(style: CSSStyleDeclaration) {
	return Array.from(style, (name) => {
		const value = style.getPropertyValue(name)
		const priority = style.getPropertyPriority(name)

		return `${name}: ${value}${priority ? ' !important' : ''};`
	}).join(' ')
}

function getPseudoElementStyle(
	className: string,
	pseudo: Pseudo,
	style: CSSStyleDeclaration
): Text {
	const selector = `.${className}:${pseudo}`
	const cssText = style.cssText ? formatCSSText(style) : formatCSSProperties(style)

	return document.createTextNode(`${selector}{${cssText}}`)
}

function clonePseudoElement(node: HTMLElement, pseudo: Pseudo) {
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
	styleElement.appendChild(getPseudoElementStyle(className, pseudo, style))
	node.parentNode!.insertBefore(styleElement, node)
}

export function clonePseudoElements(node: HTMLElement) {
	clonePseudoElement(node, ':before')
	clonePseudoElement(node, ':after')
}
