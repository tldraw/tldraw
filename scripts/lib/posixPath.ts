import isWin32 from './isWin32'

export default (path: string) => (isWin32() ? path.replace(/\\/g, '/') : path)
