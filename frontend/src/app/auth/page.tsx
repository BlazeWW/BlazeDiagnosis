import Link from 'next/link'

export default function AuthPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Auth Page</h1>
      <p className="mt-2">This is the authentication page at <code>/auth</code>.</p>
      <p className="mt-4">
        <Link href="/">Back to home</Link>
      </p>
    </main>
  )
}
