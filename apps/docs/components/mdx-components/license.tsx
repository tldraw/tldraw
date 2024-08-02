'use client'

import { ChangeEvent, FocusEvent, useState } from 'react'
import { LicenseManager } from 'tldraw'

export const VerifyLicense = () => {
	const [result, setResult] = useState<null | any>(null)

	const verifyLicense = async (license: string) => {
		try {
			const licenseManager = new LicenseManager('' /* don't worry about it */)
			const result = await licenseManager.getLicenseFromKey(license)
			setResult(result)
		} catch (ex) {
			setResult(`Error: ${result}`)
		}
	}
	const handleChange = (e: ChangeEvent) => verifyLicense((e.target as HTMLTextAreaElement).value)
	const handleBlur = (e: FocusEvent) => verifyLicense((e.target as HTMLTextAreaElement).value)

	return (
		<>
			<h4 style={{ marginBottom: '8px' }}>Verify your license key</h4>
			<textarea
				tabIndex={-1}
				autoComplete="off"
				autoCapitalize="off"
				autoCorrect="off"
				autoSave="off"
				placeholder="Paste your license key here"
				spellCheck="false"
				onChange={handleChange}
				onBlur={handleBlur}
				style={{ padding: '8px', width: '100%', height: '70px' }}
			/>
			{result && <pre style={{ width: '100%' }}>{JSON.stringify(result, undefined, 2)}</pre>}
		</>
	)
}
