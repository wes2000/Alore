export interface InputState {
  // Movement
  moveUp: boolean
  moveDown: boolean
  moveLeft: boolean
  moveRight: boolean
  sprint: boolean

  // Actions
  interact: boolean
  attack: boolean
  ability1: boolean
  ability2: boolean
  dodge: boolean

  // UI toggles
  openSkills: boolean
  openPets: boolean
  openInventory: boolean
  openMap: boolean

  // Pet ability triggers
  pet0Ability1: boolean
  pet0Ability2: boolean
  pet1Ability1: boolean
  pet1Ability2: boolean

  // Raw mouse
  mouseX: number
  mouseY: number
  mouseDown: boolean
  mouseWorldX: number
  mouseWorldY: number
}

const defaultState = (): InputState => ({
  moveUp: false, moveDown: false, moveLeft: false, moveRight: false, sprint: false,
  interact: false, attack: false, ability1: false, ability2: false, dodge: false,
  openSkills: false, openPets: false, openInventory: false, openMap: false,
  pet0Ability1: false, pet0Ability2: false, pet1Ability1: false, pet1Ability2: false,
  mouseX: 0, mouseY: 0, mouseDown: false, mouseWorldX: 0, mouseWorldY: 0,
})

const KEY_BINDINGS: Record<string, keyof InputState> = {
  'KeyW':       'moveUp',
  'ArrowUp':    'moveUp',
  'KeyS':       'moveDown',
  'ArrowDown':  'moveDown',
  'KeyA':       'moveLeft',
  'ArrowLeft':  'moveLeft',
  'KeyD':       'moveRight',
  'ArrowRight': 'moveRight',
  'ShiftLeft':  'sprint',
  'ShiftRight': 'sprint',
  'KeyE':       'interact',
  'Space':      'attack',
  'KeyQ':       'ability1',
  'KeyR':       'ability2',
  'ControlLeft': 'dodge',
  'KeyL':       'openSkills',
  'KeyP':       'openPets',
  'Tab':        'openInventory',
  'KeyM':       'openMap',
  'Digit1':     'pet0Ability1',
  'Digit2':     'pet0Ability2',
  'Digit3':     'pet1Ability1',
  'Digit4':     'pet1Ability2',
}

// Keys that should be treated as toggle (pressed once = event)
const TOGGLE_KEYS = new Set<keyof InputState>([
  'interact', 'openSkills', 'openPets', 'openInventory', 'openMap',
])

export class InputSystem {
  private state: InputState = defaultState()
  private justPressed = new Set<keyof InputState>()
  private attached = false
  private canvas: HTMLElement | null = null
  private joystick = { x: 0, y: 0 }

  attach(canvas: HTMLElement): void {
    if (this.attached) return
    this.canvas = canvas
    this.attached = true
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    canvas.addEventListener('mousemove', this.onMouseMove)
    canvas.addEventListener('mousedown', this.onMouseDown)
    canvas.addEventListener('mouseup', this.onMouseUp)
    canvas.addEventListener('contextmenu', this.onContextMenu)
  }

  detach(): void {
    this.attached = false
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.canvas?.removeEventListener('mousemove', this.onMouseMove)
    this.canvas?.removeEventListener('mousedown', this.onMouseDown)
    this.canvas?.removeEventListener('mouseup', this.onMouseUp)
    this.canvas?.removeEventListener('contextmenu', this.onContextMenu)
    this.canvas = null
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Don't capture when typing in an input
    if ((e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA') return

    const action = KEY_BINDINGS[e.code]
    if (!action) return

    // Prevent browser defaults for game keys
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }

    if (!this.state[action]) {
      (this.state as unknown as Record<string, boolean>)[action] = true
      this.justPressed.add(action)
    }
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    const action = KEY_BINDINGS[e.code]
    if (action) {
      (this.state as unknown as Record<string, boolean>)[action] = false
    }
  }

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas!.getBoundingClientRect()
    this.state.mouseX = e.clientX - rect.left
    this.state.mouseY = e.clientY - rect.top
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this.state.mouseDown = true
  }

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.state.mouseDown = false
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
  }

  /** Set virtual joystick vector from mobile controls (values in -1..1) */
  setJoystickVector(x: number, y: number): void {
    this.joystick.x = x
    this.joystick.y = y
  }

  /** Set a boolean input action from mobile controls */
  setMobileButton(action: keyof InputState, pressed: boolean): void {
    const cur = (this.state as unknown as Record<string, boolean>)[action]
    if (pressed && !cur) {
      (this.state as unknown as Record<string, boolean>)[action] = true
      this.justPressed.add(action)
    } else if (!pressed) {
      (this.state as unknown as Record<string, boolean>)[action] = false
    }
  }

  /** Update mouse world position (set by renderer each frame) */
  setMouseWorldPosition(wx: number, wy: number): void {
    this.state.mouseWorldX = wx
    this.state.mouseWorldY = wy
  }

  /** Returns current input state snapshot */
  getState(): Readonly<InputState> {
    return this.state
  }

  /** Check if a toggle key was just pressed this frame */
  wasJustPressed(action: keyof InputState): boolean {
    return this.justPressed.has(action)
  }

  /** Get movement direction vector (normalized). Joystick takes priority over keyboard. */
  getMoveVector(): { x: number; y: number } {
    if (this.joystick.x !== 0 || this.joystick.y !== 0) {
      return { x: this.joystick.x, y: this.joystick.y }
    }
    let x = 0, y = 0
    if (this.state.moveLeft)  x -= 1
    if (this.state.moveRight) x += 1
    if (this.state.moveUp)    y -= 1
    if (this.state.moveDown)  y += 1
    // Normalize diagonal
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2)
      x *= inv
      y *= inv
    }
    return { x, y }
  }

  /** Must be called at end of each frame to clear just-pressed state */
  endFrame(): void {
    this.justPressed.clear()
  }
}
