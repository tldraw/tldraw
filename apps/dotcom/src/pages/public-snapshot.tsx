import { SerializedSchema, TLRecord } from '@tldraw/tldraw'
import '../../styles/globals.css'
import { IFrameProtector } from '../components/IFrameProtector'
import { SnapshotsEditor } from '../components/SnapshotsEditor'
import { defineLoader } from '../utils/defineLoader'

const { loader, useData } = defineLoader(async (args) => {
	const roomId = args.params.roomId
	const result = await fetch(`/api/snapshot/${roomId}`)
	return result.ok
		? ((await result.json()) as {
				slug: string
				schema: SerializedSchema
				records: TLRecord[]
			})
		: null
})

export { loader }

export function Component() {
	const roomData = useData()
	if (!roomData) throw Error('Room not found')
	return (
		<IFrameProtector slug={roomData.slug} context="public-snapshot">
			<SnapshotsEditor records={roomData.records} schema={roomData.schema} />
		</IFrameProtector>
	)
}
