import { MobileSidebar } from '@/components/blog/mobile-sidebar'
import { Sidebar } from '@/components/blog/sidebar'

export default async function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-16 isolate">
			<Sidebar />
			<div className="fixed w-full h-12 border-b border-zinc-100 flex items-center justify-between px-5 bg-white/90 backdrop-blur md:hidden z-10">
				<MobileSidebar />
			</div>
			<main className="relative shrink w-full md:overflow-x-hidden px-5 md:pr-0 lg:pl-12 pt-24 md:pt-0">
				{children}
			</main>
		</div>
	)
}
