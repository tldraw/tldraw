import { TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import { env } from '../env'

const RELEASE_INFO = `${env} ${process.env.NEXT_PUBLIC_TLDRAW_RELEASE_INFO ?? 'unreleased'}`

export function DebugMenuItems() {
	return (
		<TldrawUiMenuGroup id="release">
			<TldrawUiMenuItem
				id="release-info"
				label={'Release info'}
				onSelect={() => {
					window.alert(`${RELEASE_INFO}`)
				}}
			/>
		</TldrawUiMenuGroup>
	)
}
