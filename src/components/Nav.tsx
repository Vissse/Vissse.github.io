export function Nav() {
  return (
    <nav className="scroll-nav" id="scrollNav">
      <a href="#domu" className="logo" aria-label="Home">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
      </a>
      <span className="scroll-nav-sep" aria-hidden="true" />
      <div className="scroll-nav-links">
        <a href="#web-projects">Webs</a>
        <a href="#app-projects">Apps</a>
        <a href="#o-mne">About</a>
        <a href="#kontakt">Contact</a>
      </div>
    </nav>
  );
}
