/** Parse translate(x, y) from an SVG transform attribute */
export function parseTranslate(transform: string | null): { x: number; y: number } {
	if (!transform) return { x: 0, y: 0 }
	// Match: translate(x, y) or translate(x y)
	const m = transform.match(/translate\(\s*([+-]?\d*\.?\d+)\s*[,\s]+\s*([+-]?\d*\.?\d+)\s*\)/)
	if (!m) return { x: 0, y: 0 }
	return { x: parseFloat(m[1]), y: parseFloat(m[2]) }
}

/**
 * Get absolute position of an element by summing all ancestor translate()
 * transforms up to (but not including) the <svg> element.
 */
export function getAbsoluteTranslate(el: Element): { x: number; y: number } {
	let x = 0
	let y = 0
	let curr: Element | null = el
	while (curr && curr.tagName.toLowerCase() !== 'svg') {
		const t = parseTranslate(curr.getAttribute('transform'))
		x += t.x
		y += t.y
		curr = curr.parentElement
	}
	return { x, y }
}

/**
 * Get the bounding box of a Mermaid/Dagre node element.
 * Dagre positions nodes at their center via transform="translate(cx, cy)".
 * Child rect/circle elements are centered at (0,0) in local space.
 */
export function getNodeBounds(
	nodeEl: Element
): { x: number; y: number; width: number; height: number } {
	const center = getAbsoluteTranslate(nodeEl)

	// Circle (ellipse/start-end markers)
	const circle = nodeEl.querySelector('circle')
	if (circle) {
		const r = parseFloat(circle.getAttribute('r') ?? '20')
		return { x: center.x - r, y: center.y - r, width: r * 2, height: r * 2 }
	}

	// SVG ellipse
	const ellipse = nodeEl.querySelector('ellipse')
	if (ellipse) {
		const rx = parseFloat(ellipse.getAttribute('rx') ?? '40')
		const ry = parseFloat(ellipse.getAttribute('ry') ?? '20')
		return { x: center.x - rx, y: center.y - ry, width: rx * 2, height: ry * 2 }
	}

	// Rect — Dagre centers it at (0,0) so x = -w/2, y = -h/2
	const rect = nodeEl.querySelector('rect')
	if (rect) {
		const w = parseFloat(rect.getAttribute('width') ?? '120')
		const h = parseFloat(rect.getAttribute('height') ?? '40')
		const rx = parseFloat(rect.getAttribute('x') ?? '0')
		const ry = parseFloat(rect.getAttribute('y') ?? '0')
		if (rx < -1) {
			// Already centered: rect.x = -w/2
			return { x: center.x + rx, y: center.y + ry, width: w, height: h }
		}
		// Fallback: assume dagre centering
		return { x: center.x - w / 2, y: center.y - h / 2, width: w, height: h }
	}

	// Polygon (diamond, hexagon)
	const polygon = nodeEl.querySelector('polygon')
	if (polygon) {
		const pts = (polygon.getAttribute('points') ?? '')
			.trim()
			.split(/[\s,]+/)
			.map(Number)
			.filter((n) => !isNaN(n))
		if (pts.length >= 4) {
			const xs = pts.filter((_, i) => i % 2 === 0)
			const ys = pts.filter((_, i) => i % 2 === 1)
			const minX = Math.min(...xs)
			const maxX = Math.max(...xs)
			const minY = Math.min(...ys)
			const maxY = Math.max(...ys)
			return { x: center.x + minX, y: center.y + minY, width: maxX - minX, height: maxY - minY }
		}
	}

	return { x: center.x - 60, y: center.y - 20, width: 120, height: 40 }
}

/** Extract text content from a Mermaid SVG node element */
export function extractSvgText(el: Element): string {
	// foreignObject (mermaid v10+ htmlLabels)
	const fo = el.querySelector('foreignObject')
	if (fo) return (fo.textContent ?? '').trim().replace(/\s+/g, ' ')
	// text elements
	const texts = Array.from(el.querySelectorAll('text'))
	return texts
		.map((t) => (t.textContent ?? '').trim())
		.filter(Boolean)
		.join(' ')
}

/** Detect tldraw geo type from the child elements of a Mermaid node */
export function detectGeoShape(nodeEl: Element): string {
	if (nodeEl.querySelector('circle')) return 'ellipse'
	if (nodeEl.querySelector('ellipse')) return 'ellipse'
	const polygon = nodeEl.querySelector('polygon')
	if (polygon) {
		const pts = (polygon.getAttribute('points') ?? '').trim().split(/\s+/)
		return pts.length <= 5 ? 'diamond' : 'hexagon'
	}
	const rect = nodeEl.querySelector('rect')
	if (rect) {
		const rx = parseFloat(rect.getAttribute('rx') ?? '0')
		return rx > 8 ? 'oval' : 'rectangle'
	}
	return 'rectangle'
}
