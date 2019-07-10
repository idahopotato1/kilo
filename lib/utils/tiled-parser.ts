/**
 * @module kilo/utils
 */
/// <reference path="../types/tiled.ts" />

/**
 * Interface for a Tiled map object.
 */
export interface TiledMap {
  /** Width of a tile in pixels. */
  tileWidth: number
  /** Height of a tile in pixels. */
  tileHeight: number
  /** Width of the map in tiles. */
  mapWidth: number
  /** Height of the map in tiles. */
  mapHeight: number
  /** Array of arrays of tile objects. */
  tiles: { [key: string]: any, x: number, y: number }[]

  /**
   * Gets an object from the map by name.
   *
   * @param name Name of object to get.
   * @param mandatory Whether a missing object is an error.
   */
  getObjectByName(name: string, mandatory?: boolean): Tiled.Object
  /**
   * Gets an array of objects from the map by type.
   *
   * @param type Type name of the objects to get.
   * @param mandatory Whether no results is an error.
   */
  getObjectsByType(type: string, mandatory?: boolean): Tiled.Object[]
}

/**
 * Interface to add extra layers above or below the main level layer.
 */
export interface ExtraLayer {
  /** Name of the layer to load. */
  name: string
  /** Whether the layer is rendered above the level or below. */
  isAboveLevel: boolean
}

let tileWidth: number
let tileHeight: number
let mapWidth: number
let mapHeight: number
let tilesPerRow: number

let tileset: Tiled.Tileset
let layers: Tiled.Layer[]
let tilesets: Tiled.Tileset[]
let entities: Tiled.Object[]

/**
 * Parses a Tiled map object into a simpler form.
 *
 * @param jsonObj Object from Tiled JSON export.
 */
export function tiledParser(jsonObj: Tiled.Map,
                            extraLayers?: ExtraLayer[]): TiledMap {
  tileWidth = jsonObj.tilewidth
  tileHeight = jsonObj.tileheight
  mapWidth = jsonObj.width
  mapHeight = jsonObj.height
  layers = jsonObj.layers
  tilesets = jsonObj.tilesets

  const levelLayer = getLayer('level')
  const entitiesLayer = getLayer('entities')

  tileset = getTileset()

  if (!entitiesLayer.objects) {
    throw new Error('Tiled Error: Missing entities objects.')
  }

  entities = []
  for (let i = 0; i < entitiesLayer.objects.length; i++) {
    let e = entitiesLayer.objects[i]
    const props = getTileProps(e.gid - tileset.firstgid)

    e = { ...e, ...props }
    e.y -= e.height

    entities.push(e)
  }

  tilesPerRow = Math.floor(tileset.imagewidth / tileset.tilewidth)
  const tiles = loadTilesByLayer(levelLayer, extraLayers)

  return {
    tileWidth,
    tileHeight,
    mapWidth,
    mapHeight,
    tiles,
    getObjectByName,
    getObjectsByType
  }
}

const getLayer = (name: string, mandatory = true) => {
  let layer = undefined

  if (!layers) {
    throw new Error('Tiled Error: No layers found.')
  }

  for (let i = 0; i < layers.length; i++) {
    if (layers[i].name === name) {
      layer = layers[i]
      break
    }
  }

  if (!layer && mandatory) {
    throw new Error(`Tiled Error: Missing layer "${name}".`)
  }

  return layer
}

const loadTilesByLayer = (levelLayer: Tiled.Layer,
                       extraLayers: ExtraLayer[]) => {
  const tiles: any[] = []

  if (extraLayers) {
    extraLayers.filter(layer => layer.isAboveLevel === false)
      .forEach(layer => {
        loadTiles(tiles, getLayer(layer.name, false))
      })
  }

  loadTiles(tiles, levelLayer)

  if (extraLayers) {
    extraLayers.filter(layer => layer.isAboveLevel === true)
      .forEach(layer => {
        loadTiles(tiles, getLayer(layer.name, false))
      })
  }

  return tiles
}

const loadTiles = (tiles: any[], layer: Tiled.Layer) => {
  const index = tiles.push([]) - 1

  if (!layer || !layer.data) {
    return
  }

  for (let i = 0; i < layer.data.length; i++) {
    const idx = layer.data[i] - tileset.firstgid
    const props = getTileProps(idx)

    tiles[index].push({ ...props, ...{
      x: idx % tilesPerRow,
      y: Math.floor(idx / tilesPerRow)
    } })
  }
}

const getTileset = () => {
  if (!tilesets || !tilesets[0]) {
    throw new Error('Tiled Error: Missing tileset index 0.')
  }

  return tilesets[0]
}

const getTileProps = (id: number) => {
  const tmp: any = {}
  let tile: any = undefined

  if (!tileset.tiles) {
    return tmp
  }

  for (let i = 0; i < tileset.tiles.length; i++) {
    if (tileset.tiles[i].id === id) {
      tile = tileset.tiles[i]
      break
    }
  }

  if (!tile) return tmp

  if (tile.type) {
    tmp.type = tile.type
  }

  if (tile.properties) {
    for (let i = 0; i < tile.properties.length; i++) {
      tmp[tile.properties[i].name] = tile.properties[i].value
    }
  }

  return tmp
}

const convertEntity = (e: Tiled.Object) => {
  const tmp = {
    x: e.x,
    y: e.y,
    type: e.type,
    name: e.name,
    width: e.width,
    height: e.height
  }

  if (e.properties) {
    for (let i = 0; i < e.properties.length; i++) {
      (tmp as any)[e.properties[i].name] = e.properties[i].value
    }
  }

  return tmp
}

const getObjectsByType = (type: string, mandatory = false): Tiled.Object[] => {
  const es = []
  for (let i = 0; i < entities.length; i++) {
    if (entities[i].type === type) {
      es.push(entities[i])
    }
  }

  if (!es.length && mandatory) {
    throw new Error(`Tiled Error: Missing an object of type "${type}".`)
  }

  const converted = []
  for (let i = 0; i < es.length; i++) {
    converted.push(convertEntity(es[i]))
  }

  return converted as any
}

const getObjectByName = (name: string, mandatory = false): Tiled.Object => {
  let ent: any

  for (let i = 0; i < entities.length; i++) {
    if (entities[i].name === name) {
      ent = entities[i]
      break
    }
  }

  if (!ent && mandatory) {
    throw new Error(`Tiled Error: Missing named object "${name}".`)
  }

  return convertEntity(ent) as any
}
