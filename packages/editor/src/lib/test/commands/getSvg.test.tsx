import { DefaultDashStyle, createShapeId } from '@tldraw/tlschema'
import { SVG_PADDING } from '../../constants'
import { TestEditor } from '../TestEditor'
import { TL } from '../jsx'

let editor: TestEditor

describe('basic getSvg tests', () => {
	const ids = {
		boxA: createShapeId('boxA'),
		boxB: createShapeId('boxB'),
		boxC: createShapeId('boxC'),
	}

	beforeEach(() => {
		editor = new TestEditor()
		editor.setStyle(DefaultDashStyle, 'solid')
		editor.createShapes([
			{
				id: ids.boxA,
				type: 'geo',
				x: 0,
				y: 0,
				props: {
					w: 100,
					h: 100,
					text: 'Hello world',
				},
			},
			{
				id: ids.boxB,
				type: 'geo',
				x: 100,
				y: 100,
				props: {
					w: 50,
					h: 50,
				},
			},
			{
				id: ids.boxC,
				type: 'geo',
				x: 400,
				y: 400,
				props: {
					w: 100,
					h: 100,
				},
			},
		])
		editor.selectAll()
	})

	it('gets an SVG', async () => {
		const svg = await editor.getSvg(editor.selectedIds)

		expect(svg).toBeTruthy()
	})

	it('Does not get an SVG when no ids are provided', async () => {
		const svg = await editor.getSvg([])

		expect(svg).toBeFalsy()
	})

	it('Gets the bounding box at the correct size', async () => {
		const svg = await editor.getSvg(editor.selectedIds)
		const bbox = editor.selectionBounds!
		const expanded = bbox.expandBy(SVG_PADDING) // adds 32px padding

		expect(svg!.getAttribute('width')).toMatch(expanded.width + '')
		expect(svg!.getAttribute('height')).toMatch(expanded.height + '')
	})

	it('Gets the bounding box at the correct size', async () => {
		const svg = (await editor.getSvg(editor.selectedIds))!
		const bbox = editor.selectionBounds!
		const expanded = bbox.expandBy(SVG_PADDING) // adds 32px padding

		expect(svg!.getAttribute('width')).toMatch(expanded.width + '')
		expect(svg!.getAttribute('height')).toMatch(expanded.height + '')
	})

	it('Matches a snapshot', async () => {
		const svg = (await editor.getSvg(editor.selectedIds))!

		const elm = document.createElement('wrapper')
		elm.appendChild(svg)

		expect(elm).toMatchSnapshot('Basic SVG')
	})

	it('Accepts a scale option', async () => {
		const svg1 = (await editor.getSvg(editor.selectedIds, { scale: 1 }))!

		expect(svg1.getAttribute('width')).toBe('564')

		const svg2 = (await editor.getSvg(editor.selectedIds, { scale: 2 }))!

		expect(svg2.getAttribute('width')).toBe('1128')
	})

	it('Accepts a background option', async () => {
		const svg1 = (await editor.getSvg(editor.selectedIds, { background: true }))!

		expect(svg1.style.backgroundColor).not.toBe('transparent')

		const svg2 = (await editor.getSvg(editor.selectedIds, { background: false }))!

		expect(svg2.style.backgroundColor).toBe('transparent')
	})
})

describe('getSvg font handling', () => {
	it('includes used fonts from the default style', async () => {
		const editor = new TestEditor()
		editor.setStyle(DefaultDashStyle, 'solid')

		const ids = editor.createShapesFromJsx([
			<TL.text x={0} y={0} w={100} text="Hello world" font="draw" />,
			<TL.geo x={100} y={100} w={50} h={50} text="geo shape text" font="mono" />,
		])

		const svg = await editor.getSvg([...editor.shapeIds])
		expect(svg).toMatchInlineSnapshot(`
		<svg
		  direction="ltr"
		  height="218"
		  stroke-linecap="round"
		  stroke-linejoin="round"
		  style="background-color: transparent;"
		  viewBox="-32 -32 214 218"
		  width="214"
		>
		  <defs>
		    <mask
		      id="hash_pattern_mask"
		    >
		      
							
		      <rect
		        fill="white"
		        height="8"
		        width="8"
		        x="0"
		        y="0"
		      />
		      
							
		      <g
		        stroke="black"
		        strokelinecap="round"
		      >
		        
								
		        <line
		          x1="0.6666666666666666"
		          x2="2"
		          y1="2"
		          y2="0.6666666666666666"
		        />
		        
								
		        <line
		          x1="3.333333333333333"
		          x2="4.666666666666666"
		          y1="4.666666666666666"
		          y2="3.333333333333333"
		        />
		        
								
		        <line
		          x1="6"
		          x2="7.333333333333333"
		          y1="7.333333333333333"
		          y2="6"
		        />
		        
							
		      </g>
		      
						
		    </mask>
		    <pattern
		      height="8"
		      id="hash_pattern"
		      patternUnits="userSpaceOnUse"
		      width="8"
		    >
		      
							
		      <rect
		        fill=""
		        height="8"
		        mask="url(#hash_pattern_mask)"
		        width="8"
		        x="0"
		        y="0"
		      />
		      
						
		    </pattern>
		    <style />
		  </defs>
		  <g
		    opacity="1"
		    transform="matrix(1, 0, 0, 1, 0, 0)"
		  >
		    <g>
		      <text
		        alignment-baseline="mathematical"
		        dominant-baseline="mathematical"
		        font-family=""
		        font-size="24px"
		        font-style="normal"
		        font-weight="normal"
		        line-height="32.400000000000006px"
		      >
		        <tspan
		          alignment-baseline="mathematical"
		          x="0px"
		          y="-1572px"
		        >
		          Hello world
		        </tspan>
		      </text>
		      <text
		        alignment-baseline="mathematical"
		        dominant-baseline="mathematical"
		        fill=""
		        font-family=""
		        font-size="24px"
		        font-style="normal"
		        font-weight="normal"
		        line-height="32.400000000000006px"
		        stroke="none"
		      >
		        <tspan
		          alignment-baseline="mathematical"
		          x="0px"
		          y="-1572px"
		        >
		          Hello world
		        </tspan>
		      </text>
		    </g>
		  </g>
		  <g
		    opacity="1"
		    transform="matrix(1, 0, 0, 1, 100, 100)"
		  >
		    <g>
		      <path
		        d="M0, 0L50, 0,50, 54,0, 54Z"
		        fill="none"
		        stroke=""
		        stroke-width="3.5"
		      />
		      <g>
		        <text
		          alignment-baseline="mathematical"
		          dominant-baseline="mathematical"
		          fill=""
		          font-family=""
		          font-size="22px"
		          font-style="normal"
		          font-weight="normal"
		          line-height="29.700000000000003px"
		          stroke=""
		          stroke-width="2"
		        >
		          <tspan
		            alignment-baseline="mathematical"
		            x="16px"
		            y="-17px"
		          >
		            geo shape text
		          </tspan>
		        </text>
		        <text
		          alignment-baseline="mathematical"
		          dominant-baseline="mathematical"
		          fill=""
		          font-family=""
		          font-size="22px"
		          font-style="normal"
		          font-weight="normal"
		          line-height="29.700000000000003px"
		          stroke="none"
		        >
		          <tspan
		            alignment-baseline="mathematical"
		            x="16px"
		            y="-17px"
		          >
		            geo shape text
		          </tspan>
		        </text>
		      </g>
		    </g>
		  </g>
		</svg>
	`)
	})
})
