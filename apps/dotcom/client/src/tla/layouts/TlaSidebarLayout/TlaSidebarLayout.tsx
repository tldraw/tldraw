import { ReactNode } from 'react'
import { EditorContext, TldrawUiContextProvider, useValue } from 'tldraw'
import { globalEditor } from '../../../utils/globalEditor'
import { components } from '../../components/TlaEditor/TlaEditor'
import { TlaSidebar } from '../../components/TlaSidebar/TlaSidebar'
import { useApp } from '../../hooks/useAppState'
import { usePreventAccidentalDrops } from '../../hooks/usePreventAccidentalDrops'
import styles from './sidebar-layout.module.css'

export function TlaSidebarLayout({ children }: { children: ReactNode; collapsable?: boolean }) {
	const app = useApp()
	const isSidebarOpen = useValue('sidebar open', () => app.getSessionState().isSidebarOpen, [app])
	const isSidebarOpenMobile = useValue(
		'sidebar open mobile',
		() => app.getSessionState().isSidebarOpenMobile,
		[app]
	)
	const currentEditor = useValue('editor', () => globalEditor.get(), [])
	const MaybeEditorProvider = currentEditor ? EditorContext.Provider : FakeProvider

	function FakeProvider({ children }: { children: ReactNode }) {
		return children
	}
	const MaybeUiContextProvider = currentEditor ? TldrawUiContextProvider : FakeProvider

	usePreventAccidentalDrops()

	return (
		<MaybeEditorProvider value={currentEditor}>
			<MaybeUiContextProvider components={components}>
				<div
					className={styles.layout}
					data-sidebar={isSidebarOpen}
					data-sidebarmobile={isSidebarOpenMobile}
				>
					<TlaSidebar />
					{children}
				</div>
			</MaybeUiContextProvider>
		</MaybeEditorProvider>
	)
}
