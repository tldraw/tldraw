import { ClerkProvider } from '@clerk/clerk-react'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { Outlet } from 'react-router-dom'
import '../styles/tla.css'

export const assetUrls = getAssetUrlsByImport()

import '../styles/tla.css'
import { TlaRootProviders } from './TlaRootProviders'

// @ts-ignore this is fine
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
	throw new Error('Missing Publishable Key')
}

export function Component() {
	return (
		<ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/q">
			<TlaRootProviders>
				<Outlet />
			</TlaRootProviders>
		</ClerkProvider>
	)
}
