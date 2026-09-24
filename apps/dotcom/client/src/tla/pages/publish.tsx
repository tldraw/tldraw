import { SerializedSchema, TLRecord, fetch } from 'tldraw'
import { IFrameProtector, ROOM_CONTEXT } from '../../components/IFrameProtector'
import { defineLoader } from '../../utils/defineLoader'
import { PUBLISH_ENDPOINT } from '../app/TldrawApp'
import { TlaPublishEditor } from '../components/TlaEditor/TlaPublishEditor'
import { TlaNotFoundError } from '../utils/notFoundError'

const { loader, useData } = defineLoader(async (args) => {
	const fileSlug = args.params.fileSlug
	const result = await fetch(`${PUBLISH_ENDPOINT}/${fileSlug}`)
	if (!result.ok) throw new TlaNotFoundError()

	const data = await result.json()
	if (!data || data.error) throw new TlaNotFoundError()
	return data as {
		roomId: string
		schema: SerializedSchema
		records: TLRecord[]
	}
})

export { loader }

export function Component() {
	const { roomId, records, schema } = useData()

	return (
		<IFrameProtector slug={roomId} context={ROOM_CONTEXT.PUBLIC_SNAPSHOT}>
			<TlaPublishEditor records={records} schema={schema} />
		</IFrameProtector>
	)
}
