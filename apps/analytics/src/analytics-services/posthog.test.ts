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
	},
}))

const submission = {
	enquiry_type: 'business-license',
	user_email: ' Jane@Example.com ',
	user_first_name: 'Jane',
}

afterEach(() => {
	posthogService.disable()
	vi.clearAllMocks()
})

describe('posthogService.trackFormSubmission', () => {
	test('identifies the submitter by email and records the form', () => {
		posthogService.enable()
		posthogService.trackFormSubmission(submission)

		expect(posthog.identify).toHaveBeenCalledWith('jane@example.com', { email: 'jane@example.com' })
		expect(posthog.capture).toHaveBeenCalledWith('form submitted', { form: 'business-license' })
	})

	test('does not identify without analytics consent', () => {
		posthogService.trackFormSubmission(submission)

		expect(posthog.identify).not.toHaveBeenCalled()
		expect(posthog.capture).toHaveBeenCalledWith('form submitted', { form: 'business-license' })
	})
})
