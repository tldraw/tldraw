import { PathBuilder } from './PathBuilder'

describe('PathBuilder', () => {
	describe('toSvg', () => {
		it('should build an SVG path', () => {
			const path = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.arcTo(50, false, false, 0, 100)
				.toSvg({ strokeWidth: 1, style: 'solid' })

			expect(path).toMatchInlineSnapshot(`
			<path
			  d="M 0 0 L 100 100 L 100 0 A 50 50 0 0 0 0 100"
			  strokeWidth={1}
			/>
		`)

			const closed = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.arcTo(50, false, false, 0, 100)
				.close()
				.toSvg({ strokeWidth: 1, style: 'solid' })

			expect(closed).toMatchInlineSnapshot(`
			<path
			  d="M 0 0 L 100 100 L 100 0 A 50 50 0 0 0 0 100 Z"
			  strokeWidth={1}
			/>
		`)
		})
		it('should support dashed paths', () => {
			const path = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.arcTo(50, false, false, 0, 100)
				.toSvg({ strokeWidth: 1, style: 'dashed' })

			expect(path).toMatchInlineSnapshot(`
			<g
			  strokeWidth={1}
			>
			  <line
			    strokeDasharray="2.04887651767585 2.10913759172514"
			    strokeDashoffset="1"
			    x1={0}
			    x2={100}
			    y1={0}
			    y2={100}
			  />
			  <line
			    strokeDasharray="2.04 2.125"
			    strokeDashoffset="1"
			    x1={100}
			    x2={100}
			    y1={100}
			    y2={0}
			  />
			  <path
			    d="M 100 0 A 50 50 0 0 0 0 100"
			    strokeDasharray="2.0012870259635562 2.0376740627992573"
			    strokeDashoffset="1"
			  />
			</g>
		`)
			const closed = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.arcTo(50, false, false, 0, 100)
				.close()
				.toSvg({ strokeWidth: 1, style: 'dashed' })

			expect(closed).toMatchInlineSnapshot(`
			<g
			  strokeWidth={1}
			>
			  <line
			    strokeDasharray="2.034590803390136 2.0944317093721985"
			    strokeDashoffset="0"
			    x1={0}
			    x2={100}
			    y1={0}
			    y2={100}
			  />
			  <line
			    strokeDasharray="2.04 2.125"
			    strokeDashoffset="1"
			    x1={100}
			    x2={100}
			    y1={100}
			    y2={0}
			  />
			  <path
			    d="M 100 0 A 50 50 0 0 0 0 100"
			    strokeDasharray="2.0012870259635562 2.0376740627992573"
			    strokeDashoffset="1"
			  />
			  <line
			    strokeDasharray="2.02 2.1041666666666665"
			    strokeDashoffset="1"
			    x1={0}
			    x2={0}
			    y1={100}
			    y2={0}
			  />
			</g>
		`)
		})
		it('should support draw paths', () => {
			const path = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.arcTo(50, false, false, 0, 100)
				.toSvg({ strokeWidth: 10, style: 'draw', randomSeed: '123' })

			expect(path).toMatchInlineSnapshot(`
			<path
			  d="M 3.1633 3.2337 L 85.161 87.1249 Q 99.1408 101.4276 98.7344 81.4317 L 97.4275 17.1345 Q 97.021 -2.8613 83.426 11.8075 A 50 50 0 0 0 2.4438 99.1866 M -2.0501 -0.9019 L 87.1947 84.5713 Q 101.6388 98.4049 101.652 78.4049 L 101.6888 22.8567 Q 101.702 2.8567 87.3467 16.7824 A 50 50 0 0 0 0.8866 100.6553"
			  strokeWidth={10}
			/>
		`)
			const closed = new PathBuilder()
				.moveTo(0, 0)
				.lineTo(100, 100)
				.lineTo(100, 0)
				.arcTo(50, false, false, 0, 100)
				.close()
				.toSvg({ strokeWidth: 10, style: 'draw', randomSeed: '123' })

			expect(closed).toMatchInlineSnapshot(`
			<path
			  d="M 17.1431 17.5363 L 85.161 87.1249 Q 99.1408 101.4276 98.7344 81.4317 L 97.4275 17.1345 Q 97.021 -2.8613 83.426 11.8075 A 50 50 0 0 0 2.4438 99.1866 L 3.0133 23.2331 Q 3.1633 3.2337 17.1431 17.5363 Z M 12.3939 12.9317 L 87.1947 84.5713 Q 101.6388 98.4049 101.652 78.4049 L 101.6888 22.8567 Q 101.702 2.8567 87.3467 16.7824 A 50 50 0 0 0 0.8866 100.6553 L -1.472 19.0898 Q -2.0501 -0.9019 12.3939 12.9317 Z"
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
				.arcTo(50, false, false, 0, 100)
				.close()
				.toGeometry()

			expect(geometry?.toSimpleSvgPath()).toMatchInlineSnapshot(
				`"M0,0L100,100L100,0L100,0L85.35533905932738,-11.237243569579448L68.30127018922194,-18.301270189221924L50.00000000000001,-20.71067811865474L31.698729810778072,-18.301270189221924L14.644660940672622,-11.237243569579448L0,0L-11.237243569579462,14.64466094067263L-18.30127018922191,31.698729810778058L-20.71067811865474,49.99999999999999L-18.301270189221924,68.30127018922194L-11.237243569579462,85.35533905932735L-7.105427357601002e-15,100Z"`
			)
		})
	})
})
