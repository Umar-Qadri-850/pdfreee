import { Link } from 'react-router'
import { ContentPage } from '@/components/layout/ContentPage'

export function About() {
  return (
    <ContentPage
      title="About Pdfreee"
      h1="About Pdfreee"
      description="Pdfreee is a free, privacy-conscious online PDF toolkit. Learn why it exists, how it processes files, and what it deliberately does not do."
      path="/about"
      intro="A free PDF toolkit built around one idea: your documents should not have to leave your device just to be reorganised."
    >
      <h2>Why Pdfreee exists</h2>
      <p>
        Most online PDF tools ask you to upload a document to a server you do not control, wait in a
        queue, and trust that your file is deleted afterwards. For a bank statement, a signed
        contract, or a medical record, that is a lot of trust to place in a website you found five
        seconds ago.
      </p>
      <p>
        Pdfreee takes a different approach. The core tools run entirely in your browser using
        JavaScript. The file you select is read locally, processed locally, and the result is
        created locally. Nothing is uploaded, and there is no server-side copy to delete.
      </p>

      <h2>What we focus on</h2>
      <ul>
        <li>
          <strong>Working tools, not mockups.</strong> Every tool on this site performs a real
          operation on a real file.
        </li>
        <li>
          <strong>Honesty about limits.</strong> Compression does not always shrink a file. Scanned
          PDFs have no text to extract without OCR. We say so instead of overpromising.
        </li>
        <li>
          <strong>No account required.</strong> The core toolkit is usable without registration.
        </li>
        <li>
          <strong>Accessibility and speed.</strong> Semantic HTML, keyboard support, and a light
          bundle that works well on modest phones.
        </li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not show invented reviews, user counts, or fake statistics.</li>
        <li>We do not sell or share your documents — there is nothing to sell, because we never receive them.</li>
        <li>We do not claim a target file size that we cannot actually reach.</li>
      </ul>

      <h2>Where things are headed</h2>
      <p>
        Planned work includes optional OCR, more conversions, and additional editing tools. Planned
        features are listed as planned, not shipped, until they genuinely work. See the current
        status of every tool on the <Link to="/tools">tools page</Link> and in the project’s feature
        matrix.
      </p>

      <h2>Get in touch</h2>
      <p>
        Questions, bug reports, and tool requests are welcome on the{' '}
        <Link to="/contact">contact page</Link>.
      </p>
    </ContentPage>
  )
}
