import { ROOM_PREFIX } from '@tldraw/dotcom-shared'
import { BoardHistoryLog } from '../components/BoardHistoryLog/BoardHistoryLog'
import { ErrorPage } from '../components/ErrorPage/ErrorPage'
import { IFrameProtector, ROOM_CONTEXT } from '../components/IFrameProtector'
import { defineLoader } from '../utils/defineLoader'

const { loader, useData } = defineLoader(async (args) => {
	const boardId = args.params.boardId

	if (!boardId) return null

	const result = await fetch(`/api/${ROOM_PREFIX}/${boardId}/history`, {
		headers: {},
	})
	if (!result.ok) return null
	const data = await result.json()

	return { data, boardId } as { data: string[]; boardId: string }
})

export { loader }

export function Component() {
	const data = useData()
	if (!data)
		return (
			<ErrorPage
				messages={{
					header: 'Page not found',
					para1: 'The page you are looking does not exist or has been moved.',
				}}
			/>
		)
	return (
		<IFrameProtector slug={data.boardId} context={ROOM_CONTEXT.HISTORY}>
			<BoardHistoryLog data={data.data} />
		</IFrameProtector>
	)
}
