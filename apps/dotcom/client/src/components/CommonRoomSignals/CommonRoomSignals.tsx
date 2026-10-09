import { Helmet } from 'react-helmet-async'
import { COMMON_ROOM_SNIPPET } from '../../../../../../internal/shared/common-room-signals'

export function CommonRoomSignals() {
	return (
		<Helmet>
			<script id="cr-relay-signals">{COMMON_ROOM_SNIPPET}</script>
		</Helmet>
	)
}
