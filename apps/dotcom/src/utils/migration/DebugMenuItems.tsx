import { DropdownMenu } from '@tldraw/tldraw'
import { env } from '../env'

const RELEASE_INFO = `${env} ${process.env.NEXT_PUBLIC_TLDRAW_RELEASE_INFO ?? 'unreleased'}`

export function DebugMenuItems() {
	return (
		<DropdownMenu.Group>
			<DropdownMenu.Item
				type="menu"
				onClick={() => {
					window.alert(`${RELEASE_INFO}`)
				}}
				title={`${RELEASE_INFO}`}
			>
				Version
			</DropdownMenu.Item>
			<DropdownMenu.Item
				type="menu"
				onClick={async () => {
					const { writeV1ContentsToIdb } = await import('./writeV1ContentsToIdb')
					await writeV1ContentsToIdb()
					window.location.reload()
				}}
			>
				Test v1 content
			</DropdownMenu.Item>
		</DropdownMenu.Group>
	)
}
