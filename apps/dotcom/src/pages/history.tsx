import { BoardHistoryLog } from '../components/BoardHistoryLog/BoardHistoryLog'
import { defineLoader } from '../utils/defineLoader'

const { loader, useData } = defineLoader(async (args) => {
	const boardId = args.params.boardId

	if (!boardId) return null

	const result = await fetch(`/api/r/${boardId}/history`, {
		headers: {},
	})
	if (!result.ok) return null
	const data = await result.json()

	return data as string[]
})

export { loader }

export function Component() {
	const data = useData()
	if (!data) throw Error('Project not found')
	return <BoardHistoryLog data={data} />
}
