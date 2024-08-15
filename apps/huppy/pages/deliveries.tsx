import { assert } from '@tldraw/utils'
import { GetServerSideProps } from 'next'
import { useEffect, useState } from 'react'
import { getAppOctokit } from '../src/octokit'

interface Props {
	deliveries: {
		id: number
		guid: string
		delivered_at: string
		redelivery: boolean
		duration: number
		status: string
		status_code: number
		event: string
		action: string | null
		installation_id: number | null
		repository_id: number | null
	}[]
	cursor: string | null
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
	assert(process.env.NODE_ENV !== 'production')

	const gh = getAppOctokit()
	const deliveries = await gh.octokit.rest.apps.listWebhookDeliveries({
		per_page: 100,
		cursor: (context.query.cursor as string) ?? undefined,
	})

	const nextLinkMatch = deliveries.headers.link?.match(/(?<=<)([\S]*)(?=>; rel="Next")/i)
	let cursor: string | null = null
	if (nextLinkMatch) {
		const url = new URL(nextLinkMatch[0])
		cursor = url.searchParams.get('cursor')
	}

	return { props: { deliveries: deliveries.data, cursor } }
}

interface SelectedDelivery {
	id: number
	data?: unknown
}

export default function Deliveries({ deliveries, cursor }: Props) {
	const [selectedDelivery, setSelectedDelivery] = useState<SelectedDelivery | null>(null)
	const [isSimulating, setIsSimulating] = useState(false)
	const [isRedelivering, setIsRedelivering] = useState(false)

	useEffect(() => {
		if (!selectedDelivery || (selectedDelivery && selectedDelivery.data)) return

		let cancelled = false
		;(async () => {
			const response = await fetch(`/api/dev/getDelivery?id=${selectedDelivery.id}`)
			const data = await response.json()
			if (cancelled) return
			setSelectedDelivery({ id: selectedDelivery.id, data })
		})()

		return () => {
			cancelled = true
		}
	})

	return (
		<div className="absolute inset-0 flex h-screen flex-col overflow-hidden">
			<h1 className="flex-none border-b px-5 py-4 text-xl">Deliveries</h1>
			<div className="flex flex-auto overflow-hidden">
				<ol className="w-96 flex-none overflow-auto border-r">
					{deliveries.map((delivery) => (
						<li
							key={delivery.id}
							className={`border-b px-5 py-3 ${
								selectedDelivery?.id === delivery.id ? 'bg-blue-100' : 'hover:bg-gray-50'
							}`}
							onClick={() => setSelectedDelivery({ id: delivery.id })}
						>
							<div className="font-semibold">
								{delivery.event}
								{delivery.action && `.${delivery.action}`}
							</div>
							<div className="text-sm">{formatDate(new Date(delivery.delivered_at))}</div>
						</li>
					))}
					<li>
						<a
							className="center flex items-center justify-center border-b px-5 py-3 hover:bg-gray-50"
							href={`?cursor=${cursor}`}
						>
							Load more...
						</a>
					</li>
				</ol>
				{selectedDelivery && selectedDelivery.data ? (
					<div className="relative flex-auto overflow-hidden text-sm">
						<pre className="absolute inset-0 overflow-auto whitespace-pre-wrap p-4">
							{JSON.stringify(selectedDelivery.data, null, '\t')}
						</pre>
						<div className="absolute right-8 top-4 flex gap-3">
							<button
								className="center w-24 rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
								onClick={async () => {
									setIsRedelivering(true)
									try {
										await fetch(`/api/dev/redeliver`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({ id: selectedDelivery.id }),
										})
									} finally {
										setIsRedelivering(false)
									}
								}}
								disabled={isRedelivering}
							>
								{isRedelivering ? '...' : 'Redeliver'}
							</button>
							<button
								className="center w-24 rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
								onClick={async () => {
									setIsSimulating(true)
									try {
										const response = await fetch(`/api/dev/simulate`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({ id: selectedDelivery.id }),
										})
										const { message } = await response.json()
										alert(message)
									} finally {
										setIsSimulating(false)
									}
								}}
								disabled={isSimulating}
							>
								{isSimulating ? '...' : 'Simulate'}
							</button>
						</div>
					</div>
				) : selectedDelivery ? (
					<div className="center flex flex-auto items-center justify-center text-xl text-gray-300">
						loading...
					</div>
				) : null}
			</div>
		</div>
	)
}

function formatDate(date: Date) {
	const intl = new Intl.DateTimeFormat('en-GB', {
		dateStyle: 'short',
		timeStyle: 'short',
	})

	return intl.format(date)
}
