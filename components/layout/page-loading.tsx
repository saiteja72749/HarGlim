/** Spinner shown while a book, author or category page loads. */
export function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#F8F9F7]" role="status" aria-label="Loading">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#0F3D3E]" />
    </div>
  );
}
