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
				  d="M 0.0451 2.5522 L 94.0635 94.2011 Q 101.1345 101.2722 101.1345 91.2722 L 100.8646 0.9807 C 71.3921 -29.933 26.6206 -29.933 -0.9937 -2.3188 C -25.1352 29.6712 -25.1352 74.4427 2.4791 102.057 M -2.9459 1.1721 L 93.1474 93.4832 Q 100.2184 100.5543 100.2184 90.5543 L 100.2251 -0.1667 C 70.882 -26.8118 26.1105 -26.8118 -1.5038 0.8025 C -25.6506 28.1849 -25.6506 72.9565 1.9636 100.5707"
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
				  d="M 7.1162 9.6232 L 94.0635 94.2011 Q 101.1345 101.2722 101.1345 91.2722 L 100.8646 0.9807 C 71.3921 -29.933 26.6206 -29.933 -0.9937 -2.3188 C -25.1352 29.6712 -25.1352 74.4427 2.4791 102.057 L 0.0451 12.5522 Q 0.0451 2.5522 7.1162 9.6232 M 4.1251 8.2432 L 93.1474 93.4832 Q 100.2184 100.5543 100.2184 90.5543 L 100.2251 -0.1667 C 70.882 -26.8118 26.1105 -26.8118 -1.5038 0.8025 C -25.6506 28.1849 -25.6506 72.9565 1.9636 100.5707 L -2.9459 11.1721 Q -2.9459 1.1721 4.1251 8.2432"
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
				`"M0,0L100,100L100,0L84.92197106154207,-11.50593202657044L67.93757691512266,-18.409491194065584L50.000000178767834,-20.71067750830319L32.06242347050369,-18.409490975101022L15.078029408356239,-11.505931600276853L6.103515630684342e-7,6.103515559630068e-7L-11.505931600276849,15.078029408356231L-18.409490975101022,32.062423470503674L-20.710677508303192,50.00000017876782L-18.409491194065588,67.93757691512262L-11.50593202657045,84.92197106154204L-1.4210854715202004e-14,99.99999999999999L0,0Z"`
			)
		})
	})
})
