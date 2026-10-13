import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from '@/components/layout/Layout'
import { Spinner } from '@/components/ui'
import { Home } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound'

const ToolsDirectory = lazy(() => import('@/pages/ToolsDirectory'))
const BlogIndex = lazy(() => import('@/pages/BlogIndex'))
const BlogPost = lazy(() => import('@/pages/BlogPost'))
const About = lazy(() => import('@/pages/About').then((m) => ({ default: m.About })))
const Contact = lazy(() => import('@/pages/Contact').then((m) => ({ default: m.Contact })))
const PrivacyPolicy = lazy(() =>
  import('@/pages/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy })),
)
const Terms = lazy(() => import('@/pages/Terms').then((m) => ({ default: m.Terms })))
const CookiePolicy = lazy(() =>
  import('@/pages/CookiePolicy').then((m) => ({ default: m.CookiePolicy })),
)
const HowItWorks = lazy(() => import('@/pages/HowItWorks').then((m) => ({ default: m.HowItWorks })))
const Faq = lazy(() => import('@/pages/Faq').then((m) => ({ default: m.Faq })))

const MergePdf = lazy(() => import('@/pages/tools/MergePdf'))
const SplitPdf = lazy(() => import('@/pages/tools/SplitPdf'))
const CompressPdf = lazy(() => import('@/pages/tools/CompressPdf'))
const PdfToJpg = lazy(() => import('@/pages/tools/PdfToJpg'))
const JpgToPdf = lazy(() => import('@/pages/tools/JpgToPdf'))
const RotatePdf = lazy(() => import('@/pages/tools/RotatePdf'))
const CropPdf = lazy(() => import('@/pages/tools/CropPdf'))
const DeletePdfPages = lazy(() => import('@/pages/tools/DeletePdfPages'))
const ReorderPdfPages = lazy(() => import('@/pages/tools/ReorderPdfPages'))
const ExtractPdfPages = lazy(() => import('@/pages/tools/ExtractPdfPages'))
const AddPageNumbers = lazy(() => import('@/pages/tools/AddPageNumbers'))
const AddWatermark = lazy(() => import('@/pages/tools/AddWatermark'))
const PdfToText = lazy(() => import('@/pages/tools/PdfToText'))
const PdfReader = lazy(() => import('@/pages/tools/PdfReader'))
const EditPdf = lazy(() => import('@/pages/tools/EditPdf'))
const SignPdf = lazy(() => import('@/pages/tools/SignPdf'))

function RouteFallback() {
  return (
    <div className="container-page flex min-h-[50vh] items-center justify-center">
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        <Spinner /> Loading…
      </span>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route
            path="tools"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ToolsDirectory />
              </Suspense>
            }
          />
          <Route
            path="merge-pdf"
            element={
              <Suspense fallback={<RouteFallback />}>
                <MergePdf />
              </Suspense>
            }
          />
          <Route
            path="split-pdf"
            element={
              <Suspense fallback={<RouteFallback />}>
                <SplitPdf />
              </Suspense>
            }
          />
          <Route
            path="compress-pdf"
            element={
              <Suspense fallback={<RouteFallback />}>
                <CompressPdf />
              </Suspense>
            }
          />
          <Route
            path="pdf-to-jpg"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PdfToJpg />
              </Suspense>
            }
          />
          <Route
            path="jpg-to-pdf"
            element={
              <Suspense fallback={<RouteFallback />}>
                <JpgToPdf />
              </Suspense>
            }
          />
          <Route
            path="rotate-pdf"
            element={
              <Suspense fallback={<RouteFallback />}>
                <RotatePdf />
              </Suspense>
            }
          />
          <Route
            path="crop-pdf"
            element={
              <Suspense fallback={<RouteFallback />}>
                <CropPdf />
              </Suspense>
            }
          />
          <Route
            path="delete-pdf-pages"
            element={
              <Suspense fallback={<RouteFallback />}>
                <DeletePdfPages />
              </Suspense>
            }
          />
          <Route
            path="reorder-pdf-pages"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ReorderPdfPages />
              </Suspense>
            }
          />
          <Route
            path="extract-pdf-pages"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ExtractPdfPages />
              </Suspense>
            }
          />
          <Route
            path="add-page-numbers"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AddPageNumbers />
              </Suspense>
            }
          />
          <Route
            path="add-watermark"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AddWatermark />
              </Suspense>
            }
          />
          <Route
            path="pdf-to-text"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PdfToText />
              </Suspense>
            }
          />
          <Route
            path="pdf-reader"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PdfReader />
              </Suspense>
            }
          />
          <Route
            path="edit-pdf"
            element={
              <Suspense fallback={<RouteFallback />}>
                <EditPdf />
              </Suspense>
            }
          />
          <Route
            path="sign-pdf"
            element={
              <Suspense fallback={<RouteFallback />}>
                <SignPdf />
              </Suspense>
            }
          />
          <Route
            path="blog"
            element={
              <Suspense fallback={<RouteFallback />}>
                <BlogIndex />
              </Suspense>
            }
          />
          <Route
            path="blog/:slug"
            element={
              <Suspense fallback={<RouteFallback />}>
                <BlogPost />
              </Suspense>
            }
          />
          <Route
            path="about"
            element={
              <Suspense fallback={<RouteFallback />}>
                <About />
              </Suspense>
            }
          />
          <Route
            path="contact"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Contact />
              </Suspense>
            }
          />
          <Route
            path="how-it-works"
            element={
              <Suspense fallback={<RouteFallback />}>
                <HowItWorks />
              </Suspense>
            }
          />
          <Route
            path="faq"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Faq />
              </Suspense>
            }
          />
          <Route
            path="privacy-policy"
            element={
              <Suspense fallback={<RouteFallback />}>
                <PrivacyPolicy />
              </Suspense>
            }
          />
          <Route
            path="terms"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Terms />
              </Suspense>
            }
          />
          <Route
            path="cookie-policy"
            element={
              <Suspense fallback={<RouteFallback />}>
                <CookiePolicy />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
