import { Section } from '@/types/content-types'
import { getDb } from '@/utils/ContentDatabase'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export async function SectionDocsPage({ section }: { section: Section }) {
	const db = await getDb()
	const sidebar = await db.getSidebarContentList({ sectionId: section.id })

	return (
		<>
			<Header sectionId={section.id} />
			<Sidebar {...sidebar} />
			<main className="main-content article">
				<div className="page-header">
					<h1>{section.title}</h1>
				</div>
				Choose your adventure on the left.
			</main>
		</>
	)
}
