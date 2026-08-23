'use client'

import { useIdleSessionTimeout } from '@/hooks/useIdleSessionTimeout'
import { SessionTimeoutModal }   from './SessionTimeoutModal'

export function SessionTimeoutManager() {
  const { showWarning, secondsRemaining, onStayConnected, onLogoutNow } = useIdleSessionTimeout()

  return (
    <SessionTimeoutModal
      open={showWarning}
      secondsRemaining={secondsRemaining}
      onStayConnected={onStayConnected}
      onLogoutNow={onLogoutNow}
    />
  )
}
