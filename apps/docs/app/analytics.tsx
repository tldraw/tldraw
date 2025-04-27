'use client'

import { XMarkIcon } from '@heroicons/react/24/solid'
import { track, Analytics as VercelAnalytics } from '@vercel/analytics/react'
import Cookies from 'js-cookie'
import Script from 'next/script'
import { Dialog as _Dialog, Switch as _Switch } from 'radix-ui'
import { useEffect, useState } from 'react'

type CookieConsent = 'unknown' | 'opted-in' | 'opted-out'

export default function Analytics() {
	const [hasConsent, setHasConsent] = useState<CookieConsent>('unknown')

	const onConsentChanged = (hasConsent: boolean) => {
		Cookies.set('allowTracking', hasConsent ? 'true' : 'false')
		track('consent_changed', { hasConsent }) // lol
		setHasConsent(hasConsent ? 'opted-in' : 'opted-out')
	}

	useEffect(() => {
		const consent = Cookies.get('allowTracking')
		setHasConsent(consent === 'true' ? 'opted-in' : consent === 'false' ? 'opted-out' : 'unknown')
	}, [])

	return (
		<>
			<VercelAnalytics />
			{hasConsent === 'opted-in' && <HubspotAnalytics />}
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
	hasConsent: CookieConsent
	onChange(consent: boolean): void
}) {
	const [showPrivacySettings, setShowPrivacySettings] = useState(false)
	const handleAccept = () => onChange(true)
	const handleReject = () => onChange(false)
	const onHide = () => {
		setShowPrivacySettings(false)
		const consent = Cookies.get('allowTracking')
		if (consent !== undefined) {
			onChange(consent === 'true')
		}
	}

	if (hasConsent !== 'unknown') return null

	return (
		<>
			<div className="select-none pointer-events-all p-3 gap-3 fixed max-w-full z-50 bottom-2 left-2 rounded rounded-lg shadow shadow-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center flex-col sm:flex-row sm:gap-8">
				<p className="text-xs leading-relaxed text-zinc-950 dark:text-zinc-100">
					We use cookies on this website.
					<br /> Learn more in our{' '}
					<a
						href="https://tldraw.notion.site/devcookiepolicy"
						target="_blank"
						rel="noreferrer"
						className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
					>
						Cookie Policy
					</a>
					.
				</p>
				<div className="w-full h-full justify-between flex-shrink-0 flex gap-4 sm:w-auto">
					<button
						className="bg-none flex-shrink-0 border-none p-0 text-sm cursor-pointer no-underline text-zinc-950 dark:text-zinc-300"
						onClick={handleReject}
					>
						Opt out
					</button>
					<button
						className="bg-blue-500 text-white rounded-[99px] dark:text-black border-none py-2 px-4 text-sm cursor-pointer no-underline hover:white dark:hover:black font-bold"
						onClick={handleAccept}
					>
						Accept
					</button>
				</div>
			</div>
			{showPrivacySettings && <PrivacySettings hasConsent={hasConsent} onHide={onHide} />}
		</>
	)
}

function PrivacySettings({ hasConsent, onHide }: { hasConsent: CookieConsent; onHide(): void }) {
	const [isChecked, setIsChecked] = useState(hasConsent === 'opted-in')
	const onChange = (checked: boolean) => {
		Cookies.set('allowTracking', checked ? 'true' : 'false')
		setIsChecked(checked)
	}

	return (
		<_Dialog.Root open>
			<_Dialog.Portal>
				<_Dialog.Overlay className="fixed inset-0 z-[100] bg-white/90 dark:bg-zinc-950/90" />
				<div className="fixed inset-0 z-[150] flex flex-col items-center justify-center h-screen">
					<_Dialog.Content
						onInteractOutside={onHide}
						onPointerDownOutside={onHide}
						className="relative shadow rounded p-8 bg-white dark:bg-zinc-950 text-md max-w-lg"
						onEscapeKeyDown={onHide}
					>
						<_Dialog.Title className="mb-2 font-bold">Privacy settings</_Dialog.Title>
						<_Dialog.Description className="text-base">
							This website uses cookies to collect analytics from visitors. Read our{' '}
							<a
								href="https://tldraw.notion.site/devcookiepolicy"
								target="_blank"
								rel="noreferrer"
								className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
							>
								cookie policy
							</a>{' '}
							to learn more.
						</_Dialog.Description>
						<_Dialog.DialogClose
							className="absolute top-2 right-2 p-1 rounded-full bg-white dark:bg-zinc-950 dark:text-zinc-300"
							asChild
						>
							<button aria-label="Close" onClick={onHide}>
								<XMarkIcon className="h-6" />
							</button>
						</_Dialog.DialogClose>

						<div className="flex mt-6 items-center">
							<label className="text-base select-none pr-4" htmlFor="privacy-analytics">
								<strong className="inline-block mb-2">Analytics</strong>
								<br />
								Optional. Help us understand how people use this website so that we can make it
								better.
							</label>
							<div>
								<_Switch.Root
									className="relative w-[3rem] h-7 bg-black/90 dark:bg-white/20 rounded-full data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-500"
									id="privacy-analytics"
									checked={isChecked}
									onCheckedChange={onChange}
								>
									<_Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 transform translate-x-1 data-[state=checked]:translate-x-6" />
								</_Switch.Root>
							</div>
						</div>
					</_Dialog.Content>
				</div>
			</_Dialog.Portal>
		</_Dialog.Root>
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
				<PrivacySettings
					hasConsent={Cookies.get('allowTracking') === 'true' ? 'opted-in' : 'opted-out'}
					onHide={onHide}
				/>
			)}
		</>
	)
}
