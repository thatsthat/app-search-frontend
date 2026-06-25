'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export interface AppRow {
  id: number
  store: 'google' | 'apple' | 'both'
  title: string
  developer: string | null
  score: number | null
  price: number | null
  free: boolean | null
  genre: string | null
  icon_url: string | null
  url: string | null
  relevant: boolean
  rank: number | null
  search_terms: string[] | null
  countries: string[] | null
  similarities?: Record<string, number> | null
  google_installs: number | null
  google_score: number | null
  google_ratings: number | null
  apple_score: number | null
  apple_ratings: number | null
}

const STORE_STYLE: Record<string, string> = {
  google: 'bg-green-100 text-green-800 border-green-200',
  apple: 'bg-blue-100 text-blue-800 border-blue-200',
  both: 'bg-purple-100 text-purple-800 border-purple-200',
}

function AppIconChunking({ app }: { app: AppRow }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={app.icon_url!}
      alt=""
      referrerPolicy="no-referrer"
      className="w-10 h-10 rounded-lg shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => window.open(`/chunking.html?appId=${app.id}`, '_blank')}
    />
  )
}

export function getColumns(
  onRelevantChange: (id: number, relevant: boolean) => void,
  onDelete: (id: number) => void,
  selectedTags: Array<{ id: number; description: string }>,
  rerankerScores?: Record<number, number>,
  isAdmin = false,
): ColumnDef<AppRow>[] {
  const cols: ColumnDef<AppRow>[] = [
    {
      id: 'relevant',
      accessorFn: (row) => row.relevant,
      header: 'Relevant',
      cell: ({ row }) => (
        <Switch
          checked={row.original.relevant}
          onCheckedChange={(checked) => isAdmin && onRelevantChange(row.original.id, checked)}
          disabled={!isAdmin}
        />
      ),
      filterFn: (row, _, value) => value === 'all' || String(row.original.relevant) === value,
    },
    ...(rerankerScores ? [{
      id: 'reranker_score',
      accessorFn: (row: AppRow) => rerankerScores[row.id] ?? -Infinity,
      header: ({ column }: { column: import('@tanstack/react-table').Column<AppRow> }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="text-purple-700">
          Reranker <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }: { row: import('@tanstack/react-table').Row<AppRow> }) => {
        const score = rerankerScores[row.original.id]
        return score != null ? (
          <span className="font-mono tabular-nums text-purple-700">{score.toFixed(4)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    } as ColumnDef<AppRow>] : []),
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          App <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          {row.original.icon_url && (
            <AppIconChunking app={row.original} />
          )}
          <div>
            {row.original.url ? (
              <a
                href={row.original.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline line-clamp-1"
              >
                {row.original.title}
              </a>
            ) : (
              <span className="font-medium line-clamp-1">{row.original.title}</span>
            )}
            {row.original.developer && (
              <div className="text-xs text-muted-foreground line-clamp-1">{row.original.developer}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'store',
      header: 'Store',
      cell: ({ row }) => (
        <Badge className={STORE_STYLE[row.original.store]}>{row.original.store}</Badge>
      ),
      filterFn: (row, _, value) => value === 'all' || row.original.store === value,
    },
    {
      accessorKey: 'rank',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Rank <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.rank != null ? (
          <span className="font-mono">#{row.original.rank}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  cols.push(
    {
      id: 'google_installs',
      accessorKey: 'google_installs',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="text-xs">
          Installs (Google) <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.google_installs != null ? (
          <span className="font-mono tabular-nums">{row.original.google_installs.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'google_score',
      accessorKey: 'google_score',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="text-xs">
          Score (Google) <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.google_score != null ? (
          <span className="font-mono">★ {row.original.google_score.toFixed(1)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'google_ratings',
      accessorKey: 'google_ratings',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="text-xs">
          Ratings (Google) <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.google_ratings != null ? (
          <span className="font-mono tabular-nums">{row.original.google_ratings.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'apple_score',
      accessorKey: 'apple_score',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="text-xs">
          Score (Apple) <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.apple_score != null ? (
          <span className="font-mono">★ {row.original.apple_score.toFixed(1)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'apple_ratings',
      accessorKey: 'apple_ratings',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="text-xs">
          Ratings (Apple) <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.apple_ratings != null ? (
          <span className="font-mono tabular-nums">{row.original.apple_ratings.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  )

  for (const tag of selectedTags) {
    const tagIdStr = String(tag.id)
    cols.push({
      id: `sim_${tag.id}`,
      accessorFn: (row) => row.similarities?.[tagIdStr] ?? -1,
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="text-xs">
          {tag.description} <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const sim = row.original.similarities?.[tagIdStr]
        return sim != null ? (
          <span className="font-mono tabular-nums">{(sim * 100).toFixed(1)}%</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    })
  }

  cols.push(
    {
      id: 'price',
      header: 'Price',
      cell: ({ row }) => {
        if (row.original.free) return <Badge variant="secondary">Free</Badge>
        if (row.original.price) return <span>${row.original.price.toFixed(2)}</span>
        return <span className="text-muted-foreground">—</span>
      },
    },
    {
      accessorKey: 'genre',
      header: 'Genre',
      cell: ({ row }) =>
        row.original.genre ? (
          <span className="text-sm">{row.original.genre}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'search_terms',
      header: 'Search Terms',
      accessorFn: (row) => row.search_terms?.join(' ') ?? '',
      filterFn: (row, _, value) => value === 'all' || (row.original.search_terms ?? []).includes(value),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.search_terms?.map((t) => (
            <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'countries',
      header: 'Countries',
      accessorFn: (row) => row.countries?.join(' ') ?? '',
      filterFn: (row, _, value) => value === 'all' || (row.original.countries ?? []).includes(value),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.countries?.map((c) => (
            <Badge key={c} variant="outline" className="text-xs">{c.toUpperCase()}</Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'delete',
      header: '',
      cell: ({ row }) => isAdmin ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete app?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{row.original.title}</strong> will be permanently removed from the database.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(row.original.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null,
    }
  )

  return cols
}
