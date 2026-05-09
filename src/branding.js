import defaultLogoUrl from './assets/isp-desk-logo.png'

export const DEFAULT_BRAND_NAME = 'ISP DESK'
export const BRAND_LOGO_STORAGE_KEY = 'isp_helpdesk_custom_logo'
export const BRAND_NAME_STORAGE_KEY = 'isp_helpdesk_brand_name'
export const BRAND_LOGO_EVENT = 'isp-helpdesk-branding-changed'

export function getBrandLogoUrl() {
  if (typeof window === 'undefined') return defaultLogoUrl
  return localStorage.getItem(BRAND_LOGO_STORAGE_KEY) || defaultLogoUrl
}

export function getBrandName() {
  if (typeof window === 'undefined') return DEFAULT_BRAND_NAME
  return localStorage.getItem(BRAND_NAME_STORAGE_KEY) || DEFAULT_BRAND_NAME
}

export function updateDocumentTitle(name = getBrandName()) {
  if (typeof document === 'undefined') return
  document.title = name
}

export function updateFavicon(url = getBrandLogoUrl()) {
  if (typeof document === 'undefined') return

  let icon = document.querySelector("link[rel='icon']")
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    icon.type = 'image/png'
    document.head.appendChild(icon)
  }
  icon.href = url
}

export function saveCustomLogo(dataUrl) {
  localStorage.setItem(BRAND_LOGO_STORAGE_KEY, dataUrl)
  updateFavicon(dataUrl)
  window.dispatchEvent(new Event(BRAND_LOGO_EVENT))
}

export function saveBrandName(name) {
  localStorage.setItem(BRAND_NAME_STORAGE_KEY, name.trim() || DEFAULT_BRAND_NAME)
  updateDocumentTitle()
  window.dispatchEvent(new Event(BRAND_LOGO_EVENT))
}

export function resetCustomLogo() {
  localStorage.removeItem(BRAND_LOGO_STORAGE_KEY)
  updateFavicon(defaultLogoUrl)
  window.dispatchEvent(new Event(BRAND_LOGO_EVENT))
}

export { defaultLogoUrl }
