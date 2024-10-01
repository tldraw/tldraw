import { tlenv } from '../globals/environment'

/** @internal */
export const isAccelKey = <InputType extends { metaKey: boolean; ctrlKey: boolean }>(
	e: InputType
) => {
	return tlenv.isDarwin ? e.metaKey : e.ctrlKey || e.metaKey
}
