import { createTLStore } from '../../config/createTLStore'
import { Editor } from '../Editor'
import { FLAGS, ValidLicenseKeyResult } from './LicenseManager'
import { WatermarkManager } from './WatermarkManager'

function getDefaultLicenseResult(overides: Partial<ValidLicenseKeyResult>): ValidLicenseKeyResult {
	return {
		isAnnualLicense: true,
		isAnnualLicenseExpired: false,
		isInternalLicense: false,
		isDomainValid: true,
		isPerpetualLicense: false,
		isPerpetualLicenseExpired: false,
		isLicenseParseable: true as const,
		license: {
			id: 'id',
			hosts: ['localhost'],
			flags: FLAGS.PERPETUAL_LICENSE,
			version: '1.0.0',
			expiryDate: new Date().toISOString(),
		},
		expiryDate: new Date(),
		...overides,
	}
}

describe('WatermarkManager', () => {
	let watermarkManager: WatermarkManager
	let editor: Editor
	beforeAll(() => {
		editor = new Editor({
			store: createTLStore({}),
			bindingUtils: [],
			shapeUtils: [],
			getContainer: () => document.createElement('div'),
			tools: [],
		})
		watermarkManager = new WatermarkManager(editor)
	})

	it('throws when an internal annual license has expired', () => {
		const expiryDate = new Date(2023, 1, 1)
		const licenseResult = getDefaultLicenseResult({
			isAnnualLicense: true,
			isAnnualLicenseExpired: true,
			isInternalLicense: true,
			expiryDate,
		})
		expect(() => watermarkManager.checkWatermark(licenseResult)).toThrow(/Internal license expired/)
	})

	it('throws when an internal perpetual license has expired', () => {
		const expiryDate = new Date(2023, 1, 1)
		const licenseResult = getDefaultLicenseResult({
			isPerpetualLicense: true,
			isPerpetualLicenseExpired: true,
			isInternalLicense: true,
			expiryDate,
		})
		expect(() => watermarkManager.checkWatermark(licenseResult)).toThrow(/Internal license expired/)
	})
})
