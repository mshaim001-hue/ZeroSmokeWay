import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

type StageProps = {
  profile: string
  transitionKey: string
  reducedMotion: boolean
  onInspect: () => void
  inspectEnabled: boolean
}

/** Canvas supplies atmosphere; all meaningful actions also live in the HTML overlay. */
export function PhaserStage(props: StageProps) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  const refresh = useRef<(() => void) | null>(null)
  latest.current = props

  useEffect(() => {
    const parent = host.current
    if (!parent) return
    let disposed = false
    class RoomStage extends Phaser.Scene {
      private background?: Phaser.GameObjects.Image
      private backdrop!: Phaser.GameObjects.Graphics
      private dust!: Phaser.GameObjects.Graphics
      private marker!: Phaser.GameObjects.Graphics
      private hotspot!: Phaser.GameObjects.Zone
      private activeKey = ''
      private currentProfile = ''
      private generation = 0
      private driftX = 0
      private driftY = 0

      create() {
        this.backdrop = this.add.graphics()
        this.dust = this.add.graphics().setDepth(2)
        this.marker = this.add.graphics().setDepth(3)
        this.hotspot = this.add.zone(0, 0, 64, 64).setDepth(4).setInteractive({ useHandCursor: true })
        this.hotspot.on('pointerdown', () => { if (latest.current.inspectEnabled) latest.current.onInspect() })
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
          this.driftX = (pointer.x / Math.max(1, this.scale.width) - .5) * 8
          this.driftY = (pointer.y / Math.max(1, this.scale.height) - .5) * 5
        })
        this.scale.on('resize', this.layout, this)
        refresh.current = () => this.changeRoom()
        this.changeRoom()
      }

      private layout() {
        const w = this.scale.width, h = this.scale.height
        const warm = ['pleasure', 'company', 'origin', 'freedom'].includes(latest.current.profile)
        this.backdrop.clear()
        const top = warm ? 0x292018 : 0x121e29
        this.backdrop.fillGradientStyle(top, top, 0x070b10, 0x070b10, 1)
        this.backdrop.fillRect(0, 0, w, h)
        if (this.background) {
          const factor = Math.max(w / this.background.width, h / this.background.height) * 1.025
          this.background.setScale(factor).setPosition(w / 2, h / 2)
        }
        this.hotspot.setPosition(w * .5, h * .48)
        this.hotspot.input!.enabled = latest.current.inspectEnabled
        this.marker.setVisible(latest.current.inspectEnabled)
      }

      private changeRoom() {
        if (disposed) return
        this.layout()
        const profile = latest.current.profile.replace(/[^a-z-]/g, '') || 'corridor'
        if (profile === this.currentProfile && this.activeKey === latest.current.transitionKey) return
        this.activeKey = latest.current.transitionKey
        if (profile === this.currentProfile) {
          this.cameras.main.fadeIn(latest.current.reducedMotion ? 100 : 400, 5, 8, 12)
          return
        }
        this.currentProfile = profile
        const generation = ++this.generation
        const key = `room-${profile}`
        const apply = () => {
          if (disposed || generation !== this.generation) return
          const oldKey = this.background?.texture.key
          this.background?.destroy()
          this.background = undefined
          if (this.textures.exists(key)) this.background = this.add.image(0, 0, key).setDepth(1).setTint(['pleasure', 'company', 'origin'].includes(profile) ? 0xfff4e5 : 0xeaf3ff)
          if (oldKey && oldKey !== key && this.textures.exists(oldKey)) this.textures.remove(oldKey)
          this.layout()
          this.cameras.main.fadeIn(latest.current.reducedMotion ? 100 : 550, 5, 8, 12)
        }
        this.cameras.main.fadeOut(latest.current.reducedMotion ? 100 : 350, 5, 8, 12)
        if (this.textures.exists(key)) { this.time.delayedCall(latest.current.reducedMotion ? 100 : 350, apply); return }
        // Completion fires on successful and failed image loads; failed loads keep the gradient.
        this.load.once(Phaser.Loader.Events.COMPLETE, apply)
        this.load.image(key, `/game/${profile}.webp`)
        if (!this.load.isLoading()) this.load.start()
      }

      update(time: number) {
        if (disposed) return
        const { reducedMotion, inspectEnabled } = latest.current
        const w = this.scale.width, h = this.scale.height
        if (this.background) this.background.setPosition(w / 2 + (reducedMotion ? 0 : this.driftX), h / 2 + (reducedMotion ? 0 : this.driftY))
        this.dust.clear()
        if (!reducedMotion) {
          this.dust.fillStyle(0xf4d7a6, .15)
          for (let i = 0; i < 14; i++) {
            const x = ((i * .173 + Math.sin(time / 16000 + i) * .015) % 1) * w
            const y = ((i * .237 + time / (85000 + i * 3000)) % 1) * h
            this.dust.fillCircle(x, y, i % 3 === 0 ? 1.5 : .8)
          }
        }
        this.marker.clear().setVisible(inspectEnabled)
        if (inspectEnabled) {
          const radius = reducedMotion ? 15 : 15 + Math.sin(time / 900) * 2
          this.marker.lineStyle(1, 0xe8c28e, .65).strokeCircle(w * .5, h * .48, radius)
          this.marker.fillStyle(0xe8c28e, .7).fillCircle(w * .5, h * .48, 2)
        }
      }
    }
    // A CSS-sized, 1x canvas deliberately avoids high-DPR mobile framebuffer costs.
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: Math.max(parent.clientWidth, 1),
      height: Math.max(parent.clientHeight, 1),
      backgroundColor: '#070b10',
      transparent: false,
      antialias: true,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: RoomStage,
      fps: { target: 30, forceSetTimeOut: false },
      render: { powerPreference: 'low-power' },
    })
    const observer = new ResizeObserver(() => {
      if (!disposed) game.scale.resize(Math.max(parent.clientWidth, 1), Math.max(parent.clientHeight, 1))
    })
    observer.observe(parent)
    const visibility = () => { if (document.hidden) game.loop.sleep(); else game.loop.wake() }
    document.addEventListener('visibilitychange', visibility)
    return () => {
      disposed = true
      refresh.current = null
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      game.destroy(true)
    }
  }, [])

  useEffect(() => { refresh.current?.() }, [props.profile, props.transitionKey, props.reducedMotion, props.inspectEnabled])
  return <div ref={host} className="phaser-stage" aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
}
