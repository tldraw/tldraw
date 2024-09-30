import { ClerkProvider } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { Outlet } from 'react-router-dom'
import '../styles/tla.css'

export const assetUrls = getAssetUrlsByImport()

import '../styles/tla.css'

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// prototype shit, this will be set during fake login
export const USER_ID_KEY = 'tldraw_app_userId'

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing Publishable Key')
}

export function Component() {
	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/q">
			<Outlet />
		</ClerkProvider>
	)
}
