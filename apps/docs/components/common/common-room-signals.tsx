import Script from 'next/script'
import { COMMON_ROOM_SNIPPET } from '../../../../internal/shared/common-room-signals'

export function CommonRoomSignals() {
	if (process.env.VERCEL_ENV !== 'production') return null

	return (
		<Script id="cr-relay-signals" strategy="afterInteractive">
			{COMMON_ROOM_SNIPPET}
		</Script>
	)
}
