export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[notifications] Notifications not supported')
    return false
  }
  
  if (Notification.permission === 'granted') {
    console.log('[notifications] Permission already granted')
    return true
  }
  
  if (Notification.permission === 'denied') {
    console.log('[notifications] Permission denied by user')
    return false
  }
  
  try {
    const permission = await Notification.requestPermission()
    console.log('[notifications] Permission result:', permission)
    return permission === 'granted'
  } catch (err) {
    console.error('[notifications] Error requesting permission:', err)
    return false
  }
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export function showNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }
  
  if (Notification.permission !== 'granted') {
    return null
  }

  try {
    const isMuted = localStorage.getItem('notificationsMuted') === 'true'
    if (isMuted) {
      return null
    }
  } catch {
  }
  
  try {
    const notification = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: options.tag || 'airdrop',
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      ...options
    })
    
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    
    notification.onerror = (err) => {
      console.error('[notifications] Notification error:', err)
    }
    
    setTimeout(() => {
      notification.close()
    }, 5000)
    
    console.log('[notifications] Notification shown:', title)
    return notification
  } catch (err) {
    console.error('[notifications] Error showing notification:', err)
    return null
  }
}

