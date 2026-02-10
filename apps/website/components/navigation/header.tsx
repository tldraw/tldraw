'use client'

import { Button } from '@/components/ui/button'
import { ChevronRight } from '@/components/ui/chevron-icon'
import { cn } from '@/lib/utils'
import type { NavGroup, NavItem } from '@/sanity/types'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MobileMenu } from './mobile-menu'

interface ProductMenuGroup {
	label: string
	slug: string
	items: { label: string; href: string }[]
}

interface ProductMenuFeatured {
	title: string
	description: string
	href: string
}

interface HeaderProps {
	navGroups: NavGroup[]
	standaloneNavLinks: NavItem[]
	productMenuGroups?: ProductMenuGroup[]
	productMenuFeatured?: ProductMenuFeatured
}

export function Header({
	navGroups,
	standaloneNavLinks,
	productMenuGroups,
	productMenuFeatured,
}: HeaderProps) {
	const pathname = usePathname()
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [openDropdown, setOpenDropdown] = useState<string | null>(null)
	const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

	function handleMouseEnter(label: string) {
		if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
		setOpenDropdown(label)
	}

	function handleMouseLeave() {
		dropdownTimeout.current = setTimeout(() => setOpenDropdown(null), 150)
	}

	useEffect(() => {
		setOpenDropdown(null)
	}, [pathname])

	const isProductGroup = (label: string) =>
		label === 'Product' && productMenuGroups && productMenuGroups.length > 0

	return (
		<>
			<header className="sticky top-0 z-50 w-full bg-white dark:bg-zinc-950/95">
				<div className="mx-auto flex min-h-[72px] max-w-content items-center justify-between px-4 sm:px-8 md:min-h-[100px] lg:min-h-[110px]">
					<div className="flex items-center gap-6">
						<Link href="/" className="mb-[3px] flex items-center">
							<svg
								width="70"
								height="19"
								viewBox="0 0 70 19"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M22.3593 5.35793C22.3593 4.81254 22.7787 4.37042 23.2962 4.37042H24.5007C25.0181 4.37042 25.4376 4.81254 25.4376 5.35793V6.17145C25.4376 6.37142 25.5914 6.53354 25.7811 6.53354H26.4312C26.7761 6.53354 27.0557 6.82829 27.0557 7.19188V8.22641C27.0557 8.59 26.7761 8.88475 26.4312 8.88475H25.7811C25.5914 8.88475 25.4376 9.04686 25.4376 9.24684V12.6585C25.4376 12.7839 25.458 12.8897 25.4989 12.9759C25.5398 13.0582 25.603 13.1209 25.6885 13.164C25.774 13.2032 26.1148 13.2227 26.2487 13.2227C26.577 13.2227 26.7695 13.348 26.8372 13.6866L27.0557 14.7801C27.1268 15.1356 26.9262 15.486 26.5904 15.5681C26.3376 15.6308 25.9209 15.6719 25.5714 15.6915C24.865 15.7307 24.2721 15.6543 23.7925 15.4623C23.3129 15.2663 22.9523 14.9587 22.7106 14.5394C22.469 14.1201 22.3518 13.595 22.3593 12.9641V9.24684C22.3593 9.04686 22.2055 8.88475 22.0158 8.88475H21.7291C21.3841 8.88475 21.1045 8.59 21.1045 8.22641V7.19188C21.1045 6.82829 21.3841 6.53354 21.7291 6.53354H22.0158C22.2055 6.53354 22.3593 6.37142 22.3593 6.17145V5.35793Z"
									fill="currentColor"
								/>
								<path
									d="M33.8698 15.1962C33.3605 14.8592 32.9515 14.3478 32.643 13.662C32.3381 12.9763 32.1857 12.1122 32.1857 11.0698C32.1857 9.53128 32.5598 7.75823 33.9144 6.91405C34.9718 6.25989 36.3575 6.25687 37.3122 7.12781C37.4955 7.29497 37.9854 7.14527 37.9854 6.88984V4.53345C37.9854 3.98806 38.4048 3.54594 38.9223 3.54594H40.1268C40.6442 3.54594 41.0637 3.98806 41.0637 4.53345V14.5966C41.0637 15.142 40.6442 15.5842 40.1268 15.5842H38.5945C38.2704 15.5842 38.0077 15.3072 38.0077 14.9656C38.0077 14.7792 37.6588 14.6675 37.538 14.8038C37.5013 14.8453 37.4643 14.886 37.4277 14.9258C36.5088 15.9273 34.9458 15.903 33.8698 15.1962ZM38.0523 11.0698C38.0523 10.1744 37.7465 8.93022 36.6916 8.93022C35.6329 8.93022 35.3532 10.1791 35.3532 11.0698C35.3532 11.7266 35.4558 12.5096 35.9666 12.9567C37.1532 13.9526 38.0523 12.1746 38.0523 11.0698Z"
									fill="currentColor"
								/>
								<path
									d="M43.1202 15.5842C42.6028 15.5842 42.1833 15.1421 42.1833 14.5967V7.54303C42.1833 6.99764 42.6028 6.55551 43.1202 6.55551H44.6565C44.9414 6.55551 45.1724 6.79896 45.1724 7.09927C45.1724 7.38396 45.2702 7.4736 45.4555 7.4736C45.7743 7.4736 45.8411 6.40065 47.3179 6.43795C48.2579 6.43795 48.3839 7.42752 48.3839 7.92409C48.3839 9.05794 48.0421 9.16536 46.961 9.16536C45.9945 9.16536 45.2616 9.86158 45.2616 10.8817V14.5967C45.2616 15.1421 44.8422 15.5842 44.3248 15.5842H43.1202Z"
									fill="currentColor"
								/>
								<path
									d="M50.9618 15.7018C50.0344 15.7018 49.0592 15.4117 48.5304 14.5497C48.2925 14.1617 48.1735 13.668 48.1735 13.0684C48.1735 12.2477 48.4392 11.4425 49.0825 10.9405C49.7222 10.4414 50.5395 10.262 51.3188 10.1999C51.817 10.1592 53.304 10.1923 53.304 9.40049C53.304 8.5724 52.1775 8.47941 51.6701 8.85384C50.9641 9.37017 51.0159 9.47103 49.9246 9.47103C48.6266 9.47103 49.0211 7.46507 50.3038 6.83767C50.8726 6.55552 51.5827 6.41445 52.4341 6.41445C53.4369 6.41445 54.5095 6.62527 55.3284 7.27264C55.6704 7.53911 55.9306 7.85261 56.1091 8.21313C56.2913 8.56973 56.3823 8.95768 56.3823 9.37698V14.5732C56.3823 15.1186 55.9629 15.5607 55.4455 15.5607H54.0792C53.762 15.5607 53.5048 15.2896 53.5048 14.9553C53.5048 14.7821 53.2459 14.6992 53.1317 14.8237C52.556 15.4511 51.7723 15.7018 50.9618 15.7018ZM53.1312 13.0625C53.3179 12.7869 53.3419 12.4418 53.3375 12.1008C53.3345 11.8668 53.1 11.7054 52.8862 11.7685C52.6283 11.8446 52.3638 11.8976 52.0995 11.9398C51.7575 11.9961 51.3695 12.1263 51.1793 12.4571C51.0028 12.7704 51.0381 13.2284 51.3243 13.4563C51.8669 13.8885 52.762 13.6073 53.1312 13.0625Z"
									fill="currentColor"
								/>
								<path
									d="M30.22 3.40521C30.7434 3.40521 31.1678 3.85249 31.1678 4.40425V14.5849C31.1678 15.1366 30.7434 15.5839 30.22 15.5839H29.0014C28.4779 15.5839 28.0536 15.1366 28.0536 14.5849V4.40425C28.0536 3.85249 28.4779 3.40521 29.0014 3.40521H30.22Z"
									fill="currentColor"
								/>
								<path
									d="M59.7083 15.5841C59.2784 15.5841 58.9038 15.2757 58.7995 14.8361L57.1267 7.78248C56.9789 7.15921 57.4261 6.55545 58.0355 6.55545H59.1366C59.5872 6.55545 59.974 6.89365 60.0572 7.36048L60.6418 10.6375C60.6982 10.9542 61.126 10.9616 61.1923 10.6471L61.8918 7.32875C61.987 6.87692 62.3672 6.55545 62.8062 6.55545H64.2997C64.7353 6.55545 65.1134 6.87191 65.2121 7.3191L65.9398 10.6148C66.0089 10.9281 66.4357 10.9169 66.49 10.6004L67.0453 7.36705C67.126 6.89716 67.5141 6.55545 67.9671 6.55545H69.0628C69.6722 6.55545 70.1194 7.15921 69.9716 7.78248L68.2988 14.8361C68.1945 15.2757 67.8199 15.5841 67.39 15.5841H65.5113C65.0899 15.5841 64.7205 15.2876 64.6083 14.8595L63.8038 11.789C63.7275 11.4979 63.3354 11.4997 63.2614 11.7914L62.4858 14.8515C62.3763 15.2836 62.005 15.5841 61.5808 15.5841H59.7083Z"
									fill="currentColor"
								/>
								<path
									fillRule="evenodd"
									clipRule="evenodd"
									d="M0 2.80839C0 1.50623 0.995172 0.457275 2.23056 0.457275H14.9276C16.163 0.457275 17.1581 1.50623 17.1581 2.80839V16.1916C17.1581 17.4938 16.163 18.5427 14.9276 18.5427H2.23056C0.995172 18.5427 0 17.4938 0 16.1916V2.80839ZM10.1233 5.88292C10.1233 6.78719 9.43698 7.51061 8.57907 7.51061C7.72116 7.51061 7.03484 6.78719 7.03484 5.88292C7.03484 4.97864 7.72116 4.25522 8.57907 4.25522C9.43698 4.25522 10.1233 4.97864 10.1233 5.88292ZM8.06433 15.1065C8.80212 15.1065 9.50561 14.0395 9.76298 13.4607C10.089 12.7192 10.2777 11.399 9.95172 10.6213C9.72866 10.0787 9.21392 9.68087 8.5276 9.68087C7.704 9.68087 7.03484 10.3862 7.03484 11.2543C7.03484 12.032 7.56674 12.6469 8.25306 12.7735C8.28738 12.7735 8.3217 12.8277 8.3217 12.8639C8.25306 13.316 8.06433 13.8948 7.77264 14.1841C7.41232 14.5459 7.51526 15.1065 8.06433 15.1065Z"
									fill="currentColor"
								/>
							</svg>
						</Link>
						<nav className="hidden items-center gap-0 md:flex">
							{navGroups.map((group) => (
								<div
									key={group.label}
									className="relative"
									onMouseEnter={() => handleMouseEnter(group.label)}
									onMouseLeave={handleMouseLeave}
								>
									<button
										type="button"
										className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-zinc-700 transition-colors hover:text-black dark:text-zinc-300 dark:hover:text-white"
									>
										{group.label}
										<svg
											className={cn(
												'h-3.5 w-3.5 transition-transform',
												openDropdown === group.label && 'rotate-180'
											)}
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth="2"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M19.5 8.25l-7.5 7.5-7.5-7.5"
											/>
										</svg>
									</button>

									{/* Product mega menu */}
									{openDropdown === group.label && isProductGroup(group.label) && (
										<div className="absolute -left-4 top-full z-50 mt-1 w-[780px] rounded-xl border border-zinc-200 bg-white px-8 pb-8 pt-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
											<div className="grid grid-cols-3 gap-x-12">
												{productMenuGroups!.map((pg) => (
													<div key={pg.slug}>
														<p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
															{pg.label}
														</p>
														<div>
															{pg.items.map((item) => (
																<Link
																	key={item.href}
																	href={item.href}
																	className="block py-1.5 text-[15px] text-zinc-900 transition-colors hover:text-brand-blue dark:text-zinc-200 dark:hover:text-blue-400"
																>
																	{item.label}
																</Link>
															))}
														</div>
													</div>
												))}
											</div>
											{productMenuFeatured && (
												<Link
													href={productMenuFeatured.href}
													className="mt-8 block border-t border-zinc-200 pt-6 dark:border-zinc-800"
												>
													<h4 className="text-base font-semibold text-black dark:text-white">
														{productMenuFeatured.title}
													</h4>
													<p className="mt-1.5 max-w-lg text-sm leading-relaxed text-body dark:text-zinc-400">
														{productMenuFeatured.description}
													</p>
													<span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-link">
														Learn more <ChevronRight />
													</span>
												</Link>
											)}
										</div>
									)}

									{/* Regular dropdown */}
									{openDropdown === group.label && !isProductGroup(group.label) && (
										<div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
											{group.items.map((item) => (
												<Link
													key={item.label + item.href}
													href={item.href}
													className="block px-3 py-2.5 text-sm text-zinc-900 transition-colors hover:text-brand-blue dark:text-zinc-200 dark:hover:text-blue-400"
												>
													{item.label}
												</Link>
											))}
										</div>
									)}
								</div>
							))}
							{/* Showcase + Pricing visible from md; Blog + Docs from lg (tablet matches reference) */}
							{standaloneNavLinks.map((link, index) => (
								<Link
									key={link.href}
									href={link.href}
									className={cn(
										'rounded-md px-3 py-2 text-sm transition-colors hover:text-brand-blue dark:hover:text-blue-400',
										pathname?.startsWith(link.href)
											? 'text-black dark:text-white'
											: 'text-zinc-700 dark:text-zinc-300',
										index >= 2 && 'hidden lg:inline-block'
									)}
								>
									{link.label}
								</Link>
							))}
						</nav>
					</div>
					<div className="flex items-center gap-3">
						<a
							href="https://github.com/tldraw/tldraw"
							target="_blank"
							rel="noopener noreferrer"
							className="hidden items-center gap-1.5 text-sm text-zinc-700 transition-colors hover:text-black dark:text-zinc-300 dark:hover:text-white lg:inline-flex"
						>
							<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path
									fillRule="evenodd"
									d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
									clipRule="evenodd"
								/>
							</svg>
							45K
						</a>
						<Button variant="blue" href="/quick-start" className="hidden sm:inline-flex">
							Quick Start
							<svg
								className="h-3.5 w-3.5"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="2.5"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
								/>
							</svg>
						</Button>
						<button
							type="button"
							className="inline-flex items-center justify-center rounded-md p-2 text-body hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							<span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
							{mobileMenuOpen ? (
								<svg
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							) : (
								<svg
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth="1.5"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
									/>
								</svg>
							)}
						</button>
					</div>
				</div>
			</header>
			<MobileMenu
				open={mobileMenuOpen}
				onClose={() => setMobileMenuOpen(false)}
				navGroups={navGroups}
				standaloneNavLinks={standaloneNavLinks}
			/>
		</>
	)
}
