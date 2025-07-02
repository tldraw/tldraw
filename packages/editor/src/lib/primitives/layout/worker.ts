import { Rectangle, Solver, Variable, generateXConstraints, generateYConstraints } from 'webcola'

import { Request, RequestNode, ResponseNode } from './types'

self.addEventListener('message', (event: MessageEvent<Request>) => {
	const { requestId, nodes: requestNodes } = event.data

	if (requestNodes.length === 0) {
		self.postMessage({
			requestId,
			nodes: [],
		})
		return
	}

	// if there are nodes with same x, y, w, h, and padding
	// we need to rendomize x/y a little bit to avoid
	// due to webcola's algorithm which doesn't move nodes
	// that are same
	const uniqueNodes = new Map<string, RequestNode>()
	let i = 0
	requestNodes.forEach((node) => {
		const key = `${node.x},${node.y},${node.w},${node.h},${
			typeof node.padding === 'number'
				? [node.padding, node.padding, node.padding, node.padding]
				: node.padding
		}`
		if (!uniqueNodes.has(key)) {
			uniqueNodes.set(key, node)
		} else {
			const angle = (i * 137.508) % 360 // use a large irrational number for spread
			const offset = 0.01
			node.x += Math.cos(angle) * offset
			node.y += Math.sin(angle) * offset
			i += 1
		}
	})

	const rs = requestNodes.map((node) => {
		const [pt, pr, pb, pl] = (typeof node.padding === 'number'
			? [node.padding, node.padding, node.padding, node.padding]
			: node.padding) ?? [0, 0, 0, 0]
		const x = node.x - pl
		const y = node.y - pt
		const w = node.w + pl + pr
		const h = node.h + pt + pb
		return new Rectangle(x, x + w, y, y + h)
	})

	let vs = rs.map((r, i) => new Variable(r.cx(), requestNodes[i]!.weight ?? 1))
	let cs = generateXConstraints(rs, vs)
	let solver = new Solver(vs, cs)
	solver.solve()
	vs.forEach((v, i) => rs[i]!.setXCentre(v.position()))
	vs = rs.map((r, i) => new Variable(r.cy(), requestNodes[i]!.weight ?? 1))
	cs = generateYConstraints(rs, vs)
	solver = new Solver(vs, cs)
	solver.solve()
	vs.forEach((v, i) => rs[i]!.setYCentre(v.position()))

	const responseNodes = rs.map((r, i) => {
		const requestNode = requestNodes[i]!
		const [pt, , , pl] = (typeof requestNode.padding === 'number'
			? [requestNode.padding, requestNode.padding, requestNode.padding, requestNode.padding]
			: requestNode.padding) ?? [0, 0, 0, 0]
		return {
			type: requestNode.type,
			id: requestNode.id,
			x: r.x + pl,
			y: r.y + pt,
		} satisfies ResponseNode
	})

	self.postMessage({
		requestId,
		nodes: responseNodes,
	})
})
