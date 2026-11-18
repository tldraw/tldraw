import { TestEditor } from '../../test/TestEditor'
import { getLinkOpenPolicy, openLink } from './openLink'

describe('getLinkOpenPolicy', () => {
	it.each([
		'https://tldraw.com',
		'HTTP://tldraw.com',
		'mailto:hello@tldraw.com',
		'/relative/path',
		'./relative/path',
		'vscode://file/src/index.ts',
		'Slack://channel?id=1',
		'figma:design/123',
	])('opens %j', (url) => {
		expect(getLinkOpenPolicy(url)).toBe('open')
	})

	it.each(['chatgpt://chat/123', 'tel:5551234', 'some-new-app://thing'])(
		'asks before opening an unknown app link: %j',
		(url) => {
			expect(getLinkOpenPolicy(url)).toBe('confirm')
		}
	)

	it.each([
		'',
		'javascript:alert(1)',
		'JavaScript:alert(1)',
		'data:text/html,hi',
		'file:///etc',
		'ms-msdt:x',
		'localhost:3000',
		'not a url',
	])('blocks %j', (url) => {
		expect(getLinkOpenPolicy(url)).toBe('block')
	})
})

describe('openLink', () => {
	let editor: TestEditor
	let open: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		editor = new TestEditor()
		open = vi.spyOn(window, 'open').mockImplementation(() => null)
	})

	afterEach(() => {
		open.mockRestore()
	})

	it('opens a trusted link straight away', () => {
		const onConfirm = vi.fn()
		editor.on('confirm-open-link', onConfirm)
		openLink(editor, 'vscode://file/src/index.ts')
		expect(open).toHaveBeenCalledWith('vscode://file/src/index.ts', '_blank', 'noopener noreferrer')
		expect(onConfirm).not.toHaveBeenCalled()
	})

	it('asks the listener to confirm an unknown app link instead of opening it', () => {
		const onConfirm = vi.fn()
		editor.on('confirm-open-link', onConfirm)
		openLink(editor, 'chatgpt://chat/123')
		expect(onConfirm).toHaveBeenCalledWith({ url: 'chatgpt://chat/123' })
		expect(open).not.toHaveBeenCalled()
	})

	it('does not open an unknown app link when nothing can confirm it', () => {
		openLink(editor, 'chatgpt://chat/123')
		expect(open).not.toHaveBeenCalled()
	})

	it('never opens a blocked link', () => {
		const onConfirm = vi.fn()
		editor.on('confirm-open-link', onConfirm)
		openLink(editor, 'javascript:alert(1)')
		expect(open).not.toHaveBeenCalled()
		expect(onConfirm).not.toHaveBeenCalled()
	})
})
