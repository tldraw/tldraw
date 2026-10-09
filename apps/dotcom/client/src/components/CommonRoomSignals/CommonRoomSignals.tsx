import { Helmet } from 'react-helmet-async'
import { COMMON_ROOM_SNIPPET } from '../../../../../../internal/shared/common-room-signals'
import { isProductionEnv } from '../../utils/env'

export function CommonRoomSignals() {
	if (!isProductionEnv) return null

	return (
		<Helmet>
			<script id="cr-relay-signals">{COMMON_ROOM_SNIPPET}</script>
		</Helmet>
	)
}
