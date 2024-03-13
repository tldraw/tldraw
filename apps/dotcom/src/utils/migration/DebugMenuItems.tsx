import { TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'
import { env } from '../env'

const RELEASE_INFO = `${env} ${process.env.NEXT_PUBLIC_TLDRAW_RELEASE_INFO ?? 'unreleased'}`

export function DebugMenuItems() {
	return (
		<TldrawUiMenuGroup id="release">
			<TldrawUiMenuItem
				id="release-info"
				title={`${RELEASE_INFO}`}
				label="Version"
				onSelect={() => {
					window.alert(`${RELEASE_INFO}`)
				}}
			/>
			<TldrawUiMenuItem
				id="v1"
				label="Test v1 content"
				onSelect={async () => {
					const { writeV1ContentsToIdb } = await import('./writeV1ContentsToIdb')
					await writeV1ContentsToIdb()
					window.location.reload()
				}}
			/>
		</TldrawUiMenuGroup>
	)
}
