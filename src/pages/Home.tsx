import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, Lock, Search, Sparkles, Zap } from 'lucide-react'
import { TOOL_CATEGORIES, TOOLS, type ToolDefinition } from '@/content/registry'
import { filterTools } from '@/components/ToolSearch'
import { ToolCard } from '@/components/ToolCard'
import { ToolIcon } from '@/components/ToolIcon'
import { AdSlot } from '@/components/ads/AdSlot'
import { ADSENSE } from '@/lib/ads'
import { buttonClasses, SectionHeading } from '@/components/ui'
import { useSeo, breadcrumbJsonLd, siteOrigin } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { POSTS } from '@/content/blog'
import { HOME_FAQS } from '@/content/faq'
import { getTool } from '@/content/registry'
import { formatDate } from '@/lib/utils'

const HOME_FAQ = HOME_FAQS

function HeroSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const results = useMemo(() => (query ? filterTools(query).slice(0, 5) : []), [query])

  return (
    <div className="relative mt-8 max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (results[0]) navigate(results[0].path)
          else navigate('/tools')
        }}
      >
        <Search
          className="pointer-events-none absolute left-4 top-[22px] h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to do? e.g. merge, compress, rotate…"
          aria-label="Search PDF tools"
          className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-11 pr-28 text-sm shadow-xs outline-none focus:border-accent"
        />
        <button
          type="submit"
          className={buttonClasses('primary', 'sm', 'absolute right-2 top-2')}
          aria-label={results[0] ? `Open ${results[0].name}` : 'Browse all tools'}
        >
          {results[0] ? 'Open' : 'Browse'}
        </button>
      </form>
      {results.length > 0 ? (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-md">
          {results.map((tool) => (
            <li key={tool.slug}>
              <Link
                to={tool.path}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunken"
              >
                <ToolIcon name={tool.icon} className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-ink">{tool.name}</span>
                <span className="ml-auto truncate text-xs text-ink-muted">{tool.tagline}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              to="/tools"
              className="block border-t border-line bg-surface-sunken/50 px-4 py-2 text-xs font-medium text-accent-strong hover:bg-surface-sunken"
            >
              See all tools →
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  )
}

function DocumentVisual() {
  return (
    <div className="relative mx-auto hidden w-full max-w-md lg:block" aria-hidden="true">
      <div className="absolute left-2 top-8 h-64 w-44 -rotate-6 rounded-lg border border-line bg-surface shadow-sm" />
      <div className="absolute left-16 top-4 h-64 w-44 rotate-3 rounded-lg border border-line bg-surface shadow-sm" />
      <div className="relative ml-28 mt-6 h-64 w-48 rotate-0 rounded-lg border border-line bg-surface p-5 shadow-md">
        <div className="h-2.5 w-16 rounded-full bg-accent" />
        <div className="mt-5 space-y-2.5">
          <div className="h-2 w-full rounded-full bg-line-strong" />
          <div className="h-2 w-4/5 rounded-full bg-line-strong" />
          <div className="h-2 w-full rounded-full bg-line" />
          <div className="h-2 w-3/5 rounded-full bg-line" />
        </div>
        <div className="mt-6 h-20 w-full rounded-md border border-dashed border-line-strong bg-surface-sunken/60" />
        <div className="mt-4 space-y-2.5">
          <div className="h-2 w-full rounded-full bg-line" />
          <div className="h-2 w-2/3 rounded-full bg-line" />
        </div>
      </div>
      <div className="absolute -bottom-2 right-6 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium shadow-sm">
        <span className="text-success">✓</span> Processed locally
      </div>
    </div>
  )
}

function StepCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <span className="font-display text-3xl font-semibold text-accent">{n}</span>
      <h3 className="mt-3 font-sans text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
    </div>
  )
}

const POPULAR_SLUGS = ['merge-pdf', 'compress-pdf', 'split-pdf', 'pdf-to-jpg', 'jpg-to-pdf', 'add-page-numbers']

export function Home() {
  const origin = siteOrigin()
  const popular = POPULAR_SLUGS.map((s) => getTool(s)).filter((t): t is ToolDefinition => Boolean(t))
  const recentPosts = POSTS.slice(0, 3)

  useSeo({
    title: 'Pdfreee — PDF tools that just work',
    description: SITE.description,
    path: '/',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE.name,
        url: origin,
        logo: `${origin}/favicon.svg`,
        description: SITE.description,
        email: SITE.email,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE.name,
        url: origin,
        description: SITE.description,
        inLanguage: 'en',
      },
      breadcrumbJsonLd([{ name: 'Home', path: '/' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: HOME_FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  })

  return (
    <>
      <section className="border-b border-line bg-paper">
        <div className="container-page grid gap-12 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft">
              <Zap className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              Free · No sign-up · Runs in your browser
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              PDF tools that just work.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Merge, split, compress, rotate, convert and edit PDF files free, online, and without
              uploading your documents anywhere. Everything happens on your device.
            </p>
            <HeroSearch />
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-success" aria-hidden="true" /> Files never leave your device
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" /> No account needed
              </span>
            </div>
          </div>
          <DocumentVisual />
        </div>
      </section>

      <section className="container-page py-16" aria-labelledby="tools-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="The toolkit"
            title="Pick a tool and get going"
            description="Grouped by what you are trying to do. Every link below opens a tool that actually performs the operation."
          />
          <Link to="/tools" className={buttonClasses('secondary', 'sm')}>
            View all tools
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {TOOL_CATEGORIES.map((c) => {
            const tools = TOOLS.filter((t) => t.category === c.id)
            return (
              <div key={c.id} className="rounded-xl border border-line bg-surface-sunken/40 p-6">
                <h3 className="font-sans text-lg font-semibold">{c.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{c.description}</p>
                <ul className="mt-4 space-y-1.5">
                  {tools.map((tool) => (
                    <li key={tool.slug}>
                      <Link
                        to={tool.path}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-surface"
                      >
                        <ToolIcon name={tool.icon} className="h-4 w-4 text-accent" />
                        <span className="font-medium text-ink">{tool.name}</span>
                        <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container-page py-16">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps, no learning curve"
            description="The same simple flow for every tool."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StepCard
              n={1}
              title="Choose a tool"
              body="Open the tool that matches your task — merge, split, compress, and so on."
            />
            <StepCard
              n={2}
              title="Process your document"
              body="Drop in your file, adjust the options, and let your browser do the work locally."
            />
            <StepCard
              n={3}
              title="Download the result"
              body="Grab your file. Nothing is uploaded and no account is required."
            />
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface-sunken/40">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Privacy"
              title="Your documents do not leave your device"
              description="This is a technical fact, not a marketing line — and you can verify it yourself."
            />
            <ul className="mt-6 space-y-3 text-ink-soft">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                The core tools process files with JavaScript in your browser tab. There is no upload
                step.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                We do not log your documents, filenames, or their contents, because we never receive
                them.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                Closing the tab releases the data from memory.
              </li>
            </ul>
            <p className="mt-6 text-sm text-ink-muted">
              Open your browser’s Network tab and run a tool to confirm no document data is sent. Read
              more in <Link to="/how-it-works" className="text-accent-strong underline">how it works</Link>.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-6">
            <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.12em] text-ink-muted">
              What we will not claim
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li>We do not promise “100% secure” — no tool can.</li>
              <li>We do not promise a compression target we cannot reach.</li>
              <li>We do not display invented reviews, ratings, or user counts.</li>
              <li>We do not sell or share your files with advertisers.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeading eyebrow="Popular tools" title="Often the quickest way to finish the job" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((tool) => (
            <li key={tool.slug}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <AdSlot slot={ADSENSE.slots.top} />

      <section className="container-page py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="From the blog"
            title="Guides that explain the trade-offs"
            description="Written to be genuinely useful, including the parts where a task is harder than it looks."
          />
          <Link to="/blog" className={buttonClasses('secondary', 'sm')}>
            Read the blog
          </Link>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {recentPosts.map((post) => (
            <li key={post.slug}>
              <Link
                to={`/blog/${post.slug}`}
                className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 hover:border-line-strong hover:bg-surface-sunken"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-accent">
                  {post.category}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{post.title}</h3>
                <p className="mt-2 flex-1 text-sm text-ink-soft">{post.description}</p>
                <span className="mt-4 text-xs text-ink-muted">
                  {formatDate(post.date)} · {post.readingTime} min read
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page pb-20">
        <SectionHeading eyebrow="FAQ" title="Common questions" />
        <div className="mt-6 max-w-3xl divide-y divide-line rounded-lg border border-line bg-surface">
          {HOME_FAQ.map((faq) => (
            <details key={faq.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {faq.q}
                  <span className="text-ink-muted transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-ink-soft">{faq.a}</p>
            </details>
          ))}
        </div>
        <Link
          to="/faq"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:underline"
        >
          Read all frequently asked questions
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </>
  )
}
