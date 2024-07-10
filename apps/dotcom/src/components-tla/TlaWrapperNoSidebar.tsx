import { ReactNode } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { TlaCloseButton } from './TlaCloseButton'

export function TlaWrapperNoSidebar({ children }: { children: ReactNode }) {
	const app = useApp()
	const theme = useValue('theme', () => app.getSessionState().theme, [app])
	return (
		<div
			className={`tla tla_layout tla_full ${theme === 'light' ? 'tla_theme__light' : 'tla_theme__dark'}`}
			data-sidebar="false"
		>
			<TlaCloseButton
				onClose={() => {
					// close modal if modal
				}}
			/>
			<div className="tla_full_inner">
				<div className="tla_full_content">{children}</div>
			</div>
		</div>
	)
}
