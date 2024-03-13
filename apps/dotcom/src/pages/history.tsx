import { BoardHistoryLog } from '../components/BoardHistoryLog/BoardHistoryLog'
import { ErrorPage } from '../components/ErrorPage/ErrorPage'
import { IFrameProtector } from '../components/IFrameProtector'
import { defineLoader } from '../utils/defineLoader'

const { loader, useData } = defineLoader(async (args) => {
	const boardId = args.params.boardId

	if (!boardId) return null

	const result = await fetch(`/api/r/${boardId}/history`, {
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
				icon
				messages={{
					header: 'Page not found',
					para1: 'The page you are looking does not exist or has been moved.',
				}}
				redirectTo="/"
			/>
		)
	return (
		<IFrameProtector slug={data.boardId} context="history">
			<BoardHistoryLog data={data.data} />
		</IFrameProtector>
	)
}
