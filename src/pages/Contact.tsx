import { useState, type FormEvent } from 'react'
import { ContentPage } from '@/components/layout/ContentPage'
import { SITE } from '@/lib/site'
import { Button, Field } from '@/components/ui'

export function Contact() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Pdfreee contact from ${name || 'a visitor'}`)
    const body = encodeURIComponent(message)
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <ContentPage
      title="Contact Pdfreee"
      h1="Contact us"
      description="Get in touch with the Pdfreee team about bug reports, tool requests, privacy questions, or general feedback."
      path="/contact"
      intro="Bug reports, tool requests, and questions are all welcome. This form opens your own email app — we do not run a submission server."
    >
      <h2>Email us directly</h2>
      <p>
        The fastest route is a plain email to{' '}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Include your browser and operating system
        if you are reporting a bug, and a description of the file if it is relevant (never send
        sensitive documents unless you are comfortable doing so).
      </p>

      <h2>Compose a message</h2>
      <form
        className="not-prose mt-4 max-w-xl space-y-4 rounded-lg border border-line bg-surface p-5"
        onSubmit={onSubmit}
      >
        <Field label="Your name" htmlFor="name">
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
            placeholder="Your name"
          />
        </Field>
        <Field label="Message" htmlFor="message" hint="Press send to open this in your email app.">
          <textarea
            id="message"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            placeholder="How can we help?"
          />
        </Field>
        <Button type="submit">Open email draft</Button>
        {sent ? (
          <p role="status" className="text-sm text-success">
            Your email app should now be open with the message ready to send.
          </p>
        ) : null}
      </form>

      <h2>What we can and cannot help with</h2>
      <ul>
        <li>We can help with tool bugs, unclear documentation, and privacy questions.</li>
        <li>
          We cannot recover a document you processed, because we never receive or store your files.
        </li>
        <li>We cannot unlock a password-protected PDF for you; that must be done at the source.</li>
      </ul>

      <p className="text-sm text-ink-muted">
        Note: this site has no contact backend. The button above uses your device’s email client so
        your message is sent from your own address rather than collected on a server.
      </p>
    </ContentPage>
  )
}
