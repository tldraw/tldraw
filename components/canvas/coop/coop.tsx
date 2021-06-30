import Cursor from './cursor'
import { useCoopSelector } from 'state/coop/coop-state'
import { useSelector } from 'state'

export default function Presence(): JSX.Element {
  const others = useCoopSelector((s) => s.data.others)
  const currentPageId = useSelector((s) => s.data.currentPageId)

  return (
    <>
      {Object.values(others).map(({ connectionId, presence }) => {
        if (presence === null) return null
        if (presence.pageId !== currentPageId) return null

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
