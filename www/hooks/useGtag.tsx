import router from 'next/router'
import * as React from 'react'
import * as gtag from '../utils/gtag'

export default function useGtag() {
  React.useEffect(() => {
    function handleRouteChange(url: URL) {
      if (process.env.NODE_ENV !== 'production') {
        gtag.pageview(url)
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [])
}
