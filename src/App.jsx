import { useEffect, useRef, useState } from 'react'
import CarScene from './CarScene.jsx'
import { cars } from './carData.js'
import { sound } from './soundEngine.js'

function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    el.querySelectorAll('.reveal').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])
  return ref
}

export default function App() {
  const [carIdx, setCarIdx] = useState(0)
  const [assembled, setAssembled] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)
  const [headlightsOn, setHeadlightsOn] = useState(false)
  const [paintFinish, setPaintFinish] = useState('metallic') // 'metallic' | 'gloss' | 'matte'
  const [selectedColor, setSelectedColor] = useState(cars[0].defaultColor)
  const [viewMode, setViewMode] = useState('orbit')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isMuted, setIsMuted] = useState(false)
  const [isRevving, setIsRevving] = useState(false)
  const [rpm, setRpm] = useState(900)
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareCarIdx, setCompareCarIdx] = useState(1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const rootRef = useReveal()
  const timers = useRef([])
  const revInterval = useRef(null)

  const car = cars[carIdx]
  const compareCar = cars[compareCarIdx]

  // Brend tanlanganda rangni qayta tiklash
  useEffect(() => {
    setSelectedColor(cars[carIdx].defaultColor)
  }, [carIdx])

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
      if (revInterval.current) clearInterval(revInterval.current)
    }
  }, [])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // Brend almashtirish: silliq o'tish + motor start ovozi
  const selectCar = (idx) => {
    if (idx === carIdx) return
    clearTimers()
    sound.playClick()
    setAssembled(false)

    timers.current.push(
      setTimeout(() => {
        setCarIdx(idx)
        sound.revEngine(cars[idx].soundProfile, 1.2)
      }, 450)
    )

    timers.current.push(
      setTimeout(() => {
        setAssembled(true)
        sound.playSnap()
      }, 1000)
    )
  }

  // Sochib tashlash / Yig'ish
  const toggleAssembly = () => {
    clearTimers()
    sound.playClick()
    setAssembled((prev) => {
      if (!prev) sound.playSnap()
      return !prev
    })
  }

  // Ovoz tugmasi
  const toggleMute = () => {
    const muted = sound.toggleMute()
    setIsMuted(muted)
  }

  // Gaz bosish (Rev Engine)
  const startRev = (e) => {
    if (e && e.cancelable) e.preventDefault()
    sound.init()
    setIsRevving(true)
    sound.revEngine(car.soundProfile, 1.8)

    let currentRpm = 900
    if (revInterval.current) clearInterval(revInterval.current)
    revInterval.current = setInterval(() => {
      currentRpm = Math.min(8200, currentRpm + 650)
      setRpm(currentRpm)
    }, 60)
  }

  const stopRev = () => {
    setIsRevving(false)
    if (revInterval.current) clearInterval(revInterval.current)
    const decay = setInterval(() => {
      setRpm((prev) => {
        if (prev <= 950) {
          clearInterval(decay)
          return 900
        }
        return Math.max(900, prev - 450)
      })
    }, 50)
  }

  const showCar = (idx) => {
    selectCar(idx)
    document.getElementById('show')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleNavClick = (id) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const filteredCars = categoryFilter === 'all'
    ? cars
    : cars.filter((c) => c.category === categoryFilter)

  return (
    <>
      {/* ---------- NAVBAR ---------- */}
      <nav className="nav">
        <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="brand-logo-icon">⚡</span>
          AVTO<span className="accent-text">360</span>
          <span className="badge-pro">ULTRA 3D</span>
        </div>

        <ul className="nav-links">
          <li><a href="#show">Showroom</a></li>
          <li><a href="#rev-zone">Motor Ovozi</a></li>
          <li><a href="#brands">Brendlar ({cars.length})</a></li>
          <li><a href="#specs">Texnik HUD</a></li>
        </ul>

        <div className="nav-actions">
          <button
            className="btn-icon compare-nav-btn"
            onClick={() => setCompareModalOpen(true)}
            title="Avtomobillarni taqqoslash"
          >
            ⚖️ <span className="btn-icon-label">Taqqoslash</span>
          </button>
          <button
            className={'btn-icon sound-nav-btn' + (isMuted ? ' muted' : '')}
            onClick={toggleMute}
            title={isMuted ? 'Ovozni yoqish' : 'Ovozni o‘chirish'}
            aria-label="Ovoz sozlamasi"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            className={'nav-toggle' + (mobileMenuOpen ? ' open' : '')}
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Menyu"
            title="Menyuni ochish/yopish"
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>

        {/* Mobil uchun dropdown menyu */}
        <div className={'mobile-menu' + (mobileMenuOpen ? ' open' : '')}>
          <a href="#show" onClick={(e) => { e.preventDefault(); handleNavClick('show') }}>
            🏎 Showroom (3D Namoyish)
          </a>
          <a href="#rev-zone" onClick={(e) => { e.preventDefault(); handleNavClick('rev-zone') }}>
            🔊 Motor Ovozi & Tahometr
          </a>
          <a href="#brands" onClick={(e) => { e.preventDefault(); handleNavClick('brands') }}>
            🏁 Brendlar Galereyasi ({cars.length})
          </a>
          <a href="#specs" onClick={(e) => { e.preventDefault(); handleNavClick('specs') }}>
            📊 Texnik Xususiyatlar HUD
          </a>
          <button
            className="mobile-compare-btn"
            onClick={() => {
              setMobileMenuOpen(false)
              setCompareModalOpen(true)
            }}
          >
            ⚖️ Avtomobillarni Taqqoslash
          </button>
        </div>
      </nav>

      <main ref={rootRef}>
        {/* ---------- SHOWROOM SECTION ---------- */}
        <section className="showroom" id="show">
          {/* CHAP PANEL: BRENDLAR VA TOIFALAR */}
          <aside className="panel brand-list">
            <div className="panel-title-row">
              <p className="eyebrow">Afsonaviy Brendlar</p>
              <span className="count-chip">{cars.length} ta</span>
            </div>

            {/* Toifalar filtri */}
            <div className="filter-chips">
              <button
                className={'chip' + (categoryFilter === 'all' ? ' active' : '')}
                onClick={() => setCategoryFilter('all')}
              >
                Barchasi
              </button>
              <button
                className={'chip' + (categoryFilter === 'Superkar' ? ' active' : '')}
                onClick={() => setCategoryFilter('Superkar')}
              >
                Superkar
              </button>
              <button
                className={'chip' + (categoryFilter === 'Sport Kupe' ? ' active' : '')}
                onClick={() => setCategoryFilter('Sport Kupe')}
              >
                Sport
              </button>
              <button
                className={'chip' + (categoryFilter === 'Luks SUV' ? ' active' : '')}
                onClick={() => setCategoryFilter('Luks SUV')}
              >
                SUV
              </button>
              <button
                className={'chip' + (categoryFilter === 'Elektr EV' || categoryFilter === 'Cyber EV' ? ' active' : '')}
                onClick={() => setCategoryFilter(categoryFilter.includes('EV') ? 'all' : 'Elektr EV')}
              >
                Elektr
              </button>
            </div>

            <div className="brand-scroll-area">
              {filteredCars.map((c) => {
                const originalIndex = cars.findIndex((item) => item.id === c.id)
                const isSelected = originalIndex === carIdx
                return (
                  <button
                    key={c.id}
                    className={'brand-btn' + (isSelected ? ' active' : '')}
                    onClick={() => selectCar(originalIndex)}
                    style={
                      isSelected
                        ? { borderColor: c.accent, boxShadow: `0 0 20px ${c.accent}33` }
                        : undefined
                    }
                  >
                    <span className="dot" style={{ background: c.defaultColor }} />
                    <span className="brand-btn-text">
                      <b>{c.brand}</b>
                      <small>{c.model}</small>
                    </span>
                    <span className="btn-badge">{c.specs.power.split(' ')[0]} ot</span>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* O'RTA ASOSIY 3D SAHNA */}
          <div className="show-main">
            <div className="showroom-header reveal">
              <div className="header-badges">
                <span className="pill-badge" style={{ background: `${car.accent}22`, color: car.accent, borderColor: `${car.accent}55` }}>
                  {car.category}
                </span>
                <span className="pill-year">{car.year}</span>
                <span className="pill-engine">{car.specs.engine}</span>
              </div>
              <h1>
                {car.brand} <span className="grad">{car.model}</span>
              </h1>
              <p className="sub">{car.tagline}</p>
            </div>

            {/* 3D CANVAS */}
            <div className="stage-wrapper">
              <CarScene
                car={car}
                color={selectedColor}
                paintFinish={paintFinish}
                assembled={assembled}
                autoRotate={autoRotate}
                headlightsOn={headlightsOn}
                viewMode={viewMode}
              />

              {/* SAHNA USTIDAGI KAMERA TUGMALARI */}
              <div className="camera-bar">
                <span className="cam-label">Kamera:</span>
                {[
                  { id: 'orbit', label: '360° Erkin' },
                  { id: 'front', label: 'Old tomon' },
                  { id: 'side', label: 'Profil' },
                  { id: 'rear', label: 'Orqa' },
                  { id: 'top', label: 'Tepadan' },
                  { id: 'wheel', label: 'G‘ildirak' },
                ].map((cam) => (
                  <button
                    key={cam.id}
                    className={'cam-btn' + (viewMode === cam.id ? ' active' : '')}
                    onClick={() => {
                      setViewMode(cam.id)
                      sound.playClick()
                    }}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ASOSIY BOSHQARUV TUGMALARI */}
            <div className="controls reveal">
              <button
                className={'btn primary' + (!assembled ? ' active-glow' : '')}
                onClick={toggleAssembly}
              >
                {assembled ? '🔓 Sochish' : '🔧 Yig‘ish'}
              </button>

              <button
                className={'btn toggle-btn' + (headlightsOn ? ' on' : '')}
                onClick={() => {
                  setHeadlightsOn((v) => !v)
                  sound.playClick()
                }}
              >
                {headlightsOn ? '💡 Faralar: YONIQ' : '🔦 Faralar: O‘CHIQ'}
              </button>

              <button
                className={'btn toggle-btn' + (autoRotate ? ' on' : '')}
                onClick={() => {
                  setAutoRotate((v) => !v)
                  sound.playClick()
                }}
              >
                {autoRotate ? '⏸ To‘xtatish' : '🔄 360° Aylanish'}
              </button>

              <button
                className={'btn rev-btn' + (isRevving ? ' revving' : '')}
                onMouseDown={startRev}
                onMouseUp={stopRev}
                onMouseLeave={stopRev}
                onTouchStart={startRev}
                onTouchEnd={stopRev}
                onTouchCancel={stopRev}
                onContextMenu={(e) => e.preventDefault()}
                title="Bosib turing — motor gulduraydi!"
              >
                🚀 Gaz bosish (Rev)
              </button>
            </div>
          </div>

          {/* O'NG PANEL: KONFIGURATOR VA ANIQ TEXNIK HUD */}
          <aside className="panel car-info" style={{ borderTopColor: car.accent }}>
            <div
              className="car-info-head"
              style={{
                background: `linear-gradient(135deg, ${car.accent}1f, transparent)`,
              }}
            >
              <span className="swatch" style={{ background: selectedColor }} />
              <div className="car-info-title-box">
                <h2>{car.brand}</h2>
                <p className="model">{car.model}</p>
              </div>
              <span className="price-tag">{car.specs.price}</span>
            </div>

            {/* RANG VA BO'YOQ FINISHINI TANLASH */}
            <div className="customizer-box">
              <p className="section-label">Kuzov Rangi</p>
              <div className="color-palette">
                {car.colors.map((c) => (
                  <button
                    key={c.hex}
                    className={'color-swatch-btn' + (selectedColor === c.hex ? ' selected' : '')}
                    style={{ background: c.hex }}
                    onClick={() => {
                      setSelectedColor(c.hex)
                      sound.playClick()
                    }}
                    title={c.name}
                    aria-label={c.name}
                  >
                    {selectedColor === c.hex && <span className="check">✓</span>}
                  </button>
                ))}
              </div>

              <p className="section-label" style={{ marginTop: '14px' }}>Bo‘yoq Qoplamasi</p>
              <div className="finish-buttons">
                {[
                  { id: 'metallic', label: 'Metallik' },
                  { id: 'gloss', label: 'Yaltiroq' },
                  { id: 'matte', label: 'Mat / Satin' },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={'finish-btn' + (paintFinish === f.id ? ' active' : '')}
                    onClick={() => {
                      setPaintFinish(f.id)
                      sound.playClick()
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="desc">{car.desc}</p>

            {/* TEXNIK XUSUSIYATLAR HUD */}
            <div className="specs" id="specs">
              <div className="spec">
                <span>Quvvat</span>
                <b>{car.specs.power}</b>
              </div>
              <div className="spec">
                <span>0–100 km/s</span>
                <b style={{ color: car.accent }}>{car.specs.accel}</b>
              </div>
              <div className="spec">
                <span>Maks. Tezlik</span>
                <b>{car.specs.speed}</b>
              </div>
              <div className="spec">
                <span>Dvigatel</span>
                <b>{car.specs.engine}</b>
              </div>
              <div className="spec">
                <span>Uzatma</span>
                <b>{car.specs.transmission}</b>
              </div>
              <div className="spec">
                <span>Privod</span>
                <b>{car.specs.drive}</b>
              </div>
              <div className="spec">
                <span>Vazn</span>
                <b>{car.specs.weight}</b>
              </div>
              <div className="spec">
                <span>Narx</span>
                <b style={{ color: '#4ade80' }}>{car.specs.price}</b>
              </div>
            </div>

            <div className={'state ' + (assembled ? 'ok' : 'busy')}>
              {assembled ? '● Yig‘ilgan holat (100% tayyor)' : '◐ Detallarga sochilgan (Exploded view)'}
            </div>

            {/* SLAYDER NAVIGATSIYA */}
            <div className="arrows">
              <button
                className="arrow"
                onClick={() => selectCar((carIdx - 1 + cars.length) % cars.length)}
                aria-label="Oldingi avtomobil"
              >
                ‹
              </button>
              <span className="slider-counter">
                <b>{carIdx + 1}</b> / {cars.length}
              </span>
              <button
                className="arrow"
                onClick={() => selectCar((carIdx + 1) % cars.length)}
                aria-label="Keyingi avtomobil"
              >
                ›
              </button>
            </div>
          </aside>
        </section>

        {/* ---------- MOTOR OVOZI VA TAXOMETR ZONASI ---------- */}
        <section className="rev-zone" id="rev-zone">
          <div className="rev-container reveal">
            <div className="rev-info">
              <p className="eyebrow">Dvigatel Akustikasi</p>
              <h2>{car.brand} {car.model} ovozini sinang</h2>
              <p className="rev-desc">
                Web Audio sintezi orqali {car.specs.engine} motorining haqiqiy tovush tebranishlari.
                Gaz pedalini bosib turing va tahometr aylanishini his qiling!
              </p>
              <div className="rev-interactive">
                <button
                  className={'big-gas-pedal' + (isRevving ? ' active' : '')}
                  onMouseDown={startRev}
                  onMouseUp={stopRev}
                  onMouseLeave={stopRev}
                  onTouchStart={startRev}
                  onTouchEnd={stopRev}
                  onTouchCancel={stopRev}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className="pedal-icon">🏎</span>
                  <span className="pedal-text">
                    <b>{isRevving ? 'GAZ BOSILDI!' : 'GAZ PEDALINI BOSIB TURING'}</b>
                    <small>{car.soundProfile.toUpperCase()} Dvigatel roari</small>
                  </span>
                </button>
              </div>
            </div>

            {/* TAHOMETR GAUGE */}
            <div className="tachometer-box">
              <div className="gauge">
                <div className="gauge-dial">
                  <div
                    className="gauge-needle"
                    style={{
                      transform: `rotate(${-120 + (rpm / 8500) * 240}deg)`,
                    }}
                  />
                  <div className="gauge-center" />
                </div>
                <div className="gauge-readout">
                  <span className="rpm-num">{rpm}</span>
                  <span className="rpm-unit">RPM</span>
                </div>
              </div>
              <div className="gear-display">
                <span>UZATMA</span>
                <b>{isRevving ? '2' : 'N'}</b>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- BRANDS GALEREYASI ---------- */}
        <section id="brands">
          <div className="section-head reveal">
            <p className="eyebrow">Eksklyuziv Kolleksiya</p>
            <h2 className="section-title">8 Ta Afsonaviy 3D Avtomobil</h2>
            <p className="section-sub">
              Har bir avtomobil to‘liq 3D da modellashtirilgan, o‘ziga xos geometriya, interyer va texnik parametrlariga ega.
            </p>
          </div>

          <div className="grid">
            {cars.map((c, i) => (
              <article
                key={c.id}
                className={'card reveal' + (i === carIdx ? ' selected' : '')}
                onClick={() => showCar(i)}
                style={i === carIdx ? { borderColor: c.accent, boxShadow: `0 8px 30px ${c.accent}26` } : undefined}
              >
                <div className="card-top">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="badge-cat">{c.category}</span>
                  <span className="dot big" style={{ background: c.defaultColor }} />
                </div>

                <h3>{c.brand}</h3>
                <p className="card-model" style={{ color: c.accent }}>{c.model}</p>
                <p className="card-tag">{c.tagline}</p>
                <p className="card-desc">{c.desc}</p>

                <div className="mini-specs">
                  <span>⚡ {c.specs.power}</span>
                  <span>⏱ {c.specs.accel}</span>
                  <span>🚀 {c.specs.speed}</span>
                  <span style={{ color: '#4ade80', borderColor: '#4ade8044' }}>💰 {c.specs.price}</span>
                </div>

                <div className="card-footer">
                  <span className="card-cta">3D Namoyishda ko‘rish →</span>
                  <span className="card-year">{c.year}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {/* ---------- TAQQOSLASH MODAL OYNASI ---------- */}
      {compareModalOpen && (
        <div className="modal-backdrop" onClick={() => setCompareModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>⚖️ Avtomobillarni Taqqoslash</h2>
              <button className="modal-close" onClick={() => setCompareModalOpen(false)}>✕</button>
            </div>

            <div className="compare-selectors">
              <div>
                <label>1-Avtomobil:</label>
                <select value={carIdx} onChange={(e) => selectCar(Number(e.target.value))}>
                  {cars.map((c, idx) => (
                    <option key={c.id} value={idx}>{c.brand} {c.model}</option>
                  ))}
                </select>
              </div>
              <div className="vs-badge">VS</div>
              <div>
                <label>2-Avtomobil:</label>
                <select value={compareCarIdx} onChange={(e) => setCompareCarIdx(Number(e.target.value))}>
                  {cars.map((c, idx) => (
                    <option key={c.id} value={idx}>{c.brand} {c.model}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="compare-table-wrapper">
              <div className="compare-table">
                <div className="compare-row head">
                  <span>Xususiyat</span>
                  <b>{car.brand} {car.model}</b>
                  <b>{compareCar.brand} {compareCar.model}</b>
                </div>
                <div className="compare-row">
                  <span>Kategoriya</span>
                  <span>{car.category}</span>
                  <span>{compareCar.category}</span>
                </div>
                <div className="compare-row">
                  <span>Ot Kuchi</span>
                  <b style={{ color: car.accent }}>{car.specs.power}</b>
                  <b style={{ color: compareCar.accent }}>{compareCar.specs.power}</b>
                </div>
                <div className="compare-row">
                  <span>0-100 km/s</span>
                  <b>{car.specs.accel}</b>
                  <b>{compareCar.specs.accel}</b>
                </div>
                <div className="compare-row">
                  <span>Maksimal Tezlik</span>
                  <b>{car.specs.speed}</b>
                  <b>{compareCar.specs.speed}</b>
                </div>
                <div className="compare-row">
                  <span>Dvigatel</span>
                  <span>{car.specs.engine}</span>
                  <span>{compareCar.specs.engine}</span>
                </div>
                <div className="compare-row">
                  <span>Privod</span>
                  <span>{car.specs.drive}</span>
                  <span>{compareCar.specs.drive}</span>
                </div>
                <div className="compare-row">
                  <span>Vazn</span>
                  <span>{car.specs.weight}</span>
                  <span>{compareCar.specs.weight}</span>
                </div>
                <div className="compare-row">
                  <span>Narxi</span>
                  <b style={{ color: '#4ade80' }}>{car.specs.price}</b>
                  <b style={{ color: '#4ade80' }}>{compareCar.specs.price}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- FOOTER ---------- */}
      <footer>
        <div className="footer-left">
          <div className="brand">
            ⚡ AVTO<span>360</span>
          </div>
          <p>© 2026 AVTO360 — Realistik 3D Avtomobillar Saloni</p>
        </div>
        <div className="footer-right">
          <span>React 19 + Three.js + @react-three/fiber + Drei</span>
          <span className="dot-sep">·</span>
          <span>Khronos PBR Next materiallar & Web Audio sintezi</span>
        </div>
      </footer>
    </>
  )
}
