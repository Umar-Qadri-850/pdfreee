import { Link } from 'react-router'
import { ContentPage } from '@/components/layout/ContentPage'
import { SITE } from '@/lib/site'

export function PrivacyPolicy() {
  return (
    <ContentPage
      title="Privacy policy"
      h1="Privacy policy"
      description="How Pdfreee handles your documents and data. The core tools process files locally in your browser, so your documents are never uploaded."
      path="/privacy-policy"
      intro="Plain-language summary: the core PDF tools run in your browser and do not upload your documents. This page explains the details and any exceptions."
    >
      <h2>The short version</h2>
      <ul>
        <li>The core PDF tools process your files entirely in your browser.</li>
        <li>We do not receive, store, or log your documents, their filenames, or their contents.</li>
        <li>You can use the core tools without creating an account.</li>
      </ul>

      <h2>Your documents</h2>
      <p>
        When you use a core tool (merge, split, compress, rotate, page editing, image conversion,
        page numbering, watermarking, text extraction, or the reader), the file is read into your
        browser’s memory and processed there. The result is generated locally and downloaded from
        your own device. No document bytes are sent to {SITE.name} or to any third party as part of
        these operations.
      </p>
      <p>
        Because we never receive your files, we cannot access, recover, or delete them. Clearing your
        browser tab or session removes the processed data from memory.
      </p>

      <h2>What we may collect</h2>
      <p>
        We aim to keep data collection minimal. Depending on how this site is deployed and configured
        by its operator, the following may apply:
      </p>
      <ul>
        <li>
          <strong>Standard server logs.</strong> A hosting provider may record IP addresses, user
          agents, and requested URLs for security and reliability. These logs do not include
          document contents.
        </li>
        <li>
          <strong>Optional analytics.</strong> If analytics are enabled by the site operator, they
          would be limited to page-level usage and would never receive uploaded files. No analytics
          are enabled by default in this project.
        </li>
        <li>
          <strong>Optional advertising.</strong> Advertising is disabled by default. If the operator
          enables it, ads would be configured according to the <Link to="/cookie-policy">cookie
          policy</Link> and applicable consent rules.
        </li>
      </ul>

      <h2>Cookies and local storage</h2>
      <p>
        The core toolkit does not require cookies to function. See the{' '}
        <Link to="/cookie-policy">cookie policy</Link> for the current, honest state of cookie and
        storage usage.
      </p>

      <h2>Third parties</h2>
      <p>
        The core tools do not send your documents to any third party. Fonts are system fonts, so no
        font service is contacted. If the operator enables advertising or analytics, the relevant
        providers are named in the cookie policy.
      </p>

      <h2>Children</h2>
      <p>
        This site is a general-purpose productivity tool and is not directed at children. We do not
        knowingly collect personal information from children.
      </p>

      <h2>Your rights</h2>
      <p>
        Because we do not hold your documents or a personal account, there is generally nothing about
        your document activity for us to export or erase. For questions about any data we do hold,
        contact us using the details below.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy as the product changes. Material changes will be reflected on this
        page with an updated revision note.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions can be sent to <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or through
        the <Link to="/contact">contact page</Link>.
      </p>
    </ContentPage>
  )
}
