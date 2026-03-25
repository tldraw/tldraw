/** @public */
export interface TLUiPeopleMenuMoreProps {
	count: number
}

/** @public @react */
export function PeopleMenuMore({ count }: TLUiPeopleMenuMoreProps) {
	return <div className="tlui-people-menu__avatar tlui-people-menu__more">{Math.abs(count)}</div>
}
