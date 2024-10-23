import { ReactNode } from 'react'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
} from 'tldraw'
import { TlaMenuControlGroup, TlaMenuSection } from '../tla-menu/tla-menu'
import { QrCode } from './QrCode'
import { TlaCopyPublishLinkButton } from './TlaPublishPage'
import styles from './file-share-menu.module.css'

export function TlaPublishFileShareMenu({
	isAnonUser,
	children,
}: {
	isAnonUser?: boolean
	children: ReactNode
}) {
	const url = `${window.location.origin}${window.location.pathname}`

	return (
		<TldrawUiDropdownMenuRoot id={`share-publish`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>{children}</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent
					className={styles.shareMenu}
					side="bottom"
					align={isAnonUser ? 'start' : 'end'}
					alignOffset={isAnonUser ? 2 : -2}
					sideOffset={4}
				>
					<TlaMenuSection>
						<TlaMenuControlGroup>
							<TlaCopyPublishLinkButton url={url} />
						</TlaMenuControlGroup>
						<QrCode url={url} />
					</TlaMenuSection>
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)
}
