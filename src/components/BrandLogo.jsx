import { useEffect, useState } from 'react'
import { BRAND_LOGO_EVENT, getBrandLogoUrl, getBrandName, updateDocumentTitle, updateFavicon } from '../branding'

export default function BrandLogo({ size = 32, showName = true, subtitle, compact = false, color = '#fff' }) {
  const [logoUrl, setLogoUrl] = useState(getBrandLogoUrl)
  const [brandName, setBrandName] = useState(getBrandName)

  useEffect(() => {
    const refresh = () => {
      const nextLogo = getBrandLogoUrl()
      const nextName = getBrandName()
      setLogoUrl(nextLogo)
      setBrandName(nextName)
      updateFavicon(nextLogo)
      updateDocumentTitle(nextName)
    }

    refresh()
    window.addEventListener(BRAND_LOGO_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(BRAND_LOGO_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: compact ? 'flex-start' : 'center', gap: compact ? 8 : 10 }}>
      <img
        src={logoUrl}
        alt={`${brandName} logo`}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      />
      {showName && (
        <div style={{ textAlign: compact ? 'left' : 'center', lineHeight: 1.1 }}>
          <div style={{ fontWeight: 800, fontSize: compact ? 18 : 28, color, letterSpacing: compact ? '0.06em' : 1, maxWidth: compact ? 220 : 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandName}</div>
          {subtitle && (
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: compact ? 9 : 10, color: color === '#fff' ? 'rgba(255,255,255,0.35)' : '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
