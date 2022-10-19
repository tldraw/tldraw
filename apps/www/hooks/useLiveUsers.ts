import cloudbase from '@cloudbase/js-sdk'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'

const app = cloudbase.init({
  env: 'cloudbase-prepaid-4eiods2e0a26e3',
})

app.auth({
  persistence: 'local',
})

const db = app.database()

const changeLiveStatus = (userId: string, status: boolean) => {
  return db.collection('user-live').doc(userId).set({
    whiteboardLive: true,
  })
}

export const useCurrentUserId = () => {
  const router = useRouter()
  const { u } = router.query as { u: string | undefined }
  return u
}

export const useCheckInOut = (userId: string) => {
  useEffect(() => {
    if (userId) changeLiveStatus(userId, true)
    return () => {
      if (userId) changeLiveStatus(userId, false)
    }
  }, [userId])
}

export const useLiveUsers = () => {
  const [liveUsers, setLiveUsers] = useState<{ _id: string; whiteboardLive: boolean }[]>([])
  const listner = useCallback((snapshot: any) => {
    setLiveUsers(snapshot.docs)
  }, [])
  useEffect(() => {
    db.collection('user-live')
      .where({
        whiteboardLive: true,
      })
      .watch({
        onChange: listner,
        onError: console.error,
      })
  }, [listner])
  return liveUsers
}
