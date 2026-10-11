/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string
  readonly VITE_ADSENSE_ENABLED?: string
  readonly VITE_ADSENSE_CLIENT?: string
  readonly VITE_ADSENSE_SLOT_TOP?: string
  readonly VITE_ADSENSE_SLOT_BOTTOM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
