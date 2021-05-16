import { useEffect } from "react"
import state from "state"

export default function useLoadOnMount() {
  useEffect(() => {
    state.send("MOUNTED")
  }, [])
}
