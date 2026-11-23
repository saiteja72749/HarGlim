export function MainContainer({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="min-w-0 flex flex-1 flex-col focus:outline-none">
      {children}
    </main>
  );
}
