import posthog from 'posthog-js'
import { posthogService } from './posthog'

vi.mock('posthog-js', () => ({
	default: {
		init: vi.fn(),
		opt_in_capturing: vi.fn(),
		opt_out_capturing: vi.fn(),
		setPersonProperties: vi.fn(),
		identify: vi.fn(),
		capture: vi.fn(),
		get_property: vi.fn(),
	},
}))

const submission = {
	enquiry_type: 'business-license',
	prospectId: 'e5707a9e-2487-4d5e-a3a5-e97d0d51bdc3',
	user_email: ' Jane@Example.com ',
	user_first_name: 'Jane',
}

afterEach(() => {
	posthogService.disable()
	vi.resetAllMocks()
})

describe('posthogService.trackFormSubmission', () => {
	test('identifies the submitter by opaque prospect id and records the form', () => {
		posthogService.enable()
		posthogService.trackFormSubmission(submission)

		expect(posthog.identify).toHaveBeenCalledWith(submission.prospectId, {
			email: 'jane@example.com',
		})
		expect(posthog.capture).toHaveBeenCalledWith('form submitted', { form: 'business-license' })
	})

	test('does not identify without analytics consent', () => {
		posthogService.trackFormSubmission(submission)

		expect(posthog.identify).not.toHaveBeenCalled()
		expect(posthog.capture).toHaveBeenCalledWith('form submitted', { form: 'business-license' })
	})
})

test.each([undefined, 'jane@example.com', 'invalid'])(
	'does not identify an invalid prospect ID (%s)',
	(prospectId) => {
		posthogService.enable()
		posthogService.trackFormSubmission({ ...submission, prospectId })
		expect(posthog.identify).not.toHaveBeenCalled()
	}
)
test('preserves an existing account identity when a form email differs', () => {
	posthogService.enable()
	vi.mocked(posthog.get_property).mockReturnValue('account-123')
	posthogService.trackFormSubmission(submission)
	expect(posthog.identify).not.toHaveBeenCalled()
	expect(posthog.capture).toHaveBeenCalledWith('form submitted', { form: 'business-license' })
})
