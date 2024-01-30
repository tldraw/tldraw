import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { getDb } from '@/utils/ContentDatabase'

export default async function NotFound() {
	const db = await getDb()
	const sidebar = await db.getSidebarContentList({})

	return (
		<>
			<Header />
			<Sidebar {...sidebar} />
			<main className="article">
				<div className="page-header">
					<h1>Not found.</h1>
				</div>
				<p>There's nothing here. :(</p>
			</main>
		</>
	)
}
