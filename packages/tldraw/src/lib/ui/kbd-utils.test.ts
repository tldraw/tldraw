import { kbd } from './kbd-utils'

describe('kbd', () => {
	it('displays a comma key with modifiers', () => {
		expect(kbd('shift+,,shift+alt+,')).toEqual([...kbd('shift+.').slice(0, -1), ','])
	})

	it('preserves spaces in atomic key labels', () => {
		expect(kbd('[[Page Up]]')).toEqual(['Page Up'])
	})

	it('renders a doubled trailing + as a + keycap', () => {
		// Platform-agnostic: same modifier prefix as cmd+=, then the + glyph.
		expect(kbd('cmd++')).toEqual([...kbd('cmd+=').slice(0, -1), '+'])
		expect(kbd('cmd+alt+shift++')).toEqual([...kbd('cmd+alt+shift+=').slice(0, -1), '+'])
		expect(kbd('+')).toEqual(['+'])
	})

	it('renders an atomic [[+]] as a + keycap', () => {
		expect(kbd('cmd+[[+]]')).toEqual(kbd('cmd++'))
	})

	it('still renders a shifted glyph as written', () => {
		expect(kbd('shift+:')).toEqual([...kbd('shift+.').slice(0, -1), ':'])
		expect(kbd('cmd+=')).toEqual([...kbd('cmd+-').slice(0, -1), '='])
	})
})
