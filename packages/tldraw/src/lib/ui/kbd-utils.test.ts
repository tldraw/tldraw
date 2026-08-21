import { tlenv } from '@tldraw/editor'
import { kbd } from './kbd-utils'

describe('kbd', () => {
	const isDarwin = tlenv.isDarwin
	afterEach(() => {
		tlenv.isDarwin = isDarwin
	})

	it('displays a comma key with modifiers', () => {
		expect(kbd('shift+,,shift+alt+,')).toEqual([...kbd('shift+.').slice(0, -1), ','])
	})

	it('preserves spaces in atomic key labels', () => {
		expect(kbd('[[Page Up]]')).toEqual(['Page Up'])
	})

	it('renders modifiers as glyphs on mac', () => {
		tlenv.isDarwin = true
		expect(kbd('cmd+shift+z')).toEqual(['⌘', '⇧', 'Z'])
		expect(kbd('$!z')).toEqual(['⌘', '⇧', 'Z'])
	})

	it('writes every modifier out as a word on windows', () => {
		tlenv.isDarwin = false
		expect(kbd('cmd+shift+z')).toEqual(['Ctrl', '+', 'Shift', '+', 'Z'])
		expect(kbd('shift+alt+.')).toEqual(['Shift', '+', 'Alt', '+', '.'])
		expect(kbd('$!z')).toEqual(['Ctrl', '+', 'Shift', '+', 'Z'])
	})
})
