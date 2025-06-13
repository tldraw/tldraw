import { PathBuilder } from './PathBuilder'

describe('PathBuilder', () => {
	describe('toSvg', () => {
		it('should build an SVG path', () => {
			const path = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.circularArcTo(50, false, false, 100, 100)
				.toSvg({ strokeWidth: 1, style: 'solid' })

			expect(path).toMatchInlineSnapshot(`
			<path
			  d="M 0 0 L 100 100 L 100 0 C 72.3858 0 50 22.3858 50 50 C 50 77.6142 72.3858 100 100 100"
			  strokeWidth={1}
			/>
		`)

			const closed = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.circularArcTo(50, false, false, 0, 100)
				.close()
				.toSvg({ strokeWidth: 1, style: 'solid' })

			expect(closed).toMatchInlineSnapshot(`
			<path
			  d="M 0 0 L 100 100 L 100 0 C 72.3858 -27.6142 27.6142 -27.6142 0 0 C -27.6142 27.6142 -27.6142 72.3858 0 100 Z"
			  strokeWidth={1}
			/>
		`)
		})
		it('should support dashed paths', () => {
			const path = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.circularArcTo(50, false, false, 0, 100)
				.toSvg({ strokeWidth: 1, style: 'dashed' })

			expect(path).toMatchInlineSnapshot(`
			<g
			  strokeWidth={1}
			>
			  <path
			    d="M 0 0 L 100 100"
			    strokeDasharray="2.034590803390136 2.0944317093721985"
			    strokeDashoffset="0"
			  />
			  <path
			    d="M 100 100 L 100 0"
			    strokeDasharray="2.04 2.125"
			    strokeDashoffset="1"
			  />
			  <path
			    d="M 100 0 C 72.3858 -27.6142 27.6142 -27.6142 0 0 C -27.6142 27.6142 -27.6142 72.3858 0 100"
			    strokeDasharray="2.028867081195371 2.0664386938101"
			    strokeDashoffset="1"
			  />
			</g>
		`)
			const closed = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.circularArcTo(50, false, false, 0, 100)
				.close()
				.toSvg({ strokeWidth: 1, style: 'dashed' })

			expect(closed).toMatchInlineSnapshot(`
			<g
			  strokeWidth={1}
			>
			  <path
			    d="M 0 0 L 100 100"
			    strokeDasharray="2.04887651767585 2.10913759172514"
			    strokeDashoffset="1"
			  />
			  <path
			    d="M 100 100 L 100 0"
			    strokeDasharray="2.04 2.125"
			    strokeDashoffset="1"
			  />
			  <path
			    d="M 100 0 C 72.3858 -27.6142 27.6142 -27.6142 0 0 C -27.6142 27.6142 -27.6142 72.3858 0 100"
			    strokeDasharray="2.001565883316882 2.03795799028628"
			    strokeDashoffset="1"
			  />
			  <path
			    d="M 0 100 L 0 0"
			    strokeDasharray="2.0399999999999996 2.1249999999999996"
			    strokeDashoffset="1"
			  />
			</g>
		`)
		})
		it('should support draw paths', () => {
			const path = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.circularArcTo(50, false, false, 0, 100)
				.toSvg({ strokeWidth: 10, style: 'draw', randomSeed: '123' })

			expect(path).toMatchInlineSnapshot(`
			<path
			  d="M 1.6479 1.9547 L 93.8229 93.8006 Q 100.8939 100.8717 100.8939 90.8717 L 100.9 0.5128 C 70.2895 -25.705 25.518 -25.705 -2.0962 1.9093 C -26.8794 24.5012 -26.8794 69.2727 0.7349 96.8869 M 2.9315 3.0157 L 94.1973 93.0354 Q 101.2684 100.1065 101.2684 90.1065 L 99.3236 -0.0235 C 75.199 -28.4858 30.4275 -28.4858 2.8132 -0.8716 C -27.3141 28.8687 -27.3141 73.6402 0.3001 101.2544"
			  strokeWidth={10}
			/>
		`)
			const closed = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.circularArcTo(50, false, false, 0, 100)
				.close()
				.toSvg({ strokeWidth: 10, style: 'draw', randomSeed: '123' })

			expect(closed).toMatchInlineSnapshot(`
			<path
			  d="M 8.719 9.0257 L 93.8229 93.8006 Q 100.8939 100.8717 100.8939 90.8717 L 100.9 0.5128 C 70.2895 -25.705 25.518 -25.705 -2.0962 1.9093 C -26.8794 24.5012 -26.8794 69.2727 0.7349 96.8869 L 1.6479 11.9547 Q 1.6479 1.9547 8.719 9.0257 M 10.0026 10.0867 L 94.1973 93.0354 Q 101.2684 100.1065 101.2684 90.1065 L 99.3236 -0.0235 C 75.199 -28.4858 30.4275 -28.4858 2.8132 -0.8716 C -27.3141 28.8687 -27.3141 73.6402 0.3001 101.2544 L 2.9315 13.0157 Q 2.9315 3.0157 10.0026 10.0867"
			  strokeWidth={10}
			/>
		`)
		})
	})

	describe('toGeometry', () => {
		it('should combine multiple lineTos into a single line', () => {
			const geometry = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.circularArcTo(50, false, false, 0, 100)
				.close()
				.toGeometry()

			expect(geometry?.toSimpleSvgPath()).toMatchInlineSnapshot(
				`"M0,0L100,100L100,0L91.23532468849007,-7.455843959357096L81.64709960511827,-13.25483368860933L71.44121219537817,-17.39696918901332L60.82354990476352,-19.882250461825734L50.000000178767834,-20.71067750830319L39.17645046288481,-19.882250329702327L28.558788202608024,-17.396968927279783L18.35290084343114,-13.254833302292194L8.764675830847777,-7.455843455996203L6.103515630684342e-7,6.103515559630068e-7L-7.4558434559962,8.764675830847771L-13.254833302292194,18.35290084343114L-17.396968927279772,28.55878820260801L-19.882250329702327,39.17645046288479L-20.710677508303192,50.00000017876782L-19.88225046182574,60.823549904763496L-17.39696918901333,71.44121219537817L-13.254833688609331,81.64709960511824L-7.455843959357106,91.23532468849007L-1.4210854715202004e-14,99.99999999999999L0,0Z"`
			)
		})
	})
})
