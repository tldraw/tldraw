'use client'

import { cn } from '@/utils/cn'
import { MoonIcon, SunIcon } from '@heroicons/react/20/solid'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const themes = [
	{ id: 'light', name: 'Light Mode', icon: SunIcon },
	{ id: 'dark', name: 'Dark Mode', icon: MoonIcon },
	// { id: 'system', name: 'System Preference', icon: Cog6ToothIcon },
]

export function ThemeSwitch() {
	const { theme: initialTheme, setTheme: persistTheme } = useTheme()
	const [theme, setTheme] = useState<string>()
	const Icon = themes.find((t) => t.id === theme)?.icon ?? SunIcon

	useEffect(() => {
		setTheme(initialTheme)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const setThemeAndPersist = () => {
		const nextTheme = theme === 'light' ? 'dark' : 'light'
		persistTheme(nextTheme)
		setTheme(nextTheme)
	}

	return (
		<div className="flex flex-col items-end sm:flex-row sm:items-center gap-4 ml-2 md:ml-0">
			<div className="hidden md:block h-px sm:h-5 w-full sm:w-px bg-zinc-100 sm:bg-zinc-200 dark:bg-zinc-800 dark:sm:bg-zinc-700" />
			<button
				onClick={() => setThemeAndPersist()}
				className="hover:text-zinc-600 dark:hover:text-zinc-100"
			>
				<div className={cn('transition-opacity duration-300', theme ? 'opacity-100' : 'opacity-0')}>
					<Icon className="size-5" />
				</div>
			</button>
		</div>
	)
}
