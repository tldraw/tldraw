/**
 * Bidirectional mapping tables between tldraw shape properties and Mermaid syntax.
 */

// tldraw geo -> Mermaid node shape name
export function geoToMermaidShape(geo: string): string {
	switch (geo) {
		case 'rectangle': return 'rectangle'
		case 'diamond': return 'diamond'
		case 'ellipse': return 'ellipse'
		case 'oval': return 'oval'
		case 'hexagon': return 'hexagon'
		case 'trapezoid': return 'trapezoid'
		case 'cloud': return 'rectangle'
		default: return 'rectangle'
	}
}

/**
 * tldraw dash property → Mermaid line style.
 * Mermaid only has: solid (--), dotted (-.-), thick (==).
 * Both tldraw 'dashed' and 'dotted' map to Mermaid 'dotted' since
 * Mermaid's dotted (.-) renders as a dashed-looking line.
 */
export function dashToLineStyle(dash: string): 'solid' | 'dotted' | 'thick' {
	switch (dash) {
		case 'dotted': return 'dotted'
		case 'dashed': return 'dotted'
		default: return 'solid' // 'draw' and 'solid' both map to solid
	}
}

/**
 * Mermaid line style → tldraw dash property.
 * Reverse of dashToLineStyle for the code→shapes direction.
 */
export function lineStyleToDash(lineStyle: string): 'solid' | 'dashed' | 'dotted' {
	switch (lineStyle) {
		case 'dotted': return 'dashed' // Mermaid dotted looks like dashed
		case 'thick': return 'solid'   // No thick equivalent in tldraw
		default: return 'solid'
	}
}

// tldraw arrowhead -> Mermaid arrowhead type
export function arrowheadToMermaid(arrowhead: string): 'none' | 'arrow' | 'dot' | 'bar' {
	switch (arrowhead) {
		case 'arrow': return 'arrow'
		case 'triangle': return 'arrow'
		case 'dot': return 'dot'
		case 'bar': return 'bar'
		case 'diamond': return 'bar'
		case 'pipe': return 'bar'
		case 'none': return 'none'
		default: return 'none'
	}
}

// tldraw color name -> CSS hex
const TLDRAW_TO_CSS: Record<string, string> = {
	red: '#e03131',
	blue: '#1971c2',
	green: '#2f9e44',
	violet: '#6741d9',
	orange: '#f08c00',
	yellow: '#ffd43b',
	'light-blue': '#4dabf7',
	'light-green': '#69db7c',
	'light-red': '#ffa8a8',
	'light-violet': '#b197fc',
	grey: '#868e96',
	white: '#ffffff',
}

export function tldrawColorToCss(color: string): string | null {
	return TLDRAW_TO_CSS[color] ?? null
}

// CSS hex -> tldraw color name
const CSS_TO_TLDRAW: Record<string, string> = {
	'#e03131': 'red', '#c92a2a': 'red', red: 'red',
	'#1971c2': 'blue', '#1864ab': 'blue', blue: 'blue',
	'#2f9e44': 'green', '#2b8a3e': 'green', green: 'green',
	'#f08c00': 'orange', orange: 'orange',
	'#ffd43b': 'yellow', yellow: 'yellow',
	'#6741d9': 'violet', purple: 'violet', violet: 'violet',
	'#4dabf7': 'light-blue',
	'#69db7c': 'light-green',
	'#ffa8a8': 'light-red',
	'#b197fc': 'light-violet',
	'#868e96': 'grey', grey: 'grey', gray: 'grey',
}

export function cssColorToTldraw(css: string): string | undefined {
	const hex = css.toLowerCase().replace(/\s/g, '')
	if (CSS_TO_TLDRAW[hex]) return CSS_TO_TLDRAW[hex]

	// Approximate match by parsing hex
	if (hex.startsWith('#') && (hex.length === 4 || hex.length === 7)) {
		const r = parseInt(hex.length === 4 ? hex[1] + hex[1] : hex.slice(1, 3), 16)
		const g = parseInt(hex.length === 4 ? hex[2] + hex[2] : hex.slice(3, 5), 16)
		const b = parseInt(hex.length === 4 ? hex[3] + hex[3] : hex.slice(5, 7), 16)
		if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
			if (r > 180 && g < 100 && b < 100) return 'red'
			if (r < 100 && g < 100 && b > 150) return 'blue'
			if (r < 100 && g > 150 && b < 100) return 'green'
			if (r > 200 && g > 100 && b < 50) return 'orange'
			if (r > 200 && g > 200 && b < 100) return 'yellow'
			if (r > 80 && r < 150 && b > 150) return 'violet'
		}
	}
	return undefined
}
