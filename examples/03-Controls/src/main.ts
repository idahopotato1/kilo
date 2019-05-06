import { Game, KeyControls, Types } from 'kilo/lib'

const tileSize = 32
const mapSize = tileSize * 13
const game = new Game(mapSize, mapSize)

// Uncomment below line to show FPS & UPS counters
// Game.debug = true

const plane = new Types.Sprite(new Types.Texture('assets/images/plane.png'))
const controls = new KeyControls()

const speed = 0.2

game.scene.add(plane)

game.run((dt: number, t: number) => {
  const { x, y } = controls

  plane.pos.x += x * dt * (tileSize / speed)
  plane.pos.y += y * dt * (tileSize / speed)

  // Keep the sprite inside the view
  if (plane.pos.x < -8) {
    plane.pos.x = -8
  }

  if (plane.pos.x > (mapSize - 56)) {
    plane.pos.x = mapSize - 56
  }

  if (plane.pos.y < -4) {
    plane.pos.y = -4
  }

  if (plane.pos.y > (mapSize - 56)) {
    plane.pos.y = mapSize - 56
  }
})

