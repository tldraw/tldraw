export function replaceInArray<T>(array: T[], index: number, value: T) {
	const newArray = array.slice()
	newArray[index] = value
	return newArray
}
