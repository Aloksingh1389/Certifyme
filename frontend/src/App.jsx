import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = '/api'
const CATEGORIES = ['All', 'Education', 'Hackthons', 'Workshops', 'Presentation', 'Achievements', 'Courses', 'Others']
const CATEGORY_ALIASES = {
  Professional: 'Achievements',
  Training: 'Workshops',
  Achievement: 'Achievements',
  Identity: 'Presentation',
  Other: 'Others',
}

function normalizeCategory(category) {
  return CATEGORY_ALIASES[category] ?? category
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function getFileKind(fileType) {
  if (fileType.startsWith('image/')) return 'Image'
  if (fileType === 'application/pdf') return 'PDF'
  if (fileType.startsWith('video/')) return 'Video'
  if (fileType.startsWith('audio/')) return 'Audio'
  return 'File'
}

function App() {
  const [certificates, setCertificates] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState({ title: '', category: 'Education' })
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileInputRef = useRef(null)

  async function loadCertificates() {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/certificates`)
      if (!response.ok) {
        throw new Error('Unable to load certificates from the backend.')
      }

      const data = await response.json()
      setCertificates(data.map((certificate) => ({ ...certificate, category: normalizeCategory(certificate.category) })))
    } catch (loadError) {
      setError(loadError.message || 'Unable to load certificates.')
      setCertificates([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCertificates()
  }, [])

  const filteredCertificates = useMemo(() => {
    return certificates.filter((certificate) => {
      const matchesCategory = selectedCategory === 'All' || certificate.category === selectedCategory
      const searchableText = `${certificate.name} ${certificate.category} ${certificate.fileType}`.toLowerCase()
      const matchesQuery = searchableText.includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [certificates, query, selectedCategory])

  const totalsByCategory = useMemo(() => {
    return CATEGORIES.slice(1).reduce((summary, category) => {
      summary[category] = certificates.filter((item) => item.category === category).length
      return summary
    }, {})
  }, [certificates])

  async function handleAddCertificates(event) {
    event.preventDefault()

    if (!selectedFiles.length || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('title', formState.title.trim())
      formData.append('category', formState.category)
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch(`${API_BASE}/certificates`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed. Please try again.')
      }

      const createdCertificates = await response.json()
      setCertificates((current) => [...createdCertificates, ...current])
      setSelectedFiles([])
      setFormState({ title: '', category: 'Education' })
      setIsDialogOpen(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to upload certificates.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteCertificate(id) {
    setError('')

    try {
      const response = await fetch(`${API_BASE}/certificates/${id}`, { method: 'DELETE' })
      if (!response.ok && response.status !== 204) {
        throw new Error('Unable to delete certificate.')
      }

      setCertificates((current) => current.filter((certificate) => certificate.id !== id))
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete certificate.')
    }
  }

  function openDialog() {
    setIsDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_32%),linear-gradient(180deg,_#07111f_0%,_#050814_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                Certificate Bucket
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Store every certificate in one organized frontend vault.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Upload files to the backend, keep the frontend organized by category, and open each certificate with a dedicated view or download action.
              </p>
            </div>

            <button
              type="button"
              onClick={openDialog}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Add Certificate
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">Categories</h2>
            <div className="mt-4 space-y-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    selectedCategory === category
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-white'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>{category}</span>
                  <span className="text-xs text-slate-400">{category === 'All' ? certificates.length : totalsByCategory[category] ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Library stats</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Certificates" value={certificates.length} />
                <Stat label="Filtered" value={filteredCertificates.length} />
                <Stat label="Images" value={certificates.filter((item) => item.fileType.startsWith('image/')).length} />
                <Stat label="Files" value={certificates.length ? 'Stored' : 'Empty'} />
              </div>
            </div>
          </aside>

          <main className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/30 backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <label className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Search</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by certificate name, category, or file type"
                  className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
                View and download each uploaded certificate directly from the backend.
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                <div className="col-span-full rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center text-slate-400">
                  Loading your certificate bucket...
                </div>
              ) : filteredCertificates.length ? (
                filteredCertificates.map((certificate) => (
                  <article
                    key={certificate.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-lg shadow-slate-950/30"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">{certificate.category}</p>
                        <h3 className="mt-1 text-lg font-semibold text-white">{certificate.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCertificate(certificate.id)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="border-b border-white/10 bg-slate-900/60 p-4">
                      {certificate.fileType.startsWith('image/') ? (
                        <img
                          src={certificate.viewUrl}
                          alt={certificate.name}
                          className="h-48 w-full rounded-2xl object-cover"
                        />
                      ) : certificate.fileType === 'application/pdf' ? (
                        <iframe
                          title={certificate.name}
                          src={certificate.viewUrl}
                          className="h-48 w-full rounded-2xl border border-white/10 bg-slate-900"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-gradient-to-br from-slate-900 to-slate-800 text-center">
                          <div>
                            <p className="text-sm uppercase tracking-[0.26em] text-slate-400">{getFileKind(certificate.fileType)}</p>
                            <p className="mt-2 text-sm text-slate-300">Use View or Download for this file type</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4 text-sm text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span>Type</span>
                        <span className="text-slate-100">{certificate.fileType || 'unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Size</span>
                        <span className="text-slate-100">{formatFileSize(certificate.size)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Added</span>
                        <span className="text-slate-100">{new Date(certificate.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <a
                          href={certificate.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
                        >
                          View
                        </a>
                        <a
                          href={certificate.downloadUrl}
                          download={certificate.name}
                          className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center text-slate-400">
                  No certificates match this view yet. Upload one to start building the bucket.
                </div>
              )}
            </div>
          </main>
        </section>
      </div>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Add certificate</h2>
                <p className="mt-1 text-sm text-slate-400">Pick one or more files, give them a category, and save them to the backend.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleAddCertificates}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Title</span>
                  <input
                    value={formState.title}
                    onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Optional display name"
                    className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>

                <label className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Category</span>
                  <select
                    value={formState.category}
                    onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}
                    className="mt-1 w-full bg-transparent text-sm text-white outline-none"
                  >
                    {CATEGORIES.filter((category) => category !== 'All').map((category) => (
                      <option key={category} value={category} className="bg-slate-900">
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/15 bg-slate-900/60 px-6 py-10 text-center transition hover:border-emerald-400/50 hover:bg-slate-900">
                <span className="text-sm font-semibold text-white">Select certificates</span>
                <span className="mt-2 text-sm text-slate-400">Upload any file type. Images and PDFs will preview automatically.</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="*/*"
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                  className="hidden"
                />
                <span className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                  Choose files
                </span>
              </label>

              {selectedFiles.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">Selected files</p>
                  <ul className="mt-3 space-y-2">
                    {selectedFiles.map((file) => (
                      <li key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between gap-3">
                        <span>{file.name}</span>
                        <span className="text-slate-400">{formatFileSize(file.size)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Saving...' : 'Save certificates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

export default App