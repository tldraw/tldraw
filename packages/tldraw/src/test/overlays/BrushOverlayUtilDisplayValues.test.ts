import { getOverlayDisplayValues } from '@tldraw/editor'
import { defaultOverlayUtils } from '../../lib/defaultOverlayUtils'
import { BrushOverlayUtil } from '../../lib/overlays/BrushOverlayUtil'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ overlayUtils: defaultOverlayUtils })
	editor.user.updateUserPreferences({ colorScheme: 'light' })
})

afterEach(() => {
	editor?.dispose()
})

function getBrushOverlay() {
	editor.updateInstanceState({ brush: { x: 0, y: 0, w: 10, h: 10 } })
	const util = editor.overlays.getOverlayUtil<BrushOverlayUtil>('brush')
	const overlay = util.getOverlays()[0]
	return { util, overlay }
}

describe('BrushOverlayUtil display values', () => {
	it('resolves brush colors from theme', () => {
		const { util, overlay } = getBrushOverlay()
		const dv = getOverlayDisplayValues(util, overlay)
		expect(dv.fillColor).toBe('hsl(0, 0%, 56%, 10.2%)')
		expect(dv.strokeColor).toBe('hsl(0, 0%, 56%, 25.1%)')
		expect(dv.lineWidth).toBe(1)
	})

	it('configure() override of lineWidth flows to display values', () => {
		const Configured = BrushOverlayUtil.configure({
			getCustomDisplayValues() {
				return { lineWidth: 5 }
			},
		})
		editor.dispose()
		editor = new TestEditor({
			overlayUtils: [...defaultOverlayUtils].map((u) => (u === BrushOverlayUtil ? Configured : u)),
		})
		const { util, overlay } = getBrushOverlay()
		const dv = getOverlayDisplayValues(util, overlay)
		expect(dv.lineWidth).toBe(5)
		// untouched defaults still apply
		expect(dv.fillColor).toBe('hsl(0, 0%, 56%, 10.2%)')
	})

	it('configure() override of fillColor flows to display values', () => {
		const Configured = BrushOverlayUtil.configure({
			getCustomDisplayValues() {
				return { fillColor: '#CUSTOM_FILL' }
			},
		})
		editor.dispose()
		editor = new TestEditor({
			overlayUtils: [...defaultOverlayUtils].map((u) => (u === BrushOverlayUtil ? Configured : u)),
		})
		const { util, overlay } = getBrushOverlay()
		const dv = getOverlayDisplayValues(util, overlay)
		expect(dv.fillColor).toBe('#CUSTOM_FILL')
	})

	it('caches by overlay identity for the same theme/colorMode', () => {
		const { util, overlay } = getBrushOverlay()
		const dv1 = getOverlayDisplayValues(util, overlay)
		const dv2 = getOverlayDisplayValues(util, overlay)
		expect(dv1).toBe(dv2)
	})

	it('invalidates when colorMode changes', () => {
		const { util, overlay } = getBrushOverlay()
		const lightDv = getOverlayDisplayValues(util, overlay)
		editor.user.updateUserPreferences({ colorScheme: 'dark' })
		const darkDv = getOverlayDisplayValues(util, overlay)
		expect(darkDv).not.toBe(lightDv)
	})

	it('invalidates when theme is updated', () => {
		const { util, overlay } = getBrushOverlay()
		const dv1 = getOverlayDisplayValues(util, overlay)
		editor.updateTheme({
			...editor.getTheme('default')!,
			colors: {
				...editor.getTheme('default')!.colors,
				light: {
					...editor.getTheme('default')!.colors.light,
					brushFill: '#NEW_FILL',
				},
			},
		})
		const dv2 = getOverlayDisplayValues(util, overlay)
		expect(dv2).not.toBe(dv1)
		expect(dv2.fillColor).toBe('#NEW_FILL')
	})
})
