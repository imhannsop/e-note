export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-12">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Ink
        </p>

        <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Thoughtful writing for the work that matters.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          Organize your ideas, keep your notes in one place, and turn scattered thinking into clear next steps.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start writing
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-6 py-3 text-base font-medium text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            View features
          </a>
        </div>
      </main>
    </div>
  );
}
