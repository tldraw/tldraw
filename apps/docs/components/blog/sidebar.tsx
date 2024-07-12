import { CategoryMenu } from '@/components/blog/category-menu'
import { Aside } from '@/components/docs/aside'

export const Sidebar: React.FC<{}> = async ({}) => {
	return (
		<Aside className="hidden md:flex">
			<CategoryMenu />
		</Aside>
	)
}
