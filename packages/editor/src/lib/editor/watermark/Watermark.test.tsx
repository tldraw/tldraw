import { render } from '@testing-library/react'
import { ReactElement } from 'react'
import { TldrawEditor } from '../../TldrawEditor'

async function renderTldrawEditorComponent(
	element: ReactElement,
	{ waitForPatterns }: { waitForPatterns: boolean }
) {
	const result = render(element)
	if (waitForPatterns) await result.findByTestId('canvas')
	return result
}

describe('<Tldraw />', () => {
	it('Renders without crashing', async () => {
		await renderTldrawEditorComponent(<TldrawEditor />, { waitForPatterns: true })
	})
})

// function getDefaultLicenseResult(overrides: Partial<ValidLicenseKeyResult>): ValidLicenseKeyResult {
// 	return {
// 		isAnnualLicense: true,
// 		isAnnualLicenseExpired: false,
// 		isInternalLicense: false,
// 		isDevelopment: false,
// 		isDomainValid: true,
// 		isPerpetualLicense: false,
// 		isPerpetualLicenseExpired: false,
// 		isLicenseParseable: true as const,
// 		// WatermarkManager does not check these fields, it relies on the calculated values like isAnnualLicenseExpired
// 		license: {
// 			id: 'id',
// 			hosts: ['localhost'],
// 			flags: FLAGS.PERPETUAL_LICENSE,
// 			expiryDate: new Date().toISOString(),
// 		},
// 		expiryDate: new Date(),
// 		...overrides,
// 	}
// }

// describe('WatermarkManager', () => {
// 	let watermarkManager: WatermarkManager
// 	let editor: Editor
// 	beforeAll(() => {
// 		editor = new Editor({
// 			store: createTLStore({}),
// 			bindingUtils: [],
// 			shapeUtils: [],
// 			getContainer: () => document.createElement('div'),
// 			tools: [],
// 		})
// 		watermarkManager = new WatermarkManager(editor)
// 	})

// 	it('shows watermark when license is not parseable', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			// @ts-ignore
// 			isLicenseParseable: false,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(true)
// 	})

// 	it('shows watermark when domain is not valid', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isDomainValid: false,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(true)
// 	})

// 	it('shows watermark when annual license has expired', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isAnnualLicense: true,
// 			isAnnualLicenseExpired: true,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(true)
// 	})

// 	it('shows watermark when annual license has expired, even if dev mode', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isAnnualLicense: true,
// 			isAnnualLicenseExpired: true,
// 			isDevelopment: true,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(true)
// 	})

// 	it('shows watermark when perpetual license has expired', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isPerpetualLicense: true,
// 			isPerpetualLicenseExpired: true,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(true)
// 	})

// 	it('does not show watermark when license is valid and not expired', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isAnnualLicense: true,
// 			isAnnualLicenseExpired: false,
// 			isInternalLicense: false,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(false)
// 	})

// 	it('does not show watermark when perpetual license is valid and not expired', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isPerpetualLicense: true,
// 			isPerpetualLicenseExpired: false,
// 			isInternalLicense: false,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(false)
// 	})

// 	it('does not show watermark when in development mode', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isDevelopment: true,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(false)
// 	})

// 	it('does not show watermark when license is parseable and domain is valid', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isLicenseParseable: true,
// 			isDomainValid: true,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(false)
// 	})

// 	it('does not show watermark when license is parseable and domain is not valid and dev mode', () => {
// 		const licenseResult = getDefaultLicenseResult({
// 			isLicenseParseable: true,
// 			isDomainValid: false,
// 			isDevelopment: true,
// 		})
// 		expect(watermarkManager.checkWatermark(licenseResult)).toBe(false)
// 	})

// 	it('throws when an internal annual license has expired', () => {
// 		const expiryDate = new Date(2023, 1, 1)
// 		const licenseResult = getDefaultLicenseResult({
// 			isAnnualLicense: true,
// 			isAnnualLicenseExpired: true,
// 			isInternalLicense: true,
// 			expiryDate,
// 		})
// 		expect(() => watermarkManager.checkWatermark(licenseResult)).toThrow(
// 			/License: Internal license expired/
// 		)
// 	})

// 	it('throws when an internal perpetual license has expired', () => {
// 		const expiryDate = new Date(2023, 1, 1)
// 		const licenseResult = getDefaultLicenseResult({
// 			isPerpetualLicense: true,
// 			isPerpetualLicenseExpired: true,
// 			isInternalLicense: true,
// 			expiryDate,
// 		})
// 		expect(() => watermarkManager.checkWatermark(licenseResult)).toThrow(
// 			/License: Internal license expired/
// 		)
// 	})
// })
