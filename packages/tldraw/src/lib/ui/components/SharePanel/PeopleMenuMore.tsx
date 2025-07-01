export function PeopleMenuMore({ count }: { count: number }) {
	return <div className="tlui-people-menu__avatar tlui-people-menu__more">{Math.abs(count)}</div>
}
