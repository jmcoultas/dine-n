import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  
  useEffect(() => {
    const media = window.matchMedia(query)
    
    // Set the initial value
    setMatches(media.matches)
    
    // Define listener function
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }
    
    // Add the listener
    media.addEventListener("change", listener)
    
    // Clean up
    return () => {
      media.removeEventListener("change", listener)
    }
  }, [query])
  
  return matches
} 