import { routeCrossAxisLoToLo } from './elbowArrowRoutes'
import { ElbowArrowInfoWithoutRoute } from './getElbowArrowInfo'

export function routeArrowWithAutoEdgePicking(info: ElbowArrowInfoWithoutRoute) {
	// return routeSameAxisHiToLo(info, 'x') || routeSameAxisHiToLo(info, 'y')

	// return routeSameAxisLoToHi(info, 'x') || routeSameAxisLoToHi(info, 'y')

	// return routeSameAxisLoToLo(info, 'x') || routeSameAxisLoToLo(info, 'y')

	// return routeSameAxisHiToHi(info, 'x') || routeSameAxisHiToHi(info, 'y')

	// return routeCrossAxisHiToLo(info, 'x') || routeCrossAxisHiToLo(info, 'y')

	// return routeCrossAxisLoToHi(info, 'x') || routeCrossAxisLoToHi(info, 'y')

	return routeCrossAxisLoToLo(info, 'x') // || routeCrossAxisLoToLo(info, 'y')

	// return routeCrossAxisHiToHi(info, 'x') || routeCrossAxisHiToHi(info, 'y')
}
