import { Link } from 'react-router'
import { ContentPage } from '@/components/layout/ContentPage'

export function HowItWorks() {
  return (
    <ContentPage
      title="How Pdfreee works"
      h1="How Pdfreee works"
      description="An honest technical explanation of how Pdfreee processes PDF files locally in your browser, what libraries it uses, and what it means for your privacy."
      path="/how-it-works"
      intro="No upload queue, no server copy. Here is exactly what happens when you use a Pdfreee tool."
    >
      <h2>Processing happens in your browser</h2>
      <p>
        When you choose a PDF, your browser reads the file from your device into memory. The tools on
        this site manipulate those bytes directly inside the page using WebAssembly-free JavaScript
        libraries. The output is assembled in memory and offered to you as a download. At no point
        does the document travel over the network to a Pdfreee server.
      </p>
      <p>
        You can verify this yourself: open your browser’s developer tools, switch to the Network tab,
        and run a tool. You will see the initial page and script requests, but no request carrying
        your document’s contents.
      </p>

      <h2>The libraries that do the work</h2>
      <ul>
        <li>
          <strong>pdf-lib</strong> (MIT) reads and writes PDF structure — merging, splitting,
          rotating, deleting, reordering pages, stamping page numbers and watermarks, and building
          PDFs from images.
        </li>
        <li>
          <strong>PDF.js</strong> (Apache-2.0) renders pages to canvases for previews, image export,
          and text extraction.
        </li>
        <li>
          <strong>Browser canvas APIs</strong> encode images and build page previews.
        </li>
      </ul>
      <p>
        Heavy libraries are loaded only on the pages that need them. Opening the homepage does not
        download the PDF engine.
      </p>

      <h2>What this means for privacy</h2>
      <ul>
        <li>Your files are never uploaded to us or to any third party.</li>
        <li>We do not log document contents, filenames, or metadata — we never receive them.</li>
        <li>Closing or refreshing the tab clears processed data from memory.</li>
      </ul>
      <p>
        Read the full detail in the <Link to="/privacy-policy">privacy policy</Link>.
      </p>

      <h2>Honest limitations of a browser-only approach</h2>
      <ul>
        <li>
          <strong>Your device does the work.</strong> Very large documents are limited by available
          memory, not by a server quota.
        </li>
        <li>
          <strong>Some formats need a server.</strong> Converting a PDF to a fully editable Word file
          with perfect layout is a hard problem best handled by a dedicated engine such as
          LibreOffice. We have not shipped that, and we will not pretend otherwise.
        </li>
        <li>
          <strong>OCR is not included yet.</strong> Extracting text from a scanned image requires
          optical character recognition, which is planned but not part of this release.
        </li>
      </ul>

      <h2>Where a server would be used</h2>
      <p>
        If a future feature genuinely requires server-side processing — for example, high-fidelity
        office-format conversion — it would run as a separate, isolated service with its own limits
        and a clear, explicit notice at the point of upload. Core tools will continue to run locally.
      </p>

      <h2>Questions about the implementation?</h2>
      <p>
        The project is documented openly. See the <Link to="/about">About page</Link> for context or
        reach out through the <Link to="/contact">contact page</Link>.
      </p>
    </ContentPage>
  )
}
