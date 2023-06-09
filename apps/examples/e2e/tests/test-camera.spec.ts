import test from '@playwright/test'
import { setup } from '../shared-e2e'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

test.describe('camera', () => {
	test.beforeEach(setup)

	test.fixme('panning', () => {
		// todo
	})

	test.fixme('pinching', () => {
		// todo
	})

	test.fixme('minimap', () => {
		// todo
	})

	test.fixme('hand tool', () => {
		// todo
	})
})
