'use client'

import { useCallback, useEffect, useRef } from 'react'
import { Bold, Italic, Link2, List, ListOrdered, Quote, Heading2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (html: string) => void
  className?: string
  placeholder?: string
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </button>
  )
}

export default function BlogRichTextEditor({ value, onChange, className, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)

  const exec = useCallback((command: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }, [onChange])

  const addLink = () => {
    const url = window.prompt('Enter link URL (https://...)')
    if (url?.trim()) exec('createLink', url.trim())
  }

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML)
  }

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white overflow-hidden', className)}>
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <ToolbarButton onClick={() => exec('formatBlock', 'h2')} label="Heading">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('bold')} label="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} label="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertUnorderedList')} label="Bullet list">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} label="Numbered list">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'blockquote')} label="Quote">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} label="Link">
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="blog-editor min-h-[280px] px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none [&:empty]:before:text-slate-400 [&:empty]:before:content-[attr(data-placeholder)]"
      />
    </div>
  )
}
