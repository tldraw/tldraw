import { BlogCategoryMenu } from '@/components/blog/blog-category-menu'
import { Aside } from '@/components/common/aside'
import { getDb } from '@/utils/ContentDatabase'

export async function BlogSidebar({ children }: { children?: React.ReactNode }) {
	const db = await getDb()
	const categories = await db.getCategoriesForSection('blog')

	return (
		<Aside className="hidden md:flex pr-12">
			<BlogCategoryMenu categories={categories.filter((c) => !c.id.endsWith('ucg'))} />
			{children}
		</Aside>
	)
}
