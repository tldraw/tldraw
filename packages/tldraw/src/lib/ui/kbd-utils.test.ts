import { kbd } from './kbd-utils'

describe('kbd', () => {
	it('displays a comma key with modifiers', () => {
		expect(kbd('shift+,,shift+alt+,')).toEqual([...kbd('shift+.').slice(0, -1), ','])
	})

	it('preserves spaces in atomic key labels', () => {
		expect(kbd('[[Page Up]]')).toEqual(['Page Up'])
	})
})
