import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function TodosPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos, error } = await supabase.from('todos').select()

  return (
    <div className="min-h-screen py-20 px-4 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold font-display mb-4">Supabase Connection Test</h1>
      <p className="text-foreground/70 mb-6">
        This route tests reading from the &apos;todos&apos; table using your new Supabase project.
      </p>
      
      {error && (
        <div className="p-4 mb-6 text-sm text-amber-800 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="font-semibold">Notice from Supabase:</p>
          <p>{error.message}</p>
          <p className="text-xs text-foreground/50 mt-2">
            If you haven&apos;t created a &apos;todos&apos; table in your Supabase database yet, this notice is expected.
          </p>
        </div>
      )}

      <ul className="list-disc pl-5 space-y-2">
        {todos && todos.length > 0 ? (
          todos.map((todo: any) => (
            <li key={todo.id}>{todo.name || JSON.stringify(todo)}</li>
          ))
        ) : (
          <li className="text-foreground/60 italic">No rows returned.</li>
        )}
      </ul>
    </div>
  )
}

