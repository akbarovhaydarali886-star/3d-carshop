// Web Audio API yordamida haqiqiy avtomobil dvigatel ovozlari va UI tovushlari generatori
// Hech qanday tashqi audio fayllar talab qilinmaydi — 100% brauzerda sintezlanadi!

class SoundEngine {
  constructor() {
    this.ctx = null
    this.isMuted = false
    this.currentVoice = null
    this.isRevving = false
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    if (this.isMuted) {
      this.stopEngine()
    }
    return this.isMuted
  }

  // UI chertish tovushi
  playClick() {
    if (this.isMuted) return
    this.init()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    const now = this.ctx.currentTime

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  // Detallar yig'ilganda "qarsillab" o'rnashish tovushi
  playSnap() {
    if (this.isMuted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const filter = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(600, now)

    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  }

  // Gaz bosilganda / dvigatel gupillaganda (Rev Engine)
  revEngine(profile = 'v8', duration = 1.4) {
    if (this.isMuted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const masterGain = this.ctx.createGain()
    masterGain.gain.setValueAtTime(0.25, now)
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration)
    masterGain.connect(this.ctx.destination)

    if (profile === 'ev') {
      // Elektromobil futuristik tovushi
      const osc1 = this.ctx.createOscillator()
      const osc2 = this.ctx.createOscillator()
      const filter = this.ctx.createBiquadFilter()

      osc1.type = 'sine'
      osc2.type = 'triangle'

      // Pitch sweep: 180Hz -> 850Hz -> 300Hz
      osc1.frequency.setValueAtTime(160, now)
      osc1.frequency.exponentialRampToValueAtTime(820, now + duration * 0.45)
      osc1.frequency.exponentialRampToValueAtTime(260, now + duration)

      osc2.frequency.setValueAtTime(320, now)
      osc2.frequency.exponentialRampToValueAtTime(1640, now + duration * 0.45)
      osc2.frequency.exponentialRampToValueAtTime(520, now + duration)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1200, now)
      filter.frequency.exponentialRampToValueAtTime(3500, now + duration * 0.4)
      filter.frequency.exponentialRampToValueAtTime(800, now + duration)

      osc1.connect(filter)
      osc2.connect(filter)
      filter.connect(masterGain)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + duration)
      osc2.stop(now + duration)
      return
    }

    // Ichki yonuv dvigateli (V8, V12, Turbo)
    const baseFreq = profile === 'v12' ? 85 : profile === 'turbo6' ? 70 : 55
    const peakFreq = profile === 'v12' ? 340 : profile === 'turbo6' ? 280 : 220

    // Asosiy silindrlar to'lqini
    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    const subOsc = this.ctx.createOscillator()
    const filter = this.ctx.createBiquadFilter()

    osc1.type = 'sawtooth'
    osc2.type = 'triangle'
    subOsc.type = 'sine'

    // RPM oshishi va tushishi
    osc1.frequency.setValueAtTime(baseFreq, now)
    osc1.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.4)
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, now + duration)

    osc2.frequency.setValueAtTime(baseFreq * 2.01, now)
    osc2.frequency.exponentialRampToValueAtTime(peakFreq * 2.01, now + duration * 0.4)
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.1, now + duration)

    subOsc.frequency.setValueAtTime(baseFreq * 0.5, now)
    subOsc.frequency.exponentialRampToValueAtTime(peakFreq * 0.5, now + duration * 0.4)
    subOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, now + duration)

    // Egzoz filtr rezonansi
    filter.type = 'lowpass'
    filter.Q.value = 4
    filter.frequency.setValueAtTime(350, now)
    filter.frequency.exponentialRampToValueAtTime(2200, now + duration * 0.4)
    filter.frequency.exponentialRampToValueAtTime(300, now + duration)

    osc1.connect(filter)
    osc2.connect(filter)
    subOsc.connect(filter)
    filter.connect(masterGain)

    osc1.start(now)
    osc2.start(now)
    subOsc.start(now)

    osc1.stop(now + duration)
    osc2.stop(now + duration)
    subOsc.stop(now + duration)
  }

  stopEngine() {
    if (this.currentVoice) {
      try {
        this.currentVoice.gain.gain.setValueAtTime(0.001, this.ctx.currentTime)
        this.currentVoice.osc.stop(this.ctx.currentTime + 0.05)
      } catch (e) {}
      this.currentVoice = null
    }
  }
}

export const sound = new SoundEngine()
