export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesPromise) return voicesPromise
  voicesPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => resolve(window.speechSynthesis.getVoices()),
      { once: true },
    )
  })
  return voicesPromise
}

// macOS/iOS ship a set of "novelty" character voices (Eddy, Flo, Grandma,
// Grandpa, Reed, Rocko, Sandy, Shelley, plus the classic Zarvox/Bahh/Trinoids
// family) localized into every language, including Japanese. They sort
// before the real voice (Kyoko) in getVoices() and sound like a cartoon
// robot, so they're excluded here in favor of an actual JA voice.
const NOVELTY_VOICE_NAMES = new Set([
  'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bruce', 'Bubbles', 'Cellos', 'Deranged',
  'Eddy', 'Flo', 'Fred', 'Good News', 'Grandma', 'Grandpa', 'Hysterical', 'Jester', 'Junior',
  'Kathy', 'Organ', 'Princess', 'Ralph', 'Reed', 'Rocko', 'Sandy', 'Shelley', 'Superstar',
  'Trinoids', 'Whisper', 'Wobble', 'Zarvox',
])

function baseVoiceName(voice: SpeechSynthesisVoice): string {
  return voice.name.replace(/\s*\(.*\)\s*$/, '').trim()
}

async function pickJapaneseVoice(): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await loadVoices()
  const japanese = voices.filter((v) => v.lang === 'ja-JP' || v.lang.startsWith('ja'))
  if (japanese.length === 0) return undefined

  const realVoices = japanese.filter((v) => !NOVELTY_VOICE_NAMES.has(baseVoiceName(v)))
  const pool = realVoices.length > 0 ? realVoices : japanese

  // If a higher-quality voice pack was downloaded (System Settings ->
  // Accessibility -> Spoken Content -> Japanese -> Enhanced/Premium), prefer it.
  const upgraded = pool.find((v) => /enhanced|premium|neural/i.test(v.name))
  if (upgraded) return upgraded

  const kyoko = pool.find((v) => baseVoiceName(v) === 'Kyoko')
  if (kyoko) return kyoko

  return pool[0]
}

export async function speakJapanese(text: string, onEnd?: () => void): Promise<void> {
  if (!isSpeechSupported() || !text.trim()) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const voice = await pickJapaneseVoice()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.9
  if (voice) utterance.voice = voice
  utterance.onend = () => onEnd?.()
  utterance.onerror = () => onEnd?.()
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
