import { useEffect, useState } from 'react'
import { Volume2, Square } from 'lucide-react'
import { stripFurigana } from '../lib/furigana'
import { isSpeechSupported, speakJapanese, stopSpeaking } from '../lib/tts'

interface SpeakButtonProps {
  text: string
  className?: string
}

const DEFAULT_CLASSNAME =
  'border border-paper-line rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 text-indigo-soft'

export default function SpeakButton({ text, className }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => setSpeaking(false), [text])
  useEffect(() => stopSpeaking, [])

  if (!isSpeechSupported()) return null

  function toggle() {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    void speakJapanese(stripFurigana(text), () => setSpeaking(false))
  }

  return (
    <button onClick={toggle} className={className ?? DEFAULT_CLASSNAME}>
      {speaking ? <Square size={13} /> : <Volume2 size={13} />}
      {speaking ? 'Parar' : 'Ouvir'}
    </button>
  )
}
