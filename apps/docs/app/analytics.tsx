'use client'

import { XMarkIcon } from '@heroicons/react/24/solid'
import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import Cookies from 'js-cookie'
import Script from 'next/script'
import { useEffect, useState } from 'react'

export default function Analytics() {
	const [hasConsent, setHasConsent] = useState<string | undefined>(
		'false' /* server-side starts with false */
	)
	const onConsentChanged = (hasConsent: boolean) => {
		Cookies.set('allowTracking', hasConsent ? 'true' : 'false')
		setHasConsent(hasConsent ? 'true' : 'false')
	}
	useEffect(() => {
		setHasConsent(Cookies.get('allowTracking'))
	}, [])

	return (
		<>
			<VercelAnalytics />
			{hasConsent && <HubspotAnalytics />}
			<CookieConsent hasConsent={hasConsent} onChange={onConsentChanged} />
		</>
	)
}

function HubspotAnalytics() {
	return (
		<Script
			type="text/javascript"
			id="hs-script-loader"
			async
			defer
			src="//js-eu1.hs-scripts.com/145620695.js"
		/>
	)
}

function CookieConsent({
	hasConsent,
	onChange,
}: {
	hasConsent: string | undefined
	onChange(consent: boolean): void
}) {
	const [showPrivacySettings, setShowPrivacySettings] = useState(false)
	const handleAccept = () => onChange(true)
	const handleReject = () => onChange(false)
	const handleCustomize = () => setShowPrivacySettings(true)
	const onHide = () => {
		setShowPrivacySettings(false)
		if (Cookies.get('allowTracking') !== undefined) {
			onChange(Cookies.get('allowTracking') === 'true')
		}
	}

	if (hasConsent !== undefined) return null

	return (
		<>
			<div className="fixed z-50 bottom-2 left-2 p-3 rounded border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
				<p className="text-xs mb-2 leading-relaxed text-zinc-950 dark:text-zinc-100">
					We use first-party cookies to improve our services.
					<br />
					<a
						href="https://tldraw.notion.site/devcookiepolicy"
						target="_blank"
						rel="noreferrer"
						className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
					>
						Learn more
					</a>
				</p>
				<div className="flex gap-2 justify-between">
					<button
						className="bg-none border-none p-0 text-xs cursor-pointer no-underline text-zinc-950 dark:text-zinc-300"
						onClick={handleCustomize}
					>
						Privacy settings
					</button>
					<div className="flex gap-2">
						<button
							className="bg-none border-none p-0 text-xs cursor-pointer no-underline text-zinc-950 dark:text-zinc-300"
							onClick={handleReject}
						>
							Opt out
						</button>
						<button
							className="bg-none border-none p-0 text-xs cursor-pointer no-underline text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-bold"
							onClick={handleAccept}
						>
							Accept
						</button>
					</div>
				</div>
			</div>
			{showPrivacySettings && <PrivacySettings hasConsent={hasConsent} onHide={onHide} />}
		</>
	)
}

function PrivacySettings({
	hasConsent,
	onHide,
}: {
	hasConsent: string | undefined
	onHide(): void
}) {
	const [isChecked, setIsChecked] = useState(hasConsent === 'true')
	const onChange = (checked: boolean) => {
		Cookies.set('allowTracking', checked ? 'true' : 'false')
		setIsChecked(checked)
	}

	return (
		<Dialog.Root open>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-white/90 dark:bg-zinc-950/90" />
				<Dialog.Content
					className="fixed inset-0 z-50 flex flex-col items-center justify-center h-screen"
					onEscapeKeyDown={onHide}
				>
					<div className="relative shadow rounded p-8 bg-white dark:bg-zinc-950 text-md max-w-lg">
						<Dialog.Title className="mb-2 font-bold">Privacy settings</Dialog.Title>
						<Dialog.Description className="text-sm">
							We use cookies to collect analytics to help us improve tldraw.dev.
							<br />
							Read our{' '}
							<a
								href="https://tldraw.notion.site/devcookiepolicy"
								target="_blank"
								rel="noreferrer"
								className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
							>
								cookie policy
							</a>{' '}
							to learn more.
						</Dialog.Description>

						<Dialog.DialogClose
							className="absolute top-2 right-2 p-1 rounded-full bg-white dark:bg-zinc-950 dark:text-zinc-300"
							asChild
						>
							<button aria-label="Close" onClick={onHide}>
								<XMarkIcon className="h-6" />
							</button>
						</Dialog.DialogClose>

						<div className="flex mt-6 items-center">
							<label className="text-md leading-none select-none pr-4" htmlFor="privacy-analytics">
								<strong className="inline-block mb-2">Analytics</strong>
								<br />
								Optional — Help us understand how people use tldraw.dev, and how we can make it
								better.
							</label>
							<div>
								<Switch.Root
									className="relative w-[3rem] h-7 bg-black/90 dark:bg-white/20 rounded-full data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-500"
									id="privacy-analytics"
									checked={isChecked}
									onCheckedChange={onChange}
								>
									<Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 transform translate-x-1 data-[state=checked]:translate-x-6" />
								</Switch.Root>
							</div>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

export function PrivacySettingsLink() {
	const [showPrivacySettings, setShowPrivacySettings] = useState(false)
	const onCookieClick = () => {
		setShowPrivacySettings(true)
	}
	const onHide = () => {
		setShowPrivacySettings(false)
		// Need this for the settings to take effect on the consent banner.
		window.location.reload()
	}

	return (
		<>
			<button onClick={onCookieClick} className="hover:text-zinc-800 dark:hover:text-zinc-200">
				Privacy settings
			</button>
			{showPrivacySettings && (
				<PrivacySettings hasConsent={Cookies.get('allowTracking')} onHide={onHide} />
			)}
		</>
	)
}
