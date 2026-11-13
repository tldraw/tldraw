import Cookies from 'js-cookie'
import { createCopyEvent } from '../utils/copy-event'
import { commonRoomService } from './common-room'

vi.mock('../../../../internal/shared/common-room-tracker', () => ({
	CommonRoomTracker: class {
		enable() {
			return true
		}
		disable() {}
		reset() {
			return true
		}
		page() {}
		form() {}
		identify() {}
	},
}))

beforeEach(() => {
	vi.useFakeTimers()
	;(globalThis as any).jsdom.reconfigure({ url: 'https://tldraw.dev/quick-start' })
	commonRoomService.initialize()
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(null, { status: 202 }))
	)
})
afterEach(() => {
	commonRoomService.disable()
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

test('sends metadata only after consent and removes the visitor ID on withdrawal', async () => {
	const event = createCopyEvent({ page_category: 'docs', text_snippet: 'secret text' })
	commonRoomService.trackCopyCode(event)
	expect(fetch).not.toHaveBeenCalled()
	commonRoomService.enable()
	commonRoomService.trackCopyCode(event)
	expect(fetch).toHaveBeenCalledTimes(1)
	const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
	expect(body).toMatchObject({
		event_id: event.event_id,
		event: 'click_copy_code',
		visitor_id: commonRoomService.getCopyVisitorId(),
	})
	expect(JSON.stringify(body)).not.toMatch(/secret text|text_snippet/)
	commonRoomService.disable()
	expect(Cookies.get('tl_copy_visitor')).toBeUndefined()
})

test('retries the same event ID and cancels later attempts on withdrawal', async () => {
	commonRoomService.enable()
	vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }))
	commonRoomService.trackCopyCode(createCopyEvent({ page_category: 'docs', text_snippet: 'code' }))
	await vi.advanceTimersByTimeAsync(1000)
	expect(fetch).toHaveBeenCalledTimes(2)
	expect(vi.mocked(fetch).mock.calls[0][1]!.body).toBe(vi.mocked(fetch).mock.calls[1][1]!.body)
	commonRoomService.disable()
	await vi.advanceTimersByTimeAsync(5000)
	expect(fetch).toHaveBeenCalledTimes(2)
})

test('adopts a replacement ID only for the visitor who submitted the form', () => {
	commonRoomService.enable()
	const previousCopyVisitorId = commonRoomService.getCopyVisitorId()
	const copyVisitorId = crypto.randomUUID()
	commonRoomService.trackFormSubmission({
		enquiry_type: 'sales',
		user_email: 'other@example.com',
		previousCopyVisitorId,
		copyVisitorId,
	})
	expect(commonRoomService.getCopyVisitorId()).toBe(copyVisitorId)
	commonRoomService.reset()
	const resetId = commonRoomService.getCopyVisitorId()
	commonRoomService.trackFormSubmission({
		enquiry_type: 'sales',
		user_email: 'other@example.com',
		previousCopyVisitorId,
		copyVisitorId,
	})
	expect(commonRoomService.getCopyVisitorId()).toBe(resetId)
})
