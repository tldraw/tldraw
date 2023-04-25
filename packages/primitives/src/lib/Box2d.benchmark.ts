import Benchmark from 'benchmark'
import { Box2d } from './Box2d'

const suites = [
	new Benchmark('Box2d#corners()', () => {
		const box = new Box2d(0, 0, 100, 100)
		box.corners
	}),
	new Benchmark('Box2d.ExpandBy()', () => {
		const box = new Box2d(0, 0, 100, 100)
		Box2d.ExpandBy(box, 10)
	}),
]
export default suites
