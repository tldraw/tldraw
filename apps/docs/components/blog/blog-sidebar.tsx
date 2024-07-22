import { BlogCategoryMenu } from '@/components/blog/blog-category-menu'
import { Aside } from '@/components/docs/aside'
import { getDb } from '@/utils/ContentDatabase'

export const BlogSidebar: React.FC = async () => {
	const db = await getDb()
	const categories = await db.getCategoriesForSection('blog')

	return (
		<Aside className="hidden md:flex">
			<BlogCategoryMenu categories={categories.filter((c) => !c.id.endsWith('ucg'))} />
		</Aside>
	)
}
