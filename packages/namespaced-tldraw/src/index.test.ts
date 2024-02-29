import * as tldraw from './index'

it('exports things from tldraw', () => {
	expect(tldraw).toHaveProperty('Tldraw')
	expect(new tldraw.Vec()).toMatchObject({ x: 0, y: 0 })
})

it('exports types from tldraw', () => {
	const _thing: tldraw.VecModel = { x: 0, y: 0 }
})
