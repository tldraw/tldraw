import { TLShape } from '@tldraw/editor'
import { runtime, ui, util } from '../helpers'
import { describe, it } from '../mocha-ext'
import { SHAPES } from './constants'

const LITE_MODE = true

const assertColors = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const colors = LITE_MODE
			? ['black']
			: [
					'black',
					'grey',
					'light-violet',
					'violet',
					'blue',
					'light-blue',
					'yellow',
					'orange',
					'green',
					'light-green',
					'light-red',
					'red',
			  ]

		await ui.props.ifMobileOpenStylesMenu()
		for (const color of colors) {
			await ui.props.selectColor(color)
			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect('color' in allShapes[0].props && allShapes[0].props.color).toBe(color)
		}
	}
}

const assertOpacity = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const opacities = LITE_MODE ? [0.5] : [0.1, 0.25, 0.5, 0.75, 1]

		await ui.props.ifMobileOpenStylesMenu()
		for (const opacity of opacities) {
			await ui.props.selectOpacity(opacity)
			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect('opacity' in allShapes[0].props && allShapes[0].props.opacity).toBe(opacity)
		}
	}
}

const assertFill = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const fills = LITE_MODE ? ['solid'] : ['none', 'semi', 'solid', 'pattern']

		await ui.props.ifMobileOpenStylesMenu()
		for (const fill of fills) {
			await ui.props.selectFill(fill)
			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect(allShapes[0].props).toHaveProperty('fill', fill)
		}
	}
}

const assertFont = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const fonts = LITE_MODE ? ['sans'] : ['draw', 'sans', 'serif', 'mono']

		await ui.props.ifMobileOpenStylesMenu()
		for (const font of fonts) {
			await ui.props.selectFont(font)
			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect(allShapes[0].props).toHaveProperty('font', font)
		}
	}
}

const assertAlign = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const alignments = LITE_MODE ? ['middle'] : ['start', 'middle', 'end']

		await ui.props.ifMobileOpenStylesMenu()
		for (const alignment of alignments) {
			await ui.props.selectAlign(alignment)
			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect(allShapes[0].props).toHaveProperty('align', alignment)
		}
	}
}

const assertStroke = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const strokes = LITE_MODE ? ['dashed'] : ['draw', 'dashed', 'dotted', 'solid']

		await ui.props.ifMobileOpenStylesMenu()
		for (const stroke of strokes) {
			await ui.props.selectStroke(stroke)
			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect(allShapes[0].props).toHaveProperty('dash', stroke)
		}
	}
}

const assertSize = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const sizes = LITE_MODE ? ['xl'] : ['s', 'm', 'l', 'xl']

		await ui.props.ifMobileOpenStylesMenu()
		for (const size of sizes) {
			await ui.props.selectSize(size)
			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect(allShapes[0].props).toHaveProperty('size', size)
		}
	}
}

const assertSpline = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const types = LITE_MODE ? ['line'] : ['line', 'cubic']

		await ui.props.ifMobileOpenStylesMenu()
		for (const type of types) {
			await ui.props.selectSpline(type)
			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect(allShapes[0].props).toHaveProperty('spline', type)
		}
	}
}

const assertArrowheads = (createShape: () => Promise<TLShape>) => {
	return async () => {
		await ui.app.setup()
		await createShape()
		const types = LITE_MODE
			? ['triangle']
			: ['none', 'arrow', 'triangle', 'square', 'dot', 'diamond', 'inverted', 'bar']

		await ui.props.ifMobileOpenStylesMenu()
		for (const startType of types) {
			for (const endType of types) {
				await ui.props.selectArrowheadStart(startType)
				await ui.props.selectArrowheadEnd(endType)
				const allShapes = await runtime.getAllShapes()
				expect(allShapes.length).toBe(1)
				expect(allShapes[0].props).toHaveProperty('arrowheadStart', startType)
				expect(allShapes[0].props).toHaveProperty('arrowheadEnd', endType)
			}
		}
	}
}

describe.skip('styling', () => {
	describe('draw', () => {
		const createShape = async () => {
			await ui.tools.click('draw')
			await ui.canvas.draw([
				{ x: 50, y: 50 },
				{ x: 300, y: 50 },
				{ x: 300, y: 300 },
				{ x: 50, y: 300 },
				{ x: 50, y: 50 },
			])
			await ui.tools.click('select')

			return (await runtime.getAllShapes())[0]
		}
		it('color', assertColors(createShape))
		it.todo('opacity', assertOpacity(createShape))
		it('fill', assertFill(createShape))
		it('stroke', assertStroke(createShape))
		it('size', assertSize(createShape))
	})

	describe('arrow', () => {
		const createShape = async () => {
			await ui.tools.click('arrow')
			await ui.canvas.brush(50, 50, 200, 200)

			await ui.canvas.doubleClick((200 - 50) / 2, (200 - 50) / 2)
			await browser.keys(['test'])
			await browser.action('key').down('\uE03D').down('\uE007').perform(true)
			await util.sleep(20)
			await browser.action('key').up('\uE007').up('\uE03D').perform()

			return (await runtime.getAllShapes())[0]
		}
		it('color', assertColors(createShape))
		it.todo('opacity', assertOpacity(createShape))
		it('fill', assertFill(createShape))
		it('stroke', assertStroke(createShape))
		it('size', assertSize(createShape))
		it('arrowheads', assertArrowheads(createShape))
		it('font', assertFont(createShape))
	})

	describe('line', () => {
		const createShape = async () => {
			await ui.tools.click('line')
			await ui.canvas.brush(50, 50, 200, 200)

			return (await runtime.getAllShapes())[0]
		}
		it('color', assertColors(createShape))
		it.todo('opacity', assertOpacity(createShape))
		it('stroke', assertStroke(createShape))
		it('size', assertSize(createShape))
		it('spline', assertSpline(createShape))
	})

	SHAPES.map((shapeDef) => {
		describe(shapeDef.tool, () => {
			const createShape = async () => {
				await ui.tools.click(shapeDef.tool)
				await ui.canvas.brush(60, 60, 210, 210)

				await ui.canvas.doubleClick(60 + (210 - 60) / 2, 60 + (210 - 60) / 2)
				await browser.keys(['test'])
				await browser.action('key').down('\uE03D').down('\uE007').perform(true)
				await util.sleep(20)
				await browser.action('key').up('\uE007').up('\uE03D').perform(true)

				return (await runtime.getAllShapes())[0]
			}

			it('color', assertColors(createShape))
			it.todo('opacity', () => {})
			it('fill', assertFill(createShape))
			it('stroke', assertStroke(createShape))
			it('size', assertSize(createShape))
			it('font', assertFont(createShape))
			it('align', assertAlign(createShape))
		})
	})

	describe('text', () => {
		const createShape = async () => {
			await ui.tools.click('select')
			await ui.tools.click('text')
			await ui.canvas.click(100, 100)
			await browser.keys('testing')

			return (await runtime.getAllShapes())[0]
		}
		it('color', assertColors(createShape))
		it.todo('opacity', assertOpacity(createShape))
		it('size', assertSize(createShape))
		it('font', assertFont(createShape))
		it('align', assertAlign(createShape))
	})

	describe('frame', () => {
		const createShape = async () => {
			await ui.tools.click('frame')
			await ui.canvas.brush(10, 10, 60, 160)

			await ui.canvas.doubleClick(10, 0)
			await browser.keys([
				'test',
				'\uE007', // ENTER
			])

			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect(allShapes[0].type).toBe('frame')
			expect(allShapes[0].props).toHaveProperty('name', 'test')

			return allShapes[0]
		}
		it.todo('opacity', assertOpacity(createShape))
	})

	describe.skip('note', () => {
		const createShape = async () => {
			await ui.tools.click('note')
			await ui.canvas.click(100, 100)
			await browser.keys(['test'])
			await browser.action('key').down('\uE03D').down('\uE007').perform(true)
			await util.sleep(20)
			await browser.action('key').up('\uE007').up('\uE03D').perform(true)

			const allShapes = await runtime.getAllShapes()
			expect(allShapes.length).toBe(1)
			expect(allShapes[0].type).toBe('note')
			expect(allShapes[0].props).toHaveProperty('text', 'test')

			return allShapes[0]
		}
		it('color', assertColors(createShape))
		it.todo('opacity', assertOpacity(createShape))
		it('size', assertSize(createShape))
		it('font', assertFont(createShape))
		it('align', assertAlign(createShape))
	})
})
