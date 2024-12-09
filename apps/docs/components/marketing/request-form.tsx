'use client'

import { useEffect } from 'react'

type HubspotFormProps =
	| {
			form: 'business'
	  }
	| {
			form: 'startup'
			plan: 'startup' | 'startup-lite'
	  }

const forms = {
	business: 'b8b7b29f-3987-4c37-b64f-bffff5b3fd17',
	startup: '5f90bdd3-d97d-4ba7-9ace-2f7eabd0b21e',
}

const plans = {
	startup: 'StartUp',
	'startup-lite': 'StartUp Lite',
}

function HubspotForm(props: HubspotFormProps) {
	useEffect(() => {
		const script = document.createElement('script')
		script.src = 'https://js.hsforms.net/forms/v2.js'
		document.body.appendChild(script)

		script.addEventListener('load', () => {
			if ((window as any).hbspt) {
				;(window as any).hbspt.forms.create({
					portalId: '145620695',
					formId: forms[props.form],
					target: '#hubspotForm',
					onFormReady: (form: HTMLFormElement) => {
						if (props.form === 'startup') {
							const field: HTMLSelectElement = form.preferred_startup_plan
							// hubspot only responds to change events, so dispatch one on the field:
							field.value = plans[props.plan]
							field.dispatchEvent(new Event('input', { bubbles: true }))
						}
					},
				})
			}
		})
	}, [props])

	return <div id="hubspotForm"></div>
}

export function RequestForm(props: HubspotFormProps) {
	return (
		<div className="flex gap-4 flex-col pt-6 mt-6 border-t border-zinc-700/50">
			<HubspotForm {...props} />
		</div>
	)
}
