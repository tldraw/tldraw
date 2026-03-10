// JSDOM lacks SVG geometry methods that mermaid.render() needs
const _origCreateElementNS = document.createElementNS.bind(document)
document.createElementNS = function (ns, tag) {
	const el = _origCreateElementNS(ns, tag)
	if (ns === 'http://www.w3.org/2000/svg') {
		if (!el.getBBox)
			el.getBBox = () => {
				try {
					const t = el.textContent || ''
					return { x: 0, y: 0, width: t.length * 8, height: 16 }
				} catch {
					return { x: 0, y: 0, width: 50, height: 16 }
				}
			}
		if (!el.getComputedTextLength)
			el.getComputedTextLength = () => {
				try {
					return (el.textContent || '').length * 8
				} catch {
					return 50
				}
			}
		if (!el.getTotalLength) el.getTotalLength = () => 100
		if (!el.getPointAtLength) el.getPointAtLength = (d) => ({ x: d, y: 0 })
	}
	return el
}
