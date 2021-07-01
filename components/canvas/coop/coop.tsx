import Cursor from './cursor'
import { useCoopSelector } from 'state/coop/coop-state'
import { useSelector } from 'state'

export default function Presence(): JSX.Element {
  const others = useCoopSelector((s) => s.data.others)
  const currentPageId = useSelector((s) => s.data.currentPageId)

  if (!others) return null

  return (
    <>
      {Object.values(others)
        .filter(({ presence }) => presence?.pageId === currentPageId)
        .map(({ connectionId, presence }) => {
          return (
            <Cursor
              key={`cursor-${connectionId}`}
              color={'red'}
              duration={presence.duration}
              times={presence.times}
              bufferedXs={presence.bufferedXs}
              bufferedYs={presence.bufferedYs}
            />
          )
        })}
    </>
  )
}
