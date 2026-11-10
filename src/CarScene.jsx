import { useRef, useEffect, useMemo, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  OrbitControls,
  ContactShadows,
  Environment,
  Lightformer,
  Sparkles,
  useGLTF,
  Html,
} from '@react-three/drei'
import * as THREE from 'three'

// Preload decoder
if (typeof window !== 'undefined') {
  useGLTF.setDecoderPath('/draco/')
}

// 3D Model yuklanish indikatori
function ModelLoader({ car }) {
  return (
    <Html center>
      <div className="model-loader-card">
        <div className="spinner-ring" style={{ borderTopColor: car.accent }} />
        <div className="loader-text">
          <b>{car.brand} {car.model}</b>
          <span>3D model yuklanmoqda…</span>
        </div>
      </div>
    </Html>
  )
}

// Haqiqiy GLB avtomobil modeli komponenti
function RealCarModel({
  car,
  color,
  paintFinish = 'metallic',
  assembled = true,
  headlightsOn = false,
}) {
  const { scene } = useGLTF(car.modelPath)
  const groupRef = useRef()
  const progress = useRef(assembled ? 0 : 1)
  const headlightMaterials = useRef([])
  const taillightMaterials = useRef([])

  // Modelni klonlash va geometriyani normallashtirish
  const { clone, scale, positionOffset, rotationY } = useMemo(() => {
    const cloned = scene.clone(true)

    // Barcha materiallarni mustaqil klonlash (bir-biriga xalaqit bermasligi uchun)
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => m.clone())
          } else {
            child.material = child.material.clone()
          }
        }
      }
    })

    // Aniq o'lcham va markazni hisoblash
    const box = new THREE.Box3().setFromObject(cloned)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)

    // Standart avtomobil uzunligiga moslash (~4.5 - 4.8 birlik)
    const targetLength = car.targetLength || 4.6
    const maxHoriz = Math.max(size.x, size.z)
    const s = targetLength / (maxHoriz > 0.001 ? maxHoriz : 1)

    // Agar avtomobil X o'qi bo'ylab cho'zilgan bo'lsa, 90 gradus burish
    const isXAligned = size.x > size.z
    const rotY = isXAligned ? Math.PI / 2 : 0

    // Har bir detalning asl o'rni va sochilish (portlash) yo'nalishini tayyorlash
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.userData.origPos = child.position.clone()

        // Detal markazini aniqlash
        const meshBox = new THREE.Box3().setFromObject(child)
        const meshCenter = new THREE.Vector3()
        meshBox.getCenter(meshCenter)

        const dir = meshCenter.clone().sub(center)
        const name = (child.name + ' ' + (child.material?.name || '')).toLowerCase()

        let ox = dir.x * 1.5
        let oy = Math.max(0.3, Math.abs(dir.y)) * 1.6
        let oz = dir.z * 1.5

        if (name.includes('wheel') || name.includes('tire') || name.includes('rim') || name.includes('hub')) {
          ox = (meshCenter.x >= center.x ? 1.6 : -1.6)
          oy = 0.15
          oz = dir.z * 0.4
        } else if (name.includes('glass') || name.includes('window') || name.includes('roof') || name.includes('windshield')) {
          oy = 2.4
          ox = dir.x * 0.5
        } else if (name.includes('door')) {
          ox = (meshCenter.x >= center.x ? 2.0 : -2.0)
          oy = 0.5
        } else if (name.includes('hood') || name.includes('bonnet') || name.includes('bumper') && dir.z > 0) {
          oz = 1.8
          oy = 0.9
        } else if (name.includes('spoiler') || name.includes('diffuser') || name.includes('trunk') || name.includes('boot')) {
          oz = -1.8
          oy = 0.9
        }

        child.userData.explodeOffset = new THREE.Vector3(ox, oy, oz)
      }
    })

    // G'ildiraklar pol yuzasida (y=0) turishi uchun:
    const posOffset = [
      -center.x * s,
      -box.min.y * s,
      -center.z * s,
    ]

    return { clone: cloned, scale: s, positionOffset: posOffset, rotationY: rotY }
  }, [scene, car])

  // Bo'yoq va chiroq materiallarini sozlash
  useEffect(() => {
    headlightMaterials.current = []
    taillightMaterials.current = []

    const paintTargets = car.paintNames || ['paint', 'body', 'color']
    const lightTargets = car.lightNames || ['light', 'lamp', 'headlight', 'projector']
    const tailTargets = car.tailNames || ['tail', 'rear', 'break']

    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        const mat = child.material
        const matName = (mat.name || '').toLowerCase()
        const meshName = (child.name || '').toLowerCase()

        // 1. Kuzov bo'yog'ini almashtirish
        const isPaint = paintTargets.some((target) => {
          const t = target.toLowerCase()
          return matName.includes(t) || meshName.includes(t)
        })

        if (isPaint) {
          mat.color.set(color)
          if (paintFinish === 'matte') {
            mat.metalness = 0.15
            mat.roughness = 0.65
            mat.clearcoat = 0.0
          } else if (paintFinish === 'gloss') {
            mat.metalness = 0.6
            mat.roughness = 0.12
            mat.clearcoat = 1.0
            mat.clearcoatRoughness = 0.06
          } else {
            // Metallic
            mat.metalness = 0.88
            mat.roughness = 0.22
            mat.clearcoat = 1.0
            mat.clearcoatRoughness = 0.08
          }
          mat.envMapIntensity = 1.7
          mat.needsUpdate = true
        }

        // 2. Faralar (Headlights)
        const isHeadlight = lightTargets.some((t) => matName.includes(t.toLowerCase()) || meshName.includes(t.toLowerCase()))
        if (isHeadlight && !matName.includes('red') && !matName.includes('tail')) {
          headlightMaterials.current.push(mat)
        }

        // 3. Orqa chiroqlar (Taillights)
        const isTail = tailTargets.some((t) => matName.includes(t.toLowerCase()) || meshName.includes(t.toLowerCase()))
        if (isTail || matName.includes('red_glass') || matName.includes('lights_red')) {
          taillightMaterials.current.push(mat)
        }
      }
    })
  }, [clone, color, paintFinish, car])

  // Fara yoqish/o'chirish reaksiyasi
  useEffect(() => {
    headlightMaterials.current.forEach((mat) => {
      if (headlightsOn) {
        mat.emissive = new THREE.Color('#d8f0ff')
        mat.emissiveIntensity = 3.5
        mat.toneMapped = false
      } else {
        mat.emissive = new THREE.Color('#000000')
        mat.emissiveIntensity = 0
      }
      mat.needsUpdate = true
    })

    taillightMaterials.current.forEach((mat) => {
      if (headlightsOn) {
        mat.emissive = new THREE.Color('#ff1e1e')
        mat.emissiveIntensity = 4.0
        mat.toneMapped = false
      } else {
        mat.emissive = new THREE.Color('#330000')
        mat.emissiveIntensity = 0.2
      }
      mat.needsUpdate = true
    })
  }, [headlightsOn])

  // Explode / Assembled silliq animatsiyasi
  useFrame((_, delta) => {
    const targetVal = assembled ? 0 : 1
    const step = 1 - Math.exp(-6.5 * Math.min(delta, 0.05))
    progress.current += (targetVal - progress.current) * step

    const p = progress.current
    clone.traverse((child) => {
      if (child.isMesh && child.userData.origPos && child.userData.explodeOffset) {
        child.position.x = child.userData.origPos.x + child.userData.explodeOffset.x * p
        child.position.y = child.userData.origPos.y + child.userData.explodeOffset.y * p
        child.position.z = child.userData.origPos.z + child.userData.explodeOffset.z * p
      }
    })
  })

  return (
    <group ref={groupRef}>
      <group rotation={[0, rotationY, 0]}>
        <primitive object={clone} scale={scale} position={positionOffset} />
      </group>
      {/* Agar faralar yoniq bo'lsa, oldinga haqiqiy yorug'lik nurlari */}
      {headlightsOn && (
        <group position={[0, 0.7, 2.2]}>
          <spotLight
            position={[0.7, 0, 0]}
            target-position={[0.7, -0.7, 8]}
            angle={0.65}
            penumbra={0.6}
            intensity={45}
            color="#d8f0ff"
            castShadow
          />
          <spotLight
            position={[-0.7, 0, 0]}
            target-position={[-0.7, -0.7, 8]}
            angle={0.65}
            penumbra={0.6}
            intensity={45}
            color="#d8f0ff"
            castShadow
          />
        </group>
      )}
    </group>
  )
}

// Kamera presets animatori
function CameraController({ viewMode, autoRotate }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  const targets = useMemo(() => {
    return {
      orbit: { pos: [6.5, 2.7, 7.2], target: [0, 0.85, 0] },
      front: { pos: [3.4, 1.8, 5.6], target: [0, 0.7, 0] },
      side: { pos: [0.0, 1.6, 8.4], target: [0, 0.75, 0] },
      rear: { pos: [-3.8, 1.9, -5.6], target: [0, 0.75, 0] },
      top: { pos: [0.1, 9.8, 0.2], target: [0, 0, 0] },
      wheel: { pos: [2.6, 0.75, 3.2], target: [1.1, 0.45, 1.8] },
    }
  }, [])

  useEffect(() => {
    if (!viewMode || viewMode === 'orbit') return
    const cfg = targets[viewMode] || targets.orbit
    const startPos = camera.position.clone()
    const targetPos = new THREE.Vector3(...cfg.pos)
    const startTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0.85, 0)
    const endTarget = new THREE.Vector3(...cfg.target)

    let startTime = performance.now()
    const duration = 900 // ms

    const animate = (now) => {
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / duration)
      // Smooth easeInOutCubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

      camera.position.lerpVectors(startPos, targetPos, ease)
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(startTarget, endTarget, ease)
        controlsRef.current.update()
      }

      if (t < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [viewMode, camera, targets])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, 0.85, 0]}
      enablePan={false}
      minDistance={3.5}
      maxDistance={18}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.05}
      autoRotate={autoRotate}
      autoRotateSpeed={1.5}
    />
  )
}

// Podium va sahna muhiti
function ShowroomStage({
  car,
  color,
  paintFinish,
  assembled,
  autoRotate,
  headlightsOn,
  viewMode,
}) {
  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[7, 10, 5]}
        intensity={2.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />
      <pointLight position={[-7, 4, -5]} intensity={35} color={car.accent} />
      <pointLight position={[7, 3, 5]} intensity={30} color="#6ee7ff" />

      {/* Studio yumshoq yorug'lik qutilari (Lightformers) */}
      <Environment resolution={256}>
        {/* Yuqori katta softbox */}
        <Lightformer
          intensity={3.2}
          position={[0, 8, 0]}
          rotation-x={Math.PI / 2}
          scale={[14, 14, 1]}
        />
        {/* Yon chiziqli diffuzerlar (kuzovda chiroyli aks hosil qiladi) */}
        <Lightformer
          intensity={2.5}
          position={[-7, 3, -4]}
          color={car.accent}
          scale={[8, 3, 1]}
        />
        <Lightformer
          intensity={2.2}
          position={[7, 3, 4]}
          color="#6ee7ff"
          scale={[8, 3, 1]}
        />
        <Lightformer
          intensity={1.8}
          position={[0, 2, -7]}
          color="#ffffff"
          scale={[10, 2, 1]}
        />
      </Environment>

      {/* Haqiqiy 3D Avtomobil modeli */}
      <Suspense fallback={<ModelLoader car={car} />}>
        <RealCarModel
          car={car}
          color={color}
          paintFinish={paintFinish}
          assembled={assembled}
          headlightsOn={headlightsOn}
        />
      </Suspense>

      {/* Podium (Aylanuvchi doira) */}
      <group position={[0, -0.01, 0]}>
        {/* Asosiy platforma */}
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[3.8, 3.9, 0.08, 64]} />
          <meshStandardMaterial
            color="#11141c"
            metalness={0.82}
            roughness={0.24}
            envMapIntensity={1.4}
          />
        </mesh>

        {/* Podium atrofidagi neon nurli halqa */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.72, 3.82, 64]} />
          <meshBasicMaterial color={car.accent} toneMapped={false} />
        </mesh>

        {/* Tashqi ikkinchi yupqa halqa */}
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[4.05, 4.09, 64]} />
          <meshBasicMaterial color="#38bdf8" opacity={0.4} transparent toneMapped={false} />
        </mesh>

        {/* Katta pol */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.081, 0]}>
          <planeGeometry args={[70, 70]} />
          <meshStandardMaterial color="#06070a" roughness={0.92} metalness={0.3} />
        </mesh>
      </group>

      {/* Yumshoq soya */}
      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.78}
        scale={15}
        blur={1.6}
        far={3.8}
        resolution={1024}
      />

      {/* Havoda suzuvchi mayda nur zarralari */}
      <Sparkles
        count={50}
        scale={[16, 7, 16]}
        position={[0, 3.5, 0]}
        size={2.2}
        speed={0.25}
        color={car.accent}
      />

      {/* Kamera boshqaruvi */}
      <CameraController viewMode={viewMode} autoRotate={autoRotate} />
    </>
  )
}

export default function CarScene({
  car,
  color,
  paintFinish,
  assembled,
  autoRotate,
  headlightsOn,
  viewMode,
  onPrevCar,
  onNextCar,
  carIdx = 0,
  totalCars = 8,
  onToggleAutoRotate,
}) {
  return (
    <div className="stage">
      {/* Sahna ustidagi avtomobil nomi va raqami */}
      <div className="stage-top-overlay">
        <div className="stage-car-chip">
          <span className="dot" style={{ background: color }} />
          <b>{car.brand} {car.model}</b>
          <span className="stage-car-count">{carIdx + 1} / {totalCars}</span>
        </div>
      </div>

      {/* Tezkor avtomobil almashtirish tugmalari (mobil va desktopda juda qulay) */}
      {onPrevCar && (
        <button
          className="stage-nav-arrow stage-nav-prev"
          onClick={(e) => {
            e.stopPropagation()
            onPrevCar()
          }}
          aria-label="Oldingi avtomobil"
          title="Oldingi avtomobil"
        >
          ‹
        </button>
      )}

      {onNextCar && (
        <button
          className="stage-nav-arrow stage-nav-next"
          onClick={(e) => {
            e.stopPropagation()
            onNextCar()
          }}
          aria-label="Keyingi avtomobil"
          title="Keyingi avtomobil"
        >
          ›
        </button>
      )}

      <Canvas
        shadows
        camera={{ position: [6.5, 2.7, 7.2], fov: 40 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#07080d']} />
        <fog attach="fog" args={['#07080d', 16, 42]} />
        <ShowroomStage
          car={car}
          color={color}
          paintFinish={paintFinish}
          assembled={assembled}
          autoRotate={autoRotate}
          headlightsOn={headlightsOn}
          viewMode={viewMode}
        />
      </Canvas>

      <div className="hint">
        <span className="hint-icon">360°</span>
        <span className="hint-text">Aylantirish: barmoq/sichqoncha bilan suring</span>
      </div>

      {onToggleAutoRotate && (
        <button
          className={'stage-autorotate-pill' + (autoRotate ? ' active' : '')}
          onClick={(e) => {
            e.stopPropagation()
            onToggleAutoRotate()
          }}
          title={autoRotate ? "Aylanishni to'xtatish" : "360° avto-aylantirish"}
        >
          {autoRotate ? '⏸ 360°' : '🔄 360°'}
        </button>
      )}
    </div>
  )
}
