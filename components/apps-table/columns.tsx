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
  search_terms: string[] | null
  countries: string[] | null
}

const STORE_STYLE: Record<string, string> = {
  google: 'bg-green-100 text-green-800 border-green-200',
  apple: 'bg-blue-100 text-blue-800 border-blue-200',
  both: 'bg-purple-100 text-purple-800 border-purple-200',
}

export function getColumns(
  onRelevantChange: (id: number, relevant: boolean) => void,
  onDelete: (id: number) => void
): ColumnDef<AppRow>[] {
  return [
    {
      id: 'relevant',
      accessorFn: (row) => row.relevant,
      header: 'Relevant',
      cell: ({ row }) => (
        <Switch
          checked={row.original.relevant}
          onCheckedChange={(checked) => onRelevantChange(row.original.id, checked)}
        />
      ),
      filterFn: (row, _, value) => value === 'all' || String(row.original.relevant) === value,
    },
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.original.icon_url} alt="" className="w-10 h-10 rounded-lg shrink-0" />
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
      accessorKey: 'score',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Score <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.score != null ? (
          <span className="font-mono">★ {row.original.score.toFixed(1)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
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
      cell: ({ row }) => (
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
      ),
    },
  ]
}
