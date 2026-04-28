'use client'

import { useState, useCallback, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useUpdateTrip, type TodoItem, type Trip } from '@/hooks/useTrips'
import { useQueryClient } from '@tanstack/react-query'

function generateId() {
  return Math.random().toString(36).slice(2)
}

interface TodoListProps {
  trip: Trip
}

export function TodoList({ trip }: TodoListProps) {
  const updateTrip = useUpdateTrip()
  const qc = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [headerHovered, setHeaderHovered] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function saveTodos(todos: TodoItem[]) {
    qc.setQueryData<Trip | null>(['current-trip'], (old) =>
      old ? { ...old, todos } : old
    )
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateTrip.mutate({ id: trip.id, todos })
    }, 800)
  }

  const todos: TodoItem[] = Array.isArray(trip.todos) ? trip.todos : []
  const checkedCount = todos.filter((t) => t.checked).length
  const total = todos.length
  const progress = total > 0 ? (checkedCount / total) * 100 : 0

  function toggleTodo(id: string) {
    const next = todos.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t))
    saveTodos(next)
  }

  function deleteTodo(id: string) {
    saveTodos(todos.filter((t) => t.id !== id))
  }

  function deleteAll() {
    saveTodos([])
  }

  const handleAddKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && newText.trim()) {
        const next = [...todos, { id: generateId(), text: newText.trim(), checked: false }]
        saveTodos(next)
        setNewText('')
        setIsAdding(false)
      }
      if (e.key === 'Escape') {
        setNewText('')
        setIsAdding(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos, newText]
  )

  return (
    <div className="bg-card rounded-xl border flex flex-col overflow-hidden">
      <div className="flex flex-col border-b">
        <div
          className="flex items-center justify-between px-4 pt-3 pb-2"
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
        >
          <h2 className="font-semibold text-sm">To Do</h2>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="text-xs text-muted-foreground">{checkedCount}/{total}</span>
            )}
            {headerHovered && todos.length > 0 && (
              <button
                onClick={deleteAll}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="전체 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsAdding(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="할일 추가"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        {total > 0 && (
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[600px]">
        {todos.length === 0 && !isAdding && (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            + 버튼으로 할일을 추가하세요
          </div>
        )}

        {todos.map((todo) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            onToggle={() => toggleTodo(todo.id)}
            onDelete={() => deleteTodo(todo.id)}
          />
        ))}

        {isAdding && (
          <div className="flex items-center gap-3 px-4 py-2">
            <Checkbox disabled className="opacity-40" />
            <Input
              autoFocus
              className="h-7 text-sm border-0 border-b rounded-none px-0 focus-visible:ring-0 flex-1"
              placeholder="할일을 입력하고 Enter"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onBlur={() => {
                if (!newText.trim()) setIsAdding(false)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: TodoItem
  onToggle: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Checkbox
        checked={todo.checked}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-foreground data-[state=checked]:border-foreground cursor-pointer"
      />
      <span
        className={cn(
          'flex-1 text-sm cursor-pointer select-none',
          todo.checked && 'line-through text-muted-foreground'
        )}
        onClick={onToggle}
      >
        {todo.text}
      </span>
      {hovered && (
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
