import React, { useEffect, useState } from 'react'

export default function App() {
  const [menuActive, setMenuActive] = useState(false)

  useEffect(() => {
    // Reveal on scroll
    const revealElements = document.querySelectorAll('.reveal')
    const revealOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    const revealOnScroll = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('active')
        observer.unobserve(entry.target)
      })
    }, revealOptions)
    revealElements.forEach(el => revealOnScroll.observe(el))

    // Reveal nav immediately
    setTimeout(() => {
      const nav = document.querySelector('.reveal-nav')
      if (nav) nav.style.opacity = '1'
    }, 100)

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar')
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 50) navbar?.classList.add('scrolled')
          else navbar?.classList.remove('scrolled')
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll)

    // Blob follow mouse
    const blob = document.getElementById('blob')
    const onMouse = (e) => {
      if (window.innerWidth <= 992) return
      const { clientX, clientY } = e
      blob?.animate({ left: `${clientX}px`, top: `${clientY}px` }, { duration: 3000, fill: 'forwards' })
    }
    if (blob) window.addEventListener('mousemove', onMouse)

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (blob) window.removeEventListener('mousemove', onMouse)
      revealOnScroll.disconnect()
    }
  }, [])

  useEffect(() => {
    const hamburger = document.querySelector('.hamburger')
    const navLinks = document.querySelector('.nav-links')
    if (hamburger) {
      if (menuActive) {
        hamburger.classList.add('active')
        navLinks?.classList.add('active')
      } else {
        hamburger.classList.remove('active')
        navLinks?.classList.remove('active')
      }
    }
  }, [menuActive])

  return (
    <>
      <div id="blob" />

      <nav className="navbar reveal-nav">
        <div className="nav-content">
          <a href="#" className="logo">Vít.</a>
          <button className="hamburger" aria-label="Menu" onClick={() => setMenuActive(v => !v)}>
            <span />
            <span />
            <span />
          </button>
          <div className="nav-links">
            <a href="#o-mne">O mně</a>
            <a href="#projekty">Projekty</a>
            <a href="#kontakt">Kontakt</a>
            <a href="cv.pdf" className="btn-primary-small" target="_blank" rel="noreferrer">Stáhnout CV</a>
          </div>
        </div>
      </nav>

      <main>
        <section id="domu" className="hero">
          <div className="hero-content">
            <div className="hero-image-wrapper reveal">
              <img src="assets/cv-photo.jpg" alt="Vít Šebestík" className="hero-image" />
            </div>
            <div className="hero-text">
              <h1 className="reveal delay-1">Vít <span className="accent-text">Šebestík</span></h1>
              <p className="subtitle reveal delay-2">Vývojář s magisterským titulem z počítačové lingvistiky na Masarykově univerzitě. Spojuji technickou preciznost s analytickým myšlením a smyslem pro design, abych dodával řešení, na která se dá spolehnout.</p>
              <div className="hero-actions reveal delay-3">
                <a href="#projekty" className="btn-primary">Prohlédnout projekty</a>
                <a href="#o-mne" className="btn-secondary">Proč se mnou spolupracovat</a>
              </div>
            </div>
          </div>
          <div className="scroll-indicator reveal delay-4">
            <span>Zjistit více</span>
            <div className="mouse"><div className="wheel" /></div>
          </div>
        </section>

        <section id="o-mne" className="about">
          <div className="section-header reveal">
            <h2>Proč se mnou <span className="accent-text">spolupracovat</span></h2>
            <p>Kombinace odborného vzdělání, technických dovedností a zodpovědného přístupu k práci.</p>
          </div>
          <div className="about-grid">
            <div className="glass-card reveal delay-1">
              <h3>Odbornost</h3>
              <p>Jsem absolventem magisterského studia počítačové lingvistiky s přesahem do frontendového i backendového vývoje. Tato kombinace mi umožňuje přistupovat k projektům analyticky a navrhovat řešení, která jsou zároveň funkční, srozumitelná a dobře strukturovaná.</p>
            </div>
            <div className="glass-card reveal delay-2">
              <h3>Přístup k práci</h3>
              <p>Ke každému projektu přistupuji zodpovědně, zakládám si na otevřené komunikaci a jasně stanovených očekáváních. Pracuji na projektech od analytických nástrojů po moderní webové prezentace a vždy dbám na to, aby výsledek odrážel skutečné potřeby klienta.</p>
            </div>
          </div>
        </section>

        <section id="projekty" className="projects">
          <div className="section-header reveal">
            <h2>Vybrané <span className="accent-text">projekty</span></h2>
            <p>Výběr prací, které dokládají mé zkušenosti napříč vývojem, designem a analýzou dat.</p>
          </div>
          <div className="projects-grid">
            <div className="project-card reveal delay-1">
              <div className="project-content">
                <h3>RustTools</h3>
                <p>Rychlá webová aplikace pro hráče survival hry Rust s mnoha kalkulačkami pro optimalizaci herní strategie.</p>
                <div className="tags"><span>React</span><span>TypeScript</span><span>Tailwind CSS</span></div>
                <a href="https://www.rust-tools.eu/" target="_blank" className="project-link" rel="noreferrer">Zobrazit web →</a>
              </div>
            </div>

            <div className="project-card reveal delay-2">
              <div className="project-content">
                <h3>OmniDesk</h3>
                <p>Moderní desktopová aplikace pro komplexní správu systému a hromadnou instalaci softwaru přes Winget po čisté instalaci Windows.</p>
                <div className="tags"><span>Python</span><span>Winget</span><span>PowerShell</span></div>
                <a href="https://github.com/Vissse/OmniDesk" target="_blank" className="project-link" rel="noreferrer">Zobrazit na GitHubu →</a>
              </div>
            </div>

            <div className="project-card reveal delay-3">
              <div className="project-content">
                <h3>Interaktivní seznam přání</h3>
                <p>Webová aplikace pro správu dárků. Návštěvníci mohou položky procházet a anonymně rezervovat.</p>
                <div className="tags"><span>Vanilla JS</span><span>Firebase</span><span>BaaS</span></div>
              </div>
            </div>

            <div className="project-card reveal delay-1">
              <div className="project-content">
                <h3>Audio Analysis Tool</h3>
                <p>Software pro analýzu zvukových korpusů s automatickou detekcí lexikálních jednotek pomocí AI.</p>
                <div className="tags"><span>AI</span><span>NLP</span><span>Python</span></div>
                <a href="https://is.muni.cz/th/vdlvx/" target="_blank" className="project-link" rel="noreferrer">Zobrazit práci →</a>
              </div>
            </div>

            <div className="project-card reveal delay-2">
              <div className="project-content">
                <h3>Analýza sentimentu titulků</h3>
                <p>Bakalářská práce zaměřená na NLP. Skript pro čištění titulků a sestavení korpusu pro analýzu emocí.</p>
                <div className="tags"><span>NLP</span><span>Text Mining</span></div>
                <a href="https://is.muni.cz/th/jprzd/" target="_blank" className="project-link" rel="noreferrer">Zobrazit práci →</a>
              </div>
            </div>

            <div className="project-card reveal delay-3">
              <div className="project-content">
                <h3>MP celní služby</h3>
                <p>Kompletní redesign a úprava webové prezentace s důrazem na moderní vizuální identitu a responzivitu.</p>
                <div className="tags"><span>Web Design</span><span>UI/UX</span></div>
                <a href="https://www.mpcelnisluzby.cz/" target="_blank" className="project-link" rel="noreferrer">Zobrazit web →</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="kontakt" className="footer">
        <div className="footer-content reveal">
          <h2>Pojďme se <span className="accent-text">spojit</span></h2>
          <p style={{ marginBottom: '3rem' }}>Hledáte spolehlivého vývojáře pro váš projekt? Kontaktujte mě a rád s vámi proberu detaily i možnosti spolupráce.</p>

          <div className="contact-grid">
            <div className="contact-column">
              <h3>Kontakt</h3>
              <a href="mailto:vit.sebestik@gmail.com" className="contact-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                vit.sebestik@gmail.com
              </a>
              <a href="tel:+420777583149" className="contact-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                +420 777 583 149
              </a>
              <div className="contact-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>Alžírská 1521/4<br/>708 00, Ostrava-Poruba<br/>Česká republika</span>
              </div>
            </div>

            <div className="contact-column">
              <h3>Sítě</h3>
              <div className="social-links">
                <a href="https://github.com/Vissse" target="_blank" className="social-icon" aria-label="GitHub" rel="noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                </a>
                <a href="https://www.linkedin.com/in/v%C3%ADt-%C5%A1ebest%C3%ADk-9853aa415/?locale=en" target="_blank" className="social-icon" aria-label="LinkedIn" rel="noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                </a>
                <a href="https://www.instagram.com/sebestik.vit/" target="_blank" className="social-icon" aria-label="Instagram" rel="noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
                <a href="https://www.facebook.com/profile.php?id=61592559031749" target="_blank" className="social-icon" aria-label="Facebook" rel="noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
              </div>
              <div className="cv-download-wrapper" style={{ marginTop: '2rem' }}>
                <a href="cv.pdf" className="btn-primary" target="_blank" rel="noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  Stáhnout Životopis (PDF)
                </a>
              </div>
            </div>
          </div>

          <p className="copyright" style={{ marginTop: '4rem' }}>&copy; 2026 Vít Šebestík. Všechna práva vyhrazena.</p>
        </div>
      </footer>
    </>
  )
}
