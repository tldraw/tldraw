/**
 * Render Mermaid diagram code to SVG using mermaid-js library
 */

import mermaid from 'mermaid'

// Initialize mermaid once
let isInitialized = false

function initializeMermaid() {
	if (isInitialized) return

	mermaid.initialize({
		startOnLoad: false,
		theme: 'dark', // Match tldraw's dark mode
		securityLevel: 'loose', // Needed for rendering
		fontFamily: 'system-ui, -apple-system, sans-serif',
	})

	isInitialized = true
}

/**
 * Render a Mermaid diagram to SVG
 * Returns the SVG string and dimensions
 */
export async function renderMermaidToSvg(
	code: string
): Promise<{ svg: string; width: number; height: number } | null> {
	try {
		initializeMermaid()

		// Generate unique ID for this render
		const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

		// Render the diagram
		const { svg } = await mermaid.render(id, code)

		// Parse SVG to extract dimensions
		const parser = new DOMParser()
		const svgDoc = parser.parseFromString(svg, 'image/svg+xml')
		const svgElement = svgDoc.querySelector('svg')

		if (!svgElement) {
			return null
		}

		// Get dimensions from viewBox or width/height attributes
		const viewBox = svgElement.getAttribute('viewBox')
		let width = 400 // Default width
		let height = 300 // Default height

		if (viewBox) {
			const [, , w, h] = viewBox.split(' ').map(Number)
			width = w || width
			height = h || height
		} else {
			const widthAttr = svgElement.getAttribute('width')
			const heightAttr = svgElement.getAttribute('height')

			if (widthAttr && heightAttr) {
				// Remove 'px' suffix if present
				width = parseFloat(widthAttr.replace('px', '')) || width
				height = parseFloat(heightAttr.replace('px', '')) || height
			}
		}

		return { svg, width, height }
	} catch (error) {
		return null
	}
}
