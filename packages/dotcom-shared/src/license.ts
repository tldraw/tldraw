// Full license for logged-in users (no watermark)
export const DOTCOM_LICENSE_KEY =
	process.env.TLDRAW_LICENSE ||
	'tldraw-tldraw-2026-07-10/WyIyU3h6ZzhTZyIsWyIqLnRsZHJhdy5jb20iLCIqLnRsZHJhdy5kZXYiLCIqLnRsZHJhdy5jbHViIiwiKi50bGRyYXcud29ya2Vycy5kZXYiXSw5LCIyMDI2LTA3LTEwIl0.+21jrvz5ZFmIvvA/DusCcnFV6Ab1iQQYR+INTqw/i/MmZe/5I/lhdLtqm9nprkQ1MfWL2PeyBmQui1+rjoQS1w'

// License with WITH_WATERMARK flag for logged-out users.
// Shows branded "Made with tldraw" logo. Falls back to full license until watermark key is generated.
export const DOTCOM_WATERMARK_LICENSE_KEY: string =
	process.env.TLDRAW_WATERMARK_LICENSE || DOTCOM_LICENSE_KEY

// Preserve backward compatibility for existing imports
const getLicenseKey = () => DOTCOM_LICENSE_KEY
export default getLicenseKey
