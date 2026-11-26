export default function VisitorTreeLoading() {
  return (
    <div className="hoho-app" aria-busy="true" aria-label="Loading Christmas tree">
      <div className="stage-shell">
        <header className="stage-header">
          <div className="loading-shimmer loading-pill-sm" />
          <div className="loading-shimmer loading-pill-md" />
          <div className="loading-shimmer loading-pill-sm" />
        </header>
        <main className="stage-container">
          <div className="loading-tree-skeleton">
            <div className="loading-shimmer loading-tree-star" />
            <div className="loading-shimmer loading-tree-tier w-20" />
            <div className="loading-shimmer loading-tree-tier w-32" />
            <div className="loading-shimmer loading-tree-tier w-44" />
            <div className="loading-shimmer loading-tree-tier w-56" />
          </div>
        </main>
        <div className="stage-footer">
          <div className="loading-shimmer loading-pill-sm" />
          <div className="loading-shimmer loading-pill-md" />
          <span aria-hidden="true" />
        </div>
      </div>

      <div className="sidebar-shell">
        <div className="sidebar-topbar">
          <div className="loading-shimmer loading-pill-sm" />
          <div className="loading-shimmer loading-pill-sm" />
        </div>
        <aside className="social-card">
          <div className="loading-shimmer loading-card-block" />
          <div className="loading-shimmer loading-textarea-block" />
          <div className="loading-shimmer loading-btn-block" />
        </aside>
      </div>
    </div>
  );
}
