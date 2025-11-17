import { useEffect } from 'react'
import { useTimer } from '../../utils/useTimer'
import { Play, Pause, X } from 'lucide-react'

interface SessionTimerProps {
  duration: number
  taskTitle?: string
  onComplete: () => void
  onCancel: () => void
}

export default function SessionTimer({
  duration,
  taskTitle,
  onComplete,
  onCancel,
}: SessionTimerProps) {
  const { timeLeft, isRunning, isCompleted, start, pause, formatTime } = useTimer(duration)

  useEffect(() => {
    if (isCompleted) {
      onComplete()
    }
  }, [isCompleted, onComplete])

  // Keyboard shortcut: Space to play/pause
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (isRunning) {
          pause()
        } else {
          start()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isRunning, start, pause])

  const progressPercentage = ((duration * 60 - timeLeft) / (duration * 60)) * 100

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/10 to-calm/30 flex items-center justify-center z-50 animate-fadeIn">
      <div className="max-w-2xl w-full mx-4">
        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="mb-4 text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2 btn-scale"
        >
          <X size={20} />
          <span>End Session</span>
        </button>

        {/* Timer Card */}
        <div className="bg-surface rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {taskTitle && (
            <div className="mb-8 animate-slideIn">
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                Working on
              </p>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">{taskTitle}</h2>
            </div>
          )}

          {/* Large Timer Display with Pulse Animation */}
          <div className="mb-8">
            <div
              className={`text-6xl md:text-8xl font-bold text-primary mb-4 font-mono transition-all ${
                isRunning ? 'animate-pulse' : ''
              }`}
            >
              {formatTime()}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-6">
            {!isRunning ? (
              <button
                onClick={start}
                className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg btn-scale"
              >
                <Play size={24} />
                Start
              </button>
            ) : (
              <button
                onClick={pause}
                className="flex items-center gap-2 px-8 py-4 bg-secondary text-white rounded-xl font-semibold text-lg hover:bg-secondary/90 transition-all shadow-lg btn-scale"
              >
                <Pause size={24} />
                Pause
              </button>
            )}
          </div>

          {/* Keyboard Shortcut Hint */}
          <p className="text-sm text-gray-500">
            Press <kbd className="px-2 py-1 bg-gray-200 rounded font-mono text-xs">Space</kbd> to
            play/pause
          </p>
        </div>
      </div>
    </div>
  )
}
