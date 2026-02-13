/**
 * Utilities for rendering Mermaid diagram code to SVG.
 */

import mermaid from 'mermaid'

let mermaidInitialized = false

/**
 * Initializes the Mermaid library with appropriate configuration.
 * Should be called once before rendering diagrams.
 */
function initializeMermaid() {
	if (mermaidInitialized) {
		return
	}

	mermaid.initialize({
		startOnLoad: false,
		theme: 'neutral',
		securityLevel: 'loose', // Needed for rendering to work properly
		fontFamily: 'var(--tl-font-draw)', // Use tldraw's default font
		themeVariables: {
			primaryColor: '#1d1d1d',
			primaryTextColor: '#1d1d1d',
			primaryBorderColor: '#1d1d1d',
			lineColor: '#1d1d1d',
			secondaryColor: '#f5f5f5',
			tertiaryColor: '#ffffff',
		},
	})

	mermaidInitialized = true
}

/**
 * Result of rendering a Mermaid diagram to SVG.
 */
export interface MermaidRenderResult {
	/** The SVG string content */
	svg: string
	/** Width of the diagram in pixels */
	width: number
	/** Height of the diagram in pixels */
	height: number
}

/**
 * Renders Mermaid diagram code to an SVG string with dimensions.
 *
 * @param code - The Mermaid diagram code to render
 * @returns The SVG string and dimensions, or null if rendering fails
 */
export async function renderMermaidToSvg(code: string): Promise<MermaidRenderResult | null> {
	if (!code || typeof code !== 'string') {
		return null
	}

	try {
		// Initialize mermaid if needed
		initializeMermaid()

		// Generate a unique ID for this render
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
		let width = 0
		let height = 0

		if (viewBox) {
			const [, , w, h] = viewBox.split(/\s+/).map(parseFloat)
			width = w
			height = h
		} else {
			width = parseFloat(svgElement.getAttribute('width') || '0')
			height = parseFloat(svgElement.getAttribute('height') || '0')
		}

		// Fallback to reasonable defaults if dimensions are missing
		if (!width || !height) {
			width = width || 600
			height = height || 400
		}

		return {
			svg,
			width,
			height,
		}
	} catch (error) {
		return null
	}
}
