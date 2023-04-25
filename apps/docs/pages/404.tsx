import { Sidebar } from '@/components/Sidebar'
import { SidebarContentList } from '@/types/content-types'
import { getSidebarContentList } from '@/utils/getSidebarContentList'
import { GetStaticProps } from 'next'
import { useTheme } from 'next-themes'
import Link from 'next/link'

interface Props {
	sidebar: SidebarContentList
}

export default function NotFoundpage({ sidebar }: Props) {
	const theme = useTheme()

	return (
		<div className="layout">
			<Sidebar {...sidebar} />
			<main className={`article ${theme.theme ?? 'light'}`}>
				<div
					className="lockup"
					style={{
						mask: `url(/lockup.svg) center 100% / 100% no-repeat`,
						WebkitMask: `url(/lockup.svg) center 100% / 100% no-repeat`,
					}}
				/>
				<p>{`Sorry, we couldn't find the page you were looking for.`}</p>
				<p>
					<Link href="/">Back to the start.</Link>
				</p>
			</main>
		</div>
	)
}

export const getStaticProps: GetStaticProps<Props> = async () => {
	const sidebar = await getSidebarContentList({})

	return { props: { sidebar } }
}
