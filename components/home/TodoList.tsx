'use client'

import { useState, useCallback, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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

  // Optimistic update + debounced server save
  function saveTodos(todos: TodoItem[]) {
    // Optimistic update
    qc.setQueryData<Trip | null>(['current-trip'], (old) =>
      old ? { ...old, todos } : old
    )
    // Debounce server save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateTrip.mutate({ id: trip.id, todos })
    }, 800)
  }

  const todos: TodoItem[] = Array.isArray(trip.todos) ? trip.todos : []

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
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        <h2 className="font-semibold text-sm">To Do</h2>
        <div className="flex items-center gap-2">
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

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto max-h-[460px]">
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

        {/* 새 할일 입력 */}
        {isAdding && (
          <div className="flex items-center gap-3 px-4 py-2">
            <input type="checkbox" className="rounded border-muted-foreground" disabled />
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
      <input
        type="checkbox"
        className="rounded border-muted-foreground cursor-pointer"
        checked={todo.checked}
        onChange={onToggle}
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
