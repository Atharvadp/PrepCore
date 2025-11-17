import { useState, useEffect, useRef } from 'react'

export function useTimer(initialMinutes: number = 25) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
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
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, timeLeft])

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
