export type TLAnalyticsPoint = {
	type: 'outstanding_data_messages'
	length: number
	num_clients: number
}

export const NO_TL_ANALYTICS = (_: TLAnalyticsPoint) => {
	// noop
}
