import { todayStr } from './date'

// Local daily reminder. PWAs on iOS/Android have no reliable way to wake up
// in the background without a push server, so this is intentionally modest:
// while the app is open (or briefly on launch) it checks whether today's
// entry is still missing and, past a certain hour, nudges the user once.
const LAST_SHOWN_KEY = 'jp-daily-reading-reminder-last-shown'
const REMINDER_HOUR = 19 // 19:00 local time

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  return Notification.requestPermission()
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function maybeShowDailyReminder(hasTodayEntry: boolean): Promise<void> {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return
  if (hasTodayEntry) return

  if (new Date().getHours() < REMINDER_HOUR) return

  const todayKey = todayStr()
  if (localStorage.getItem(LAST_SHOWN_KEY) === todayKey) return

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('日々の一文', {
    body: 'Seu parágrafo de hoje ainda não foi lido. Que tal agora?',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'daily-reading-reminder',
  })
  localStorage.setItem(LAST_SHOWN_KEY, todayKey)
}
