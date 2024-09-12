import { PageTitle } from '@/components/common/page-title'
import { RequestForm } from '@/components/marketing/request-form'
import { CheckBadgeIcon } from '@heroicons/react/20/solid'

export default function PricingPage() {
	return (
		<main className="w-full max-w-3xl px-5 py-24 mx-auto md:pr-0 lg:pl-12 xl:pr-12 md:pt-8">
			<div className="pb-6 mb-6 border-b md:mb-12 md:pb-12 border-zinc-100 dark:border-zinc-800">
				<PageTitle className="text-center">License and Pricing</PageTitle>
			</div>
			<div className="mx-auto max-w-xl pb-10">
				<p>
					{`You can use the tldraw SDK for free in commercial or non-commercial projects so long as the
				"Made with tldraw" image link is present. If you would like to remove the link, you can
				purchase a business license.`}{' '}
					For more information,{' '}
					<a className="text-blue-500" href="https://github.com/tldraw/tldraw/blob/main/LICENSE.md">
						read our license
					</a>
					.
				</p>
			</div>
			<div className="py-1 md:rounded-2xl md:mx-auto md:px-1 bg-zinc-200 dark:bg-zinc-800 max-w-2xl">
				<div className="relative w-full h-full bg-zinc-900 md:rounded-xl shadow p-5 md:p-8 overflow-hidden text-zinc-300">
					<div className="flex items-center gap-1 mb-4 -mt-1">
						<h3 className="text-white font-black text-xl md:text-2xl">Business License</h3>
						<CheckBadgeIcon className="h-6 shrink-0 text-blue-400" />
					</div>
					<p className="pr-8">
						Interested in purchasing a business license for the tldraw SDK? Please fill out our form
						and we will get back to you with more information.
					</p>
					<RequestForm />
				</div>
			</div>
		</main>
	)
	return
}
