import { CommonRoomTracker } from '../../../../internal/shared/common-room-tracker'

vi.mock('../../../../internal/shared/common-room-signals', () => ({ COMMON_ROOM_SNIPPET: '' }))

test('preserves the referring website in the isolated tracking document', () => {
	const tracker = new CommonRoomTracker()
	const referrer = vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.google.com/')
	let vendorReferrer: string | undefined
	// bind selects the deprecated string-options overload; calls below use ElementCreationOptions.
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	const create = document.createElement.bind(document)
	const createElement = vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
		const element = create(tag, options)
		if (tag === 'iframe') {
			const append = document.body.appendChild.bind(document.body)
			vi.spyOn(document.body, 'appendChild').mockImplementationOnce((child) => {
				const result = append(child)
				const frameDocument = (element as HTMLIFrameElement).contentDocument!
				vi.spyOn(
					(element as HTMLIFrameElement).contentWindow!.history,
					'replaceState'
				).mockImplementation(() => {})
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				const createFrameElement = frameDocument.createElement.bind(frameDocument)
				vi.spyOn(frameDocument, 'createElement').mockImplementation((frameTag, frameOptions) => {
					if (frameTag === 'script') vendorReferrer = frameDocument.referrer
					return createFrameElement(frameTag, frameOptions)
				})
				return result
			})
		}
		return element
	})
	try {
		tracker.enable()
		expect(vendorReferrer).toBe('https://www.google.com/')
	} finally {
		tracker.disable()
		createElement.mockRestore()
		referrer.mockRestore()
		vi.restoreAllMocks()
	}
})
