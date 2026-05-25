'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Columns2, ChevronDown, X, Download } from 'lucide-react'
import { AppRow, getColumns } from './columns'
import type { Tag } from '@/app/page'

interface Metrics {
  tp: number; fp: number; fn: number; tn: number
  accuracy: number | null
  precision: number | null
  recall: number | null
  f1: number | null
}

function computeMetrics(shown: AppRow[], totalApps: number, totalRelevant: number): Metrics {
  const tp = shown.filter((a) => a.relevant).length
  const fp = shown.filter((a) => !a.relevant).length
  const fn = totalRelevant - tp
  const tn = (totalApps - totalRelevant) - fp
  const total = tp + fp + fn + tn
  const precision = tp + fp > 0 ? tp / (tp + fp) : null
  const recall = tp + fn > 0 ? tp / (tp + fn) : null
  const f1 = precision !== null && recall !== null && precision + recall > 0
    ? (2 * precision * recall) / (precision + recall) : null
  const accuracy = total > 0 ? (tp + tn) / total : null
  return { tp, fp, fn, tn, accuracy, precision, recall, f1 }
}

function MetricsPanel({ metrics }: { metrics: Metrics }) {
  const fmt = (v: number | null) => v === null ? '—' : `${(v * 100).toFixed(1)}%`
  const items = [
    {
      label: 'Accuracy',
      value: fmt(metrics.accuracy),
      detail: `(TP+TN)/${metrics.tp + metrics.fp + metrics.fn + metrics.tn}`,
    },
    {
      label: 'Precision',
      value: fmt(metrics.precision),
      detail: `${metrics.tp} relevant shown / ${metrics.tp + metrics.fp} shown`,
    },
    {
      label: 'Recall',
      value: fmt(metrics.recall),
      detail: `${metrics.tp} relevant shown / ${metrics.tp + metrics.fn} relevant total`,
    },
    {
      label: 'F1 Score',
      value: fmt(metrics.f1),
      detail: 'harmonic mean of precision & recall',
    },
  ]
  return (
    <div className="rounded-md border bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap gap-6">
        {items.map(({ label, value, detail }) => (
          <div key={label} className="flex flex-col gap-0.5 min-w-0 max-w-[10rem]">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-lg font-semibold tabular-nums">{value}</span>
            <span className="text-xs text-muted-foreground leading-snug" style={{ overflowWrap: 'anywhere' }}>{detail}</span>
          </div>
        ))}
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground ml-auto self-center">
          <span>TP {metrics.tp} · FP {metrics.fp}</span>
          <span>FN {metrics.fn} · TN {metrics.tn}</span>
        </div>
      </div>
    </div>
  )
}

interface TagConfig {
  threshold: number
  negate: boolean
}

interface Keyword {
  word: string
  negate: boolean
}

interface AppsTableProps {
  data: AppRow[]
  searchTerms: string[]
  countries: string[]
  tags: Tag[]
  selectedTagIds: number[]
  selectedKeywords: Keyword[]
  paper2020Active: boolean
  totalApps: number
  totalRelevant: number
  isAdmin: boolean
}

function TagFilterPanel({
  tags,
  selectedTagIds,
  tagConfigs,
  onToggleTag,
  onThresholdChange,
  onNegateChange,
}: {
  tags: Tag[]
  selectedTagIds: number[]
  tagConfigs: Record<number, TagConfig>
  onToggleTag: (id: number) => void
  onThresholdChange: (id: number, threshold: number) => void
  onNegateChange: (id: number, negate: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const activeCount = selectedTagIds.length

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={activeCount > 0 ? 'default' : 'outline'}
        onClick={() => setOpen((v) => !v)}
        className="gap-1"
      >
        Tags{activeCount > 0 ? ` (${activeCount})` : ''}
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md p-3 min-w-[320px] space-y-3">
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id)
            const config = tagConfigs[tag.id] ?? { threshold: tag.threshold, negate: false }
            return (
              <div key={tag.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`tag-${tag.id}`}
                    checked={selected}
                    onChange={() => onToggleTag(tag.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor={`tag-${tag.id}`} className="text-sm font-medium flex-1 cursor-pointer">
                    {tag.description}
                  </label>
                </div>
                {selected && (
                  <div className="ml-6 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">Threshold</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(config.threshold * 100)}
                        onChange={(e) => onThresholdChange(tag.id, parseInt(e.target.value) / 100)}
                        className="flex-1 h-1.5 accent-primary"
                      />
                      <span className="text-xs font-mono w-10 text-right">
                        {Math.round(config.threshold * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`negate-${tag.id}`}
                        checked={config.negate}
                        onChange={(e) => onNegateChange(tag.id, e.target.checked)}
                        className="h-3 w-3 rounded border-gray-300"
                      />
                      <label htmlFor={`negate-${tag.id}`} className="text-xs text-muted-foreground cursor-pointer">
                        Exclude matching apps
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">No tags defined.</p>
          )}
        </div>
      )}
    </div>
  )
}

function KeywordFilterPanel({
  keywords,
  onAdd,
  onRemove,
  onToggleNegate,
}: {
  keywords: Keyword[]
  onAdd: (word: string) => void
  onRemove: (index: number) => void
  onToggleNegate: (index: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const submit = () => {
    const word = input.trim()
    if (!word || keywords.some((k) => k.word.toLowerCase() === word.toLowerCase())) return
    onAdd(word)
    setInput('')
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={keywords.length > 0 ? 'default' : 'outline'}
        onClick={() => setOpen((v) => !v)}
        className="gap-1"
      >
        Keywords{keywords.length > 0 ? ` (${keywords.length})` : ''}
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md p-3 min-w-[280px] space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="Add keyword…"
              className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <Button size="sm" onClick={submit} disabled={!input.trim()}>Add</Button>
          </div>

          {keywords.length > 0 && (
            <div className="space-y-1">
              {keywords.map((kw, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => onRemove(i)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span className={`text-sm flex-1 font-mono ${kw.negate ? 'line-through text-muted-foreground' : ''}`}>
                    {kw.word}
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      id={`kw-negate-${i}`}
                      checked={kw.negate}
                      onChange={() => onToggleNegate(i)}
                      className="h-3 w-3 rounded border-gray-300"
                    />
                    <label htmlFor={`kw-negate-${i}`} className="text-xs text-muted-foreground cursor-pointer">
                      Exclude
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SavedRanking {
  id: number
  query: string
  scores: Record<string, number>
  threshold: number
  created_at: string
}

function ReRankerPanel({
  appIds,
  onScoresLoaded,
  onClear,
  active,
  threshold,
  onThresholdChange,
}: {
  appIds: number[]
  onScoresLoaded: (scores: Record<number, number>, id: number, threshold: number) => void
  onClear: () => void
  active: boolean
  threshold: number
  onThresholdChange: (t: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedRankings, setSavedRankings] = useState<SavedRanking[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  // Re-fetch saved rankings each time the panel opens to get fresh thresholds
  useEffect(() => {
    if (open) {
      fetch('/api/rerank')
        .then((r) => r.json())
        .then(({ rankings }) => setSavedRankings(rankings))
        .catch(console.error)
    }
  }, [open])

  const run = async () => {
    const q = query.trim()
    if (!q || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/rerank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, appIds }),
      })
      if (!res.ok) { console.error(await res.text()); return }
      const { scores, id, created_at } = await res.json() as { scores: Record<number, number>; id: number; created_at: string }
      onScoresLoaded(scores, id, 0)
      setSavedRankings((prev) => [{ id, query: q, scores, threshold: 0, created_at }, ...(prev ?? [])])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={active ? 'default' : 'outline'}
        onClick={() => setOpen((v) => !v)}
        className={`gap-1 ${active ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
      >
        ReRanker
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md p-3 min-w-[340px] space-y-3">
          <p className="text-xs text-muted-foreground">
            Scores the currently shown apps using a neural reranker.
          </p>
          <div className="flex flex-col gap-2">
            <textarea
              ref={inputRef}
              rows={4}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run() }}
              placeholder="Enter query… (Ctrl+Enter to run)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-y"
            />
            <Button
              size="sm"
              onClick={run}
              disabled={!query.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700 text-white self-end"
            >
              {loading ? 'Running…' : 'Run'}
            </Button>
          </div>
          {active && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">Threshold</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(threshold * 100)}
                  onChange={(e) => onThresholdChange(parseInt(e.target.value) / 100)}
                  className="flex-1 h-1.5 accent-purple-600"
                />
                <span className="text-xs font-mono w-10 text-right">{Math.round(threshold * 100)}%</span>
              </div>
              <Button size="sm" variant="ghost" onClick={onClear} className="w-full text-muted-foreground">
                Clear scores
              </Button>
            </div>
          )}
          {savedRankings !== null && savedRankings.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saved rankings</p>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {savedRankings.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onScoresLoaded(r.scores as unknown as Record<number, number>, r.id, r.threshold)}
                    className="w-full text-left rounded px-2 py-1.5 text-sm hover:bg-muted flex flex-col gap-0.5"
                  >
                    <span className="font-medium line-clamp-1">{r.query}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AppsTable({ data: initialData, searchTerms, countries, tags, selectedTagIds, selectedKeywords, paper2020Active, totalApps, totalRelevant, isAdmin }: AppsTableProps) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    google_installs: false,
    google_score: false,
    google_ratings: false,
    apple_score: false,
    apple_ratings: false,
  })

  // Per-tag threshold/negate config; initialized from tag defaults on first select
  const [tagConfigs, setTagConfigs] = useState<Record<number, TagConfig>>(() => {
    const init: Record<number, TagConfig> = {}
    for (const tag of tags) {
      init[tag.id] = { threshold: tag.threshold, negate: false }
    }
    return init
  })

  // Sync data when server sends a new result set
  useEffect(() => {
    setData(initialData)
    setSorting([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagIds.join(','), selectedKeywords.map(k => (k.negate ? '-' : '') + k.word).join(','), paper2020Active])

  const handleRelevantChange = async (id: number, relevant: boolean) => {
    setData((prev) => prev.map((app) => (app.id === id ? { ...app, relevant } : app)))
    await fetch(`/api/apps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relevant }),
    })
  }

  const handleDelete = async (id: number) => {
    setData((prev) => prev.filter((app) => app.id !== id))
    await fetch(`/api/apps/${id}`, { method: 'DELETE' })
  }

  const keywordsToParam = (kws: Keyword[]) =>
    kws.map((k) => (k.negate ? '-' : '') + k.word).join(',') || null

  // Build URL with updated query params (no useSearchParams needed — we own the shape)
  const buildUrl = (updates: Record<string, string | null>) => {
    const base: Record<string, string> = {}
    if (selectedTagIds.length > 0) base.tags = selectedTagIds.join(',')
    if (paper2020Active) base.paper2020 = 'true'
    const kp = keywordsToParam(selectedKeywords)
    if (kp) base.keywords = kp
    const merged = { ...base, ...updates }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v !== null) params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `/?${qs}` : '/'
  }

  const toggleTag = (id: number) => {
    const next = selectedTagIds.includes(id)
      ? selectedTagIds.filter((t) => t !== id)
      : [...selectedTagIds, id]
    const tagsVal = next.length > 0 ? next.join(',') : null
    router.push(buildUrl({ tags: tagsVal }))
  }

  const addKeyword = (word: string) => {
    const next = [...selectedKeywords, { word, negate: false }]
    router.push(buildUrl({ keywords: keywordsToParam(next) }))
  }

  const removeKeyword = (index: number) => {
    const next = selectedKeywords.filter((_, i) => i !== index)
    router.push(buildUrl({ keywords: keywordsToParam(next) }))
  }

  const toggleKeywordNegate = (index: number) => {
    const next = selectedKeywords.map((kw, i) => i === index ? { ...kw, negate: !kw.negate } : kw)
    router.push(buildUrl({ keywords: keywordsToParam(next) }))
  }

  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const handleThresholdChange = useCallback((id: number, threshold: number) => {
    setTagConfigs((prev) => ({ ...prev, [id]: { ...prev[id], threshold } }))
    clearTimeout(debounceTimers.current[id])
    debounceTimers.current[id] = setTimeout(() => {
      fetch(`/api/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold }),
      })
    }, 500)
  }, [])

  const handleNegateChange = (id: number, negate: boolean) => {
    setTagConfigs((prev) => ({ ...prev, [id]: { ...prev[id], negate } }))
  }

  const [rerankerScores, setRerankerScores] = useState<Record<number, number> | null>(null)
  const [rerankerThreshold, setRerankerThreshold] = useState(0)
  const [activeRankingId, setActiveRankingId] = useState<number | null>(null)
  const [showFalseNegatives, setShowFalseNegatives] = useState(false)

  const handleScoresLoaded = useCallback((scores: Record<number, number>, id: number, threshold: number) => {
    setRerankerScores(scores)
    setRerankerThreshold(threshold)
    setActiveRankingId(id)
    setShowFalseNegatives(false)
    setSorting([{ id: 'reranker_score', desc: true }])
  }, [])

  const rerankerDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRerankerThresholdChange = useCallback((threshold: number, rankingId: number | null) => {
    setRerankerThreshold(threshold)
    if (rankingId === null) return
    if (rerankerDebounceTimer.current) clearTimeout(rerankerDebounceTimer.current)
    rerankerDebounceTimer.current = setTimeout(() => {
      fetch(`/api/rerank/${rankingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold }),
      })
    }, 500)
  }, [])

  // Apply tag filtering client-side (keyword filtering is server-side via SQL)
  const filteredData = useMemo(() => {
    if (selectedTagIds.length === 0) return data
    return data.filter((app) => {
      for (const tagId of selectedTagIds) {
        const config = tagConfigs[tagId]
        if (!config) continue
        const sim = app.similarities?.[String(tagId)] ?? null
        if (config.negate) {
          if (sim !== null && sim >= config.threshold) return false
        } else {
          if (sim === null || sim < config.threshold) return false
        }
      }
      return true
    })
  }, [data, selectedTagIds, tagConfigs])
  const filteredAppIds = useMemo(() => filteredData.map((a) => a.id), [filteredData])

  // Apps that pass the reranker threshold — used for metrics
  const thresholdData = useMemo(() => {
    if (!rerankerScores) return filteredData
    return filteredData.filter((a) => (rerankerScores[a.id] ?? -Infinity) >= rerankerThreshold)
  }, [filteredData, rerankerScores, rerankerThreshold])

  // What the table actually shows: either threshold-passing apps or false negatives
  const tableData = useMemo(() => {
    if (showFalseNegatives && rerankerScores) {
      return filteredData.filter(
        (a) => a.relevant && (rerankerScores[a.id] ?? -Infinity) < rerankerThreshold
      )
    }
    return thresholdData
  }, [showFalseNegatives, rerankerScores, filteredData, rerankerThreshold, thresholdData])

  const selectedTags = useMemo(
    () => tags.filter((t) => selectedTagIds.includes(t.id)),
    [tags, selectedTagIds]
  )

  const columns = useMemo(
    () => getColumns(handleRelevantChange, handleDelete, selectedTags, rerankerScores ?? undefined, isAdmin),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTagIds.join(','), rerankerScores]
  )

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
    autoResetPageIndex: false,
    initialState: { pagination: { pageSize: 25 } },
  })

  const setFilter = (columnId: string, value: string) => {
    table.getColumn(columnId)?.setFilterValue(value === 'all' ? undefined : value)
  }

  const total = table.getFilteredRowModel().rows.length
  const relevant = table.getFilteredRowModel().rows.filter((r) => r.original.relevant).length

  const filterActive = selectedTagIds.length > 0 || selectedKeywords.length > 0 || paper2020Active || rerankerScores !== null
  const metrics = useMemo(
    () => (filterActive && !showFalseNegatives) ? computeMetrics(thresholdData, totalApps, totalRelevant) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterActive, showFalseNegatives, thresholdData, totalApps, totalRelevant]
  )

  const exportCSV = useCallback(() => {
    const csvEscape = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }

    const apps = table.getFilteredRowModel().rows.map((r) => r.original)

    const headers = [
      'id', 'title', 'developer', 'store', 'url', 'relevant',
      ...(rerankerScores ? ['reranker_score'] : []),
      'rank', 'price', 'free', 'genre', 'search_terms', 'countries',
      'google_installs', 'google_score', 'google_ratings', 'apple_score', 'apple_ratings',
      ...selectedTags.map((t) => `sim_${t.description}`),
    ]

    const csvRows = [
      headers.join(','),
      ...apps.map((app) => [
        app.id,
        app.title,
        app.developer ?? '',
        app.store,
        app.url ?? '',
        app.relevant,
        ...(rerankerScores ? [rerankerScores[app.id] ?? ''] : []),
        app.rank ?? '',
        app.free ? 0 : (app.price ?? ''),
        app.free ?? '',
        app.genre ?? '',
        app.search_terms?.join('; ') ?? '',
        app.countries?.join('; ') ?? '',
        app.google_installs ?? '',
        app.google_score ?? '',
        app.google_ratings ?? '',
        app.apple_score ?? '',
        app.apple_ratings ?? '',
        ...selectedTags.map((t) => app.similarities?.[String(t.id)] ?? ''),
      ].map(csvEscape).join(',')),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'apps.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [table, rerankerScores, selectedTags])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {tags.length > 0 && (
          <TagFilterPanel
            tags={tags}
            selectedTagIds={selectedTagIds}
            tagConfigs={tagConfigs}
            onToggleTag={toggleTag}
            onThresholdChange={handleThresholdChange}
            onNegateChange={handleNegateChange}
          />
        )}
        <KeywordFilterPanel
          keywords={selectedKeywords}
          onAdd={addKeyword}
          onRemove={removeKeyword}
          onToggleNegate={toggleKeywordNegate}
        />
        <ReRankerPanel
          appIds={filteredAppIds}
          onScoresLoaded={handleScoresLoaded}
          onClear={() => { setRerankerScores(null); setRerankerThreshold(0); setActiveRankingId(null); setShowFalseNegatives(false); setSorting([]) }}
          active={rerankerScores !== null}
          threshold={rerankerThreshold}
          onThresholdChange={(t) => handleRerankerThresholdChange(t, activeRankingId)}
        />
        {rerankerScores !== null && (
          <Button
            variant={showFalseNegatives ? 'default' : 'outline'}
            onClick={() => setShowFalseNegatives((v) => !v)}
            className={showFalseNegatives ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            False Negatives
          </Button>
        )}
        <Button variant="outline" onClick={exportCSV} className="gap-1">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Select onValueChange={(v) => setFilter('store', v)} defaultValue="all">
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setFilter('search_terms', v)} defaultValue="all">
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All search terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All search terms</SelectItem>
            {searchTerms.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setFilter('countries', v)} defaultValue="all">
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setFilter('relevant', v)} defaultValue="all">
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All apps</SelectItem>
            <SelectItem value="true">Relevant only</SelectItem>
            <SelectItem value="false">Not relevant</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={paper2020Active ? 'default' : 'outline'}
          onClick={() => router.push(buildUrl({ paper2020: paper2020Active ? null : 'true' }))}
        >
          Paper 2020
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              <Columns2 className="mr-2 h-4 w-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={col.getIsVisible()}
                onCheckedChange={(val) => col.toggleVisibility(val)}
                className="capitalize"
              >
                {col.id.replace(/_/g, ' ')}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        {total} app{total !== 1 ? 's' : ''} · {relevant} relevant
      </div>

      {/* Metrics */}
      {metrics && <MetricsPanel metrics={metrics} />}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={row.original.relevant ? 'bg-green-50 hover:bg-green-100' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
