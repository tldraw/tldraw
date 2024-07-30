import { useClose } from '@headlessui/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export const CloseOnNavigation = () => {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const close = useClose()

	useEffect(() => {
		// @ts-ignore
		// button.current?.click()
		close()
	}, [pathname, searchParams])

	return null
}
