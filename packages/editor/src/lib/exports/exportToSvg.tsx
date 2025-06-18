import { TLShapeId } from '@tldraw/tlschema'
import { assert } from '@tldraw/utils'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Editor } from '../editor/Editor'
import { TLSvgExportOptions } from '../editor/types/misc-types'
import { SVG_EXPORT_CLASSNAME } from './FontEmbedder'
import { StyleEmbedder } from './StyleEmbedder'
import { embedMedia } from './embedMedia'
import { getSvgJsx } from './getSvgJsx'

let idCounter = 1

export async function exportToSvg(
	editor: Editor,
	shapeIds: TLShapeId[],
	opts: TLSvgExportOptions = {}
) {
	// when rendering to SVG, we start by creating a JSX representation of the SVG that we can
	// render with react. Hopefully elements will have a `toSvg` method that renders them to SVG,
	// but if they don't we'll render their normal HTML content into an svg <foreignObject> element.
	const result = getSvgJsx(editor, shapeIds, opts)
	if (!result) return undefined

	// we need to render that SVG into a real DOM element that's actually laid out in the document.
	// without this CSS and layout aren't computed correctly, which we need to make sure any
	// <foreignObject> elements have their styles and content inlined correctly.
	const container = editor.getContainer()
	const renderTarget = document.createElement('div')
	renderTarget.className = SVG_EXPORT_CLASSNAME
	// we hide the element visually, but we don't want it to be focusable or interactive in any way either
	renderTarget.inert = true
	renderTarget.tabIndex = -1
	Object.assign(renderTarget.style, {
		position: 'absolute',
		top: '0px',
		left: '0px',
		width: result.width + 'px',
		height: result.height + 'px',
		pointerEvents: 'none',
		opacity: 0,
	})
	// we have to add the element to the document as otherwise styles won't be computed correctly.
	container.appendChild(renderTarget)

	// create a react root...
	const root = createRoot(renderTarget, { identifierPrefix: `export_${idCounter++}_` })
	try {
		// ...wait for a tick so we know we're not in e.g. a react lifecycle method...
		await Promise.resolve()

		// ...and render the SVG into it.
		flushSync(() => {
			root.render(result.jsx)
		})

		// Some operations take a while - for example, waiting for an asset to load in. We give
		// shape authors a way to delay snap-shotting the export until they're ready.
		await result.exportDelay.resolve()

		// Extract the rendered SVG element from the react root
		const svg = renderTarget.firstElementChild
		assert(svg instanceof SVGSVGElement, 'Expected an SVG element')

		// And apply any changes to <foreignObject> elements that we need to make. while we're in
		// the document, these elements work exactly as we'd expect from other dom elements - they
		// can load external resources, and any stylesheets in the document apply to them as we
		// would expect them to. But when we pull the SVG into its own file or draw it to a canvas
		// though, it has to be completely self-contained. We embed any external resources, and
		// apply any styles directly to the elements themselves.
		await applyChangesToForeignObjects(svg)

		return { svg, width: result.width, height: result.height }
	} finally {
		// eslint-disable-next-line no-restricted-globals
		setTimeout(() => {
			// we wait for a cycle of the event loop to allow the svg to be cloned etc. before
			// unmounting
			root.unmount()
			container.removeChild(renderTarget)
		}, 0)
	}
}

async function applyChangesToForeignObjects(svg: SVGSVGElement) {
	// If any shapes have their own <foreignObject> elements, we don't want to mess with them. Our
	// ones that we need to embed will have a class of `tl-export-embed-styles`.
	const foreignObjectChildren = [
		...svg.querySelectorAll('foreignObject.tl-export-embed-styles > *'),
	]
	if (!foreignObjectChildren.length) return

	// StyleEmbedder embeds any CSS - including resources like fonts and images.
	const styleEmbedder = new StyleEmbedder(svg)

	try {
		// begin traversing stylesheets to find @font-face declarations we might need to embed
		styleEmbedder.fonts.startFindingCurrentDocumentFontFaces()

		// embed any media elements in the foreignObject children. images will get converted to data
		// urls, and things like videos will be converted to images.
		await Promise.all(foreignObjectChildren.map((el) => embedMedia(el as HTMLElement)))

		// read the computed styles of every element (+ it's children & pseudo-elements) in the
		// document. we do this in a single pass before we start embedding any CSS stuff to avoid
		// constantly forcing the browser to recompute styles & layout.
		for (const el of foreignObjectChildren) {
			styleEmbedder.readRootElementStyles(el as HTMLElement)
		}

		// fetch any resources that we need to embed in the CSS, like background images.
		await styleEmbedder.fetchResources()
		const fontCss = await styleEmbedder.getFontFaceCss()

		// custom elements that make use of the shadow dom won't be serialized correctly by default:
		// the contents of the shadow dom will be ignored. once we've read the styles from the
		// document, we go through and replace any custom elements with plain `<div>`s. as we do so,
		// we traverse the shadow dom and clone it into the new plain div. any scoped stylesheets
		// are removed, as we've already read all the computed styles above.
		styleEmbedder.unwrapCustomElements()

		// apply the computed styles (with their embedded resources) directly to the elements with
		// their `style` attribute. Anything that can't be done this way (pseudo-elements) will be
		// returned as a string of CSS.
		const pseudoCss = styleEmbedder.embedStyles()

		// add the CSS to the SVG
		if (fontCss || pseudoCss) {
			const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
			style.textContent = `${fontCss}\n${pseudoCss}`
			svg.prepend(style)
		}
	} finally {
		styleEmbedder.dispose()
	}
}
