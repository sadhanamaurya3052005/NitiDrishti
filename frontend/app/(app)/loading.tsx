export default function WorkspaceLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl" aria-busy="true" aria-label="Loading workspace">
      <div className="flex items-start gap-4">
        <div className="nd-skeleton h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-3">
          <div className="nd-skeleton h-6 w-64" />
          <div className="nd-skeleton h-4 w-full max-w-xl" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="nd-card space-y-3 p-6 lg:col-span-3">
          <div className="nd-skeleton h-4 w-48" />
          <div className="nd-skeleton h-3 w-full" />
          <div className="nd-skeleton h-3 w-5/6" />
          <div className="nd-skeleton h-3 w-4/6" />
        </div>
        <div className="nd-panel space-y-3 p-6 lg:col-span-2">
          <div className="nd-skeleton h-11 w-11 rounded-xl" />
          <div className="nd-skeleton h-3 w-full" />
          <div className="nd-skeleton h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}
