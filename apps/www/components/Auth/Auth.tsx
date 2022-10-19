import { useRouter } from 'next/router'
import React, { FC, useEffect } from 'react'
import { useCheckInOut, useCurrentUserId, useLiveUsers } from '~hooks/useLiveUsers'
import styles from './Auth.module.css'

interface AuthProps {}

const Auth: FC<AuthProps> = () => {
  const u = useCurrentUserId()
  useCheckInOut(u)
  const users = useLiveUsers()
  return <div className={styles.Auth}>Auth Component</div>
}

export default Auth
