import { ArrowDirection } from './constants'

export function dirToString(dir: ArrowDirection) {
	if (dir.x === 1 && dir.y === 0) {
		return 'right'
	} else if (dir.x === -1 && dir.y === 0) {
		return 'left'
	} else if (dir.x === 0 && dir.y === 1) {
		return 'down'
	} else if (dir.x === 0 && dir.y === -1) {
		return 'up'
	}

	return 'unknown'
}
