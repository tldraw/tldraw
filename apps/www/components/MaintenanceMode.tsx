import { ReactNode, useEffect, useRef, useState } from 'react'
import { light, styled } from '~styles'

const CONTROL_SERVER = process.env.NEXT_PUBLIC_CONTROL_SERVER
  ? process.env.NEXT_PUBLIC_CONTROL_SERVER
  : process.env.NEXT_PUBLIC_ENABLE_DEV_CONTROL_SERVER
  ? 'http://localhost:3001'
  : null

type MaintenanceModeConfig =
  | {
      enabled: false
      ttlSeconds: number
    }
  | {
      enabled: true
      ttlSeconds: number
      titleMessage: string
      bodyMessageHtml: string
    }

type ControlResponse = {
  maintenance: MaintenanceModeConfig
}

export function MaintenanceMode({ children }: { children: ReactNode }) {
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceModeConfig | null>(null)

  useEffect(() => {
    if (!CONTROL_SERVER) return
    let isCancelled = false
    const updateMaintenanceMode = async () => {
      try {
        const response = await fetch(`${CONTROL_SERVER}/control.json`)
        const data: ControlResponse = await response.json()
        if (isCancelled) return
        setMaintenanceMode(data.maintenance)
      } catch {
        setMaintenanceMode({
          enabled: false,
          ttlSeconds: 60,
        })
      }
    }

    if (maintenanceMode) {
      const refreshTimeout = setTimeout(updateMaintenanceMode, maintenanceMode.ttlSeconds * 1000)
      return () => {
        isCancelled = true
        clearTimeout(refreshTimeout)
      }
    } else {
      updateMaintenanceMode()
      return () => {
        isCancelled = true
      }
    }
  }, [maintenanceMode])

  const isMaintenanceModeEnabled = maintenanceMode?.enabled ?? false
  const wasInMaintenanceModeRef = useRef(isMaintenanceModeEnabled)
  useEffect(() => {
    // If we were in maintenance mode and now we're not, reload the page
    if (wasInMaintenanceModeRef.current && !isMaintenanceModeEnabled) {
      window.location.reload()
    }
    wasInMaintenanceModeRef.current = isMaintenanceModeEnabled
  }, [isMaintenanceModeEnabled])

  if (maintenanceMode?.enabled) {
    return (
      <div className={`tldraw ${light}`}>
        <Container>
          <Modal>
            <Heading>{maintenanceMode.titleMessage}</Heading>
            <div dangerouslySetInnerHTML={{ __html: maintenanceMode.bodyMessageHtml }} />
          </Modal>
        </Container>
      </div>
    )
  }

  return <>{children}</>
}

const Container = styled('div', {
  backgroundColor: '$canvas',
  position: 'absolute',
  inset: 0,
  padding: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const Modal = styled('div', {
  backgroundColor: '$panel',
  padding: '1rem 1.5rem',
  borderRadius: '$2',
  boxShadow: '$8',
  maxWidth: '400px',
  width: '100%',
})

const Heading = styled('h2', {
  margin: 0,
  marginTop: '1rem',
})
