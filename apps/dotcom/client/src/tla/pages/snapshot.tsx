import { SerializedSchema, TLRecord, fetch } from 'tldraw'
import { IFrameProtector, ROOM_CONTEXT } from '../../components/IFrameProtector'
import { SnapshotsEditor } from '../../components/SnapshotsEditor'
import { defineLoader } from '../../utils/defineLoader'

const { loader, useData } = defineLoader(async (args) => {
	const fileSlug = args.params.fileSlug
	const result = await fetch(`/api/app/snapshot/${fileSlug}`)
	if (!result.ok) throw new Error('Room not found')

	const data = await result.json()
	if (!data || data.error) throw new Error('Room not found')
	return data as {
		roomId: string
		schema: SerializedSchema
		records: TLRecord[]
	}
})

export { loader }

export function Component() {
	const result = useData()
	const { roomId, records, schema } = result
	return (
		<IFrameProtector slug={roomId} context={ROOM_CONTEXT.PUBLIC_SNAPSHOT}>
			<SnapshotsEditor records={records} schema={schema} />
		</IFrameProtector>
	)
}
