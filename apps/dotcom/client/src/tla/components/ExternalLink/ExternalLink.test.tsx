import { act } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { cookieConsent } from '../../../utils/analytics'
import { getDotDevUrl } from '../../../utils/appOriginLinks'
import { ExternalLink } from './ExternalLink'

const mocks = vi.hoisted(() => ({
	personInfo: undefined as unknown,
	trackEvent: vi.fn(),
}))

vi.mock('../../../utils/analytics', async () => {
	const { atom } = await import('tldraw')
	return {
		cookieConsent: atom<{ analytics: boolean } | null>('test consent', null),
		getPosthogInitialPersonInfo: () => mocks.personInfo,
		trackEvent: mocks.trackEvent,
	}
})

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

const DOT_DEV_URL = getDotDevUrl('sidebar-link')
const PERSON_INFO = { r: 'https://www.google.com/', u: 'https://www.tldraw.com/?utm_source=google' }
const DECORATED_URL =
	'https://tldraw.dev/?utm_source=dotcom&utm_medium=organic&utm_campaign=sidebar-link' +
	'&tl_os=google&tl_or=www.google.com'

const consent = cookieConsent
let root: Root
let container: HTMLDivElement

async function renderLink(to: string) {
	container = document.createElement('div')
	document.body.appendChild(container)
	root = createRoot(container)
	await act(async () =>
		root.render(
			<MemoryRouter>
				<ExternalLink to={to} eventName="test-link-clicked" />
			</MemoryRouter>
		)
	)
	return container.querySelector('a')!
}

beforeEach(() => {
	consent.set(null)
	mocks.personInfo = undefined
	mocks.trackEvent.mockClear()
	// jsdom can't open a new tab; stop it trying.
	document.addEventListener('click', preventNavigation)
})

afterEach(() => {
	act(() => root.unmount())
	container.remove()
	document.removeEventListener('click', preventNavigation)
})

function preventNavigation(e: Event) {
	e.preventDefault()
}

describe('ExternalLink', () => {
	it('renders the plain href without analytics consent', async () => {
		mocks.personInfo = PERSON_INFO
		const link = await renderLink(DOT_DEV_URL)
		expect(link.getAttribute('href')).toBe(DOT_DEV_URL)
	})

	it('updates the href when consent changes', async () => {
		mocks.personInfo = PERSON_INFO
		const link = await renderLink(DOT_DEV_URL)

		await act(async () => consent.set({ analytics: true }))
		expect(link.getAttribute('href')).toBe(DECORATED_URL)

		await act(async () => consent.set({ analytics: false }))
		expect(link.getAttribute('href')).toBe(DOT_DEV_URL)
	})

	it('picks up a first touch PostHog stored after render when the link is followed', async () => {
		consent.set({ analytics: true })
		const link = await renderLink(DOT_DEV_URL)
		expect(link.getAttribute('href')).toBe(DOT_DEV_URL)

		mocks.personInfo = PERSON_INFO
		act(() => link.click())
		expect(link.getAttribute('href')).toBe(DECORATED_URL)
		// Events keep the plain link so reports don't split by visitor.
		expect(mocks.trackEvent).toHaveBeenCalledWith('test-link-clicked', { link: DOT_DEV_URL })
	})

	it('leaves other links alone', async () => {
		consent.set({ analytics: true })
		mocks.personInfo = PERSON_INFO
		const link = await renderLink('https://github.com/tldraw/tldraw/issues')
		act(() => link.click())
		expect(link.getAttribute('href')).toBe('https://github.com/tldraw/tldraw/issues')
	})
})
