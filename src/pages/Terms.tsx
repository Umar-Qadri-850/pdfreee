import { Link } from 'react-router'
import { ContentPage } from '@/components/layout/ContentPage'
import { SITE } from '@/lib/site'

export function Terms() {
  return (
    <ContentPage
      title="Terms of use"
      h1="Terms of use"
      description="The terms governing your use of the Pdfreee online PDF toolkit, including acceptable use and limitations of liability."
      path="/terms"
      intro="These terms describe the agreement between you and Pdfreee when you use the site. Please read them before relying on the tools for anything important."
      updated={SITE.legalUpdated}
    >
      <h2>Acceptance</h2>
      <p>By using {SITE.name}, you agree to these terms. If you do not agree, please do not use the site.</p>

      <h2>The service</h2>
      <p>
        {SITE.name} provides browser-based tools for working with PDF documents. The tools are
        provided free of charge for personal and commercial use. Core tools do not require an
        account.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>You must have the right to process any document you use with these tools.</li>
        <li>Do not use the site for unlawful purposes or to infringe others’ rights.</li>
        <li>Do not attempt to disrupt, overload, or abuse the service.</li>
      </ul>

      <h2>No guarantee of results</h2>
      <p>
        You are responsible for checking that the output of any tool meets your needs. Some operations
        have inherent limitations — for example, a lossless compression step may not reduce a file’s
        size, and text extraction cannot read a scanned image that has no text layer. We describe
        these limitations on each tool page and by using the tools you acknowledge them.
      </p>

      <h2>Availability</h2>
      <p>
        Because processing happens in your browser, the tools depend on your device, browser, and
        available memory. We do not promise uninterrupted availability, and we may change or remove
        features at any time.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The service is provided “as is” and “as available”, without warranties of any kind, express or
        implied, including merchantability, fitness for a particular purpose, and non-infringement.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {SITE.name} and its contributors are not liable for
        any indirect, incidental, or consequential damages, or for any loss of data or documents,
        arising from your use of the service. Always keep a copy of your original files.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The site’s name, wordmark, and original content belong to their respective owners. The
        underlying open-source libraries are used under their own licenses, listed in the project’s
        repository.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. Continued use of the site after changes constitutes acceptance.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, or the{' '}
        <Link to="/contact">contact page</Link>.
      </p>
    </ContentPage>
  )
}
