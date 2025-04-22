import { BlogCategoryMenu } from '@/components/blog/blog-category-menu'
import { Navigation } from '@/components/common/navigation'
import { db } from '@/utils/ContentDatabase'

export async function BlogSidebar({ children }: { children?: React.ReactNode }) {
	const categories = await db.getCategoriesForSection('blog')

	return (
		<Navigation className="hidden md:flex pr-12">
			<BlogCategoryMenu categories={categories.filter((c) => !c.id.endsWith('ucg'))} />
			{children}
		</Navigation>
	)
}
