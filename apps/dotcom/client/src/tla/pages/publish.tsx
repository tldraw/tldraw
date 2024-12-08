import { SerializedSchema, TLRecord, fetch } from 'tldraw'
import { IFrameProtector, ROOM_CONTEXT } from '../../components/IFrameProtector'
import { defineLoader } from '../../utils/defineLoader'
import { PUBLISH_ENDPOINT } from '../app/TldrawApp'
import { TlaPublishEditor } from '../components/TlaEditor/TlaPublishEditor'
import { useMaybeApp } from '../hooks/useAppState'
import { TlaAnonLayout } from '../layouts/TlaAnonLayout/TlaAnonLayout'
import { TlaSidebarLayout } from '../layouts/TlaSidebarLayout/TlaSidebarLayout'

const { loader, useData } = defineLoader(async (args) => {
	const fileSlug = args.params.fileSlug
	const { TlaNotFoundError } = await import('../utils/notFoundError')
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
	const result = useData()
	const { roomId, records, schema } = result
	const app = useMaybeApp()

	// todo: only show the anon layout for published files?

	if (!app?.userId) {
		return (
			<TlaAnonLayout>
				<IFrameProtector slug={roomId} context={ROOM_CONTEXT.PUBLIC_SNAPSHOT}>
					<TlaPublishEditor records={records} schema={schema} />
				</IFrameProtector>
			</TlaAnonLayout>
		)
	}

	return (
		<TlaSidebarLayout collapsible>
			<IFrameProtector slug={roomId} context={ROOM_CONTEXT.PUBLIC_SNAPSHOT}>
				<TlaPublishEditor records={records} schema={schema} />
			</IFrameProtector>
		</TlaSidebarLayout>
	)
}
