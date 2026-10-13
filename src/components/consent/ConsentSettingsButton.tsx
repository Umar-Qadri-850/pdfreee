import { Button } from '@/components/ui'
import { openConsentPreferences } from '@/lib/consent'

/** Reopen the consent panel from anywhere (footer, cookie policy). */
export function ConsentSettingsButton({ className }: { className?: string }) {
  return (
    <Button variant="secondary" size="sm" className={className} onClick={openConsentPreferences}>
      Cookie settings
    </Button>
  )
}
