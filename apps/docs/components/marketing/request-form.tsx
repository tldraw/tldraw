'use client'

import { useEffect } from 'react'

function HubspotForm() {
	useEffect(() => {
		const script = document.createElement('script')
		script.src = 'https://js.hsforms.net/forms/v2.js'
		document.body.appendChild(script)

		script.addEventListener('load', () => {
			if ((window as any).hbspt) {
				;(window as any).hbspt.forms.create({
					portalId: '145620695',
					formId: 'b8b7b29f-3987-4c37-b64f-bffff5b3fd17',
					target: '#hubspotForm',
				})
			}
		})
	}, [])

	return <div id="hubspotForm"></div>
}

export function RequestForm() {
	return (
		<div className="flex gap-4 flex-col pt-6 mt-6 border-t border-zinc-700/50">
			<HubspotForm />
		</div>
	)
}
