import { Link } from 'react-router'
import { ContentPage } from '@/components/layout/ContentPage'
import { ConsentSettingsButton } from '@/components/consent/ConsentSettingsButton'
import { useConsent } from '@/components/consent/useConsent'
import { ADSENSE } from '@/lib/ads'
import { SITE } from '@/lib/site'

export function CookiePolicy() {
  const adsOn = ADSENSE.enabled
  const consent = useConsent()
  const cookieChoice =
    consent === null
      ? 'not chosen yet'
      : consent.advertising
        ? 'allowed optional advertising storage'
        : 'rejected optional advertising storage'
  return (
    <ContentPage
      title="Cookie policy"
      h1="Cookie policy"
      description="What cookies and local storage Pdfreee uses, honestly stated: the core toolkit requires none, and advertising is disabled unless explicitly configured."
      path="/cookie-policy"
      intro="This policy reflects the actual configuration of this site rather than a generic template."
      updated={SITE.legalUpdated}
    >
      <h2>Current status</h2>
      <ul>
        <li>The core PDF tools do not require cookies or any persistent client storage.</li>
        <li>
          Advertising is <strong>{adsOn ? 'enabled by the site operator' : 'disabled'}</strong> in
          this configuration.
        </li>
        <li>
          Your stored choice: <strong>{cookieChoice}</strong>.
        </li>
      </ul>
      <p>
        You can change your choice at any time.
      </p>
      <p>
        <ConsentSettingsButton />
      </p>

      <h2>Strictly necessary storage</h2>
      <p>
        This site stores one small record of your own cookie choice in your browser’s local storage,
        under the key <code>pdfreee.consent</code>. It holds a version number, the date of your
        choice, and whether you allowed optional advertising storage. It is used only to remember
        your decision and is never sent anywhere.
      </p>
      <p>
        A hosting provider may also set cookies at the network edge for security (for example, bot
        mitigation or load balancing). These are not used to profile you and are not controlled by
        the application.
      </p>

      <h2>Analytics</h2>
      <p>
        No analytics product is enabled by default by this project. If the operator adds one, it
        should be disclosed here, configured to respect applicable consent requirements, and must
        never receive uploaded documents (which, for the core tools, are never uploaded anyway).
      </p>

      <h2>Advertising and consent</h2>
      <p>
        If the operator enables advertising (for example through Google AdSense), the following
        applies:
      </p>
      <ul>
        <li>
          Advertising must not be placed inside file operations, processing dialogs, or download
          actions.
        </li>
        <li>
          Where required by law — for example in the EEA, UK, or Switzerland — a Google-certified
          consent management platform (CMP) must be configured before ads are served, and ads must
          honour the user’s consent choices.
        </li>
        <li>
          The operator is responsible for providing the correct publisher ID and ad slot IDs.
          {SITE.name} never ships invented IDs.
        </li>
      </ul>
      <p>
        Enabling advertising is entirely optional and is off in this release. No placeholder ads are
        displayed to visitors.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can block or delete cookies through your browser settings. Blocking strictly necessary
        cookies may affect security features added by the hosting layer, but it does not prevent the
        core PDF tools from working, because they do not rely on cookies.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or the{' '}
        <Link to="/contact">contact page</Link>.
      </p>
    </ContentPage>
  )
}
