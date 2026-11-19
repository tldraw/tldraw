import { ga4Service } from './ga4'

afterEach(() => {
	ga4Service.disable()
	ga4Service.dispose()
	delete window.gtag
	delete window.dataLayer
	delete window.TL_GA4_MEASUREMENT_ID
})

test('queues denied consent before the first GA4 config on a fresh page', () => {
	delete window.gtag
	delete window.dataLayer
	window.TL_GA4_MEASUREMENT_ID = 'G-TEST'
	ga4Service.initialize()
	const commands = window.dataLayer!.map((args) => Array.from(args))
	expect(commands[0]).toEqual([
		'consent',
		'default',
		expect.objectContaining({ analytics_storage: 'denied', ad_storage: 'denied' }),
	])
	expect(commands.findIndex((args) => args[0] === 'config')).toBeGreaterThan(0)
})

test('does not attach an identity without analytics consent', () => {
	window.gtag = vi.fn()
	ga4Service.identify('person-123')
	expect(window.gtag).not.toHaveBeenCalled()
	ga4Service.enable()
	ga4Service.identify('person-123')
	expect(window.gtag).toHaveBeenCalledWith('set', { user_id: 'person-123' })
})
