'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, ListOrdered, Link2, Undo, Redo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
}

export function RichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = 'メモを入力...', 
  className,
  editable = true 
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // ヘッディングは不要
        code: false, // コードブロックは不要
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('URLを入力してください')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className={cn('border rounded-lg', className)}>
      {editable && (
        <div className="border-b p-2 flex items-center gap-1 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            data-active={editor.isActive('bold')}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            data-active={editor.isActive('italic')}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            data-active={editor.isActive('bulletList')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            data-active={editor.isActive('orderedList')}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={addLink}
            data-active={editor.isActive('link')}
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}
      <EditorContent 
        editor={editor} 
        className={cn(
          'prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none min-h-[100px]',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          !editable && 'cursor-default'
        )}
      />
    </div>
  )
}