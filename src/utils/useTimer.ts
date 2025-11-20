import { useState, useEffect, useRef } from 'react'

export function useTimer(initialMinutes: number = 25) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)

  // Request wake lock to keep screen on
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        console.log('Wake Lock activated - screen will stay on')
      }
    } catch (err) {
      console.log('Wake Lock error:', err)
    }
  }

  // Release wake lock to allow screen sleep
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        console.log('Wake Lock released - screen can sleep')
      } catch (err) {
        console.log('Wake Lock release error:', err)
      }
    }
  }

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      // Activate wake lock when timer starts
      requestWakeLock()

      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsCompleted(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      // Release wake lock when timer stops/pauses/completes
      releaseWakeLock()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      releaseWakeLock()
    }
  }, [isRunning, timeLeft])

  // Re-acquire wake lock if page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isRunning])

  const start = () => setIsRunning(true)
  
  const pause = () => setIsRunning(false)
  
  const reset = (minutes: number = initialMinutes) => {
    setTimeLeft(minutes * 60)
    setIsRunning(false)
    setIsCompleted(false)
  }

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return {
    timeLeft,
    isRunning,
    isCompleted,
    start,
    pause,
    reset,
    formatTime,
  }
}
