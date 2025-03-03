import { routeSameAxisLoToLoComplex } from './elbowArrowRoutes'
import { ElbowArrowInfoWithoutRoute } from './getElbowArrowInfo'

export function routeArrowWithAutoEdgePicking(info: ElbowArrowInfoWithoutRoute) {
	// return routeSameAxisHiToLo(info, 'x') || routeSameAxisHiToLo(info, 'y')

	// return routeSameAxisLoToHi(info, 'x') || routeSameAxisLoToHi(info, 'y')

	return routeSameAxisLoToLoComplex(info, 'x') // || routeSameAxisLoToLoComplex(info, 'y')

	// return routeCrossAxisHiToLoComplex(info, 'x') || routeCrossAxisHiToLoComplex(info, 'y')
}
