'use client'

import { useTheme } from 'next-themes'
import { Icon } from './Icon'

export function ThemeSwitcher() {
	const { theme, setTheme } = useTheme()

	return (
		<button
			className="sidebar__button icon-button"
			onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
		>
			<Icon icon="light" />
		</button>
	)
}
