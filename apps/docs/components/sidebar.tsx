import { getDb } from '@/utils/ContentDatabase'

export const Sidebar = async () => {
	const db = await getDb()
	const sidebar = await db.getSidebarContentList({})
	console.log(sidebar)
	return <aside></aside>
}
