export interface NuStyleProps {
  strokeWidth: number
  stroke: string
  fill: string
}

export function withDefaultStyles<P>(props: P & Partial<NuStyleProps>): P & NuStyleProps {
  return Object.assign(
    {
      strokeWidth: 2,
      stroke: '#000000',
      fill: '#ffffff22',
    },
    props
  )
}
