/**
 * @module kilo/renderer
 */
import { Renderer } from './renderer'
import { Camera, Container, Game, TileSprite } from '../'
import { Entity, Sprite, Text, Rect } from '../types'
import { ShaderProgram, GLUtils } from './webgl'
import { defaults } from './webgl/defaults'

interface TextureInfo {
  texture: WebGLTexture
}

/**
 * Recursive rendering utilizing HTML5 canvas and WebGL.
 */
export class WebGLRenderer extends Renderer {
  private gl: WebGLRenderingContext
  private ctx: CanvasRenderingContext2D
  private shaderProgramTex: ShaderProgram
  private shaderProgramCol: ShaderProgram

  private positionBuffer: WebGLBuffer
  private textureBuffer: WebGLBuffer
  private rectBuffer: WebGLBuffer
  private textures: Map<string, TextureInfo>
  private globalAlpha: number

  private fullArea = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])

    /**
     * Initialize CanvasRenderer object.
     *
     * @param width Width of the canvas in pixels.
     * @param height Height of the canvas in pixels.
     * @param container The HTMLElement to add the canvas to.
     */
    constructor(width: number, height: number, container: HTMLElement) {
      super(width, height, container)

      this.gl = this.canvas.getContext('webgl', { antialias: false })

      this.positionBuffer = this.gl.createBuffer()
      this.textureBuffer = this.gl.createBuffer()
      this.rectBuffer = this.gl.createBuffer()

      this.createTextCanvas()

      this.textures = new Map<string, TextureInfo>()
      this.shaderProgramTex = new ShaderProgram(this.gl, {
        vertex: defaults.shaders.vertexTexture,
        fragment: defaults.shaders.fragmentTexture,
      }, 'default-texture')
      this.shaderProgramCol = new ShaderProgram(this.gl, {
        vertex: defaults.shaders.vertexColor,
        fragment: defaults.shaders.fragmentColor,
      }, 'default-color')

      this.gl.useProgram(this.shaderProgramTex.program)
    }

  render(container: Container, clear = true) {
    if (!container.visible || container.alpha <= 0) {
      return
    }

    if (clear) {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT)
      this.ctx.clearRect(0, 0, this.width, this.height)
    }

    this.renderRecursive(container)

    if (Game.debug) {
      const { ctx } = this

      ctx.save()

      ctx.fillStyle = 'rgba(51, 51, 51, .5)'
      ctx.fillRect(0, 0, 160, 25)

      ctx.font = '12pt monospace'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'

      ctx.fillText(`FPS: ${Game.FPS} UPS: ${Game.UPS}`, 7, 17)

      ctx.restore()
    }
  }

  private renderRecursive(container: Entity | Container,
                          camera?: Camera) {
    const { gl } = this

    if (container.alpha) {
      this.globalAlpha = container.alpha
    }

    this.setBuffer(gl, this.positionBuffer,
      this.shaderProgramTex.getAttribLocation('a_position'))

    for (let i = 0; i < container.children.length; i++) {
      const child = (container as any).children[i]

      if (!child.visible || child.alpha <= 0) {
        continue
      }

      if (camera && !(child instanceof Container || child instanceof Text) &&
        !this.isInCamera(child, camera)) {
        continue
      }

      if (child.texture) {
        if (child.tileWidth && child.frame) {
          this.drawTileSprite(child, camera)
        } else {
          this.drawSprite(child, camera)
        }
      }

      if (child.hasChildren) {
        this.renderRecursive(child, child.worldSize
          ? (child as Camera)
          : camera)
      }

      if (child.style && child.width && child.height) {
        this.drawRect(child, camera)
      }
    }
  }

  private drawSprite(sprite: Sprite, camera: Camera) {
    const { gl, shaderProgramTex } = this

    this.setBuffer(gl, this.textureBuffer,
      shaderProgramTex.getAttribLocation('a_texCoord'))
    this.getTexture(gl, sprite)

    const posMatrix = this.getPositionMatrix(camera, sprite)
    const texMatrix = GLUtils.getScale( sprite.width / sprite.texture.img.width,
      sprite.height / sprite.texture.img.height)

    gl.uniformMatrix3fv(shaderProgramTex.getUniformLocation('u_posMatrix'),
      false, posMatrix)
    gl.uniformMatrix3fv(shaderProgramTex.getUniformLocation('u_texMatrix'),
      false, texMatrix)

    gl.uniform1f(shaderProgramTex.getUniformLocation('u_texAlpha'),
      this.globalAlpha)
    gl.uniform1i(shaderProgramTex.getUniformLocation('u_sampler'), 0)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  private drawTileSprite(sprite: TileSprite, camera: Camera) {
    const { gl, shaderProgramTex } = this

    this.setBuffer(gl, this.textureBuffer,
      shaderProgramTex.getAttribLocation('a_texCoord'))
    this.getTexture(gl, sprite)

    const posMatrix = this.getPositionMatrix(camera, sprite)
    const texScaleMatrix = GLUtils.getScale(
      sprite.tileWidth / sprite.texture.img.width,
      sprite.tileHeight / sprite.texture.img.height
    )
    const texOffsetMatrix = GLUtils.getTranslation(
      sprite.frame.x * sprite.tileWidth / sprite.texture.img.width,
      sprite.frame.y * sprite.tileHeight / sprite.texture.img.height
    )
    const texMatrix = GLUtils.multiplyMatrices(texScaleMatrix, texOffsetMatrix)

    gl.uniformMatrix3fv(shaderProgramTex.getUniformLocation('u_posMatrix'),
      false, posMatrix)
    gl.uniformMatrix3fv(shaderProgramTex.getUniformLocation('u_texMatrix'),
      false, texMatrix)

    gl.uniform1f(shaderProgramTex.getUniformLocation('u_texAlpha'),
      this.globalAlpha)
    gl.uniform1i(shaderProgramTex.getUniformLocation('u_sampler'), 0)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  private drawRect(rect: Rect, camera: Camera) {
    const { gl, shaderProgramCol } = this
    const attrib = shaderProgramCol.getAttribLocation('a_color')

    gl.useProgram(this.shaderProgramCol.program)

    this.setBuffer(gl, this.rectBuffer, attrib)

    const posMatrix = this.getPositionMatrix(camera, rect)
    const color = GLUtils.getHexColorMatrix(rect.style.fill)

    gl.uniformMatrix3fv(shaderProgramCol.getUniformLocation('u_posMatrix'),
      false, posMatrix)
    gl.uniform1f(shaderProgramCol.getUniformLocation('u_alpha'), rect.alpha)

    gl.vertexAttrib3fv(attrib, new Float32Array(color))

    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.useProgram(this.shaderProgramTex.program)
  }

  private getTexture(gl: WebGLRenderingContext, sprite: Sprite | TileSprite) {
    if (!Game.assets.completed) {
      return null
    }

    const { img } = sprite.texture

    if (!img.complete) {
      if (Game.debug) {
        console.warn(`Image ${img.src} not yet loaded...`)
      }

      return null
    }

    if (this.textures.has(img.src)) {
      const texture = this.textures.get(img.src).texture
      gl.bindTexture(gl.TEXTURE_2D, texture)

      return texture
    }

    const texture = this.createTexture()
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

    this.textures.set(img.src, { texture })

    return texture
  }

  private createTexture() {
    const { gl } = this
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    return texture
  }

  private setBuffer(gl: WebGLRenderingContext,
                    buffer: WebGLBuffer, attrib: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.fullArea, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(attrib)
    gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0)
  }

  private getPositionMatrix(camera: any, sprite: Sprite | TileSprite | Rect) {
    const cameraTranslation = GLUtils.getCameraTranslation(camera)
    const originMatrix = GLUtils.getTranslation(0, 0)

    const projectionMatrix =
      GLUtils.get2DProjectionMatrix(this.width, this.height)
    const translationMatrix =
      GLUtils.getTranslation(sprite.pos.x, sprite.pos.y)
    const scaleMatrix =
      GLUtils.getScaleMatrix(sprite, sprite.width, sprite.height)

    let posMatrix = GLUtils.multiplyMatrices(scaleMatrix, originMatrix)
    posMatrix = GLUtils.multiplyMatrices(posMatrix, cameraTranslation)
    posMatrix = GLUtils.multiplyMatrices(posMatrix, translationMatrix)

    const sp = (sprite as Sprite | TileSprite)
    if (sp.anchor) {
      const anchorMatrix = GLUtils.getTranslation(sp.anchor.x, sp.anchor.y)
      posMatrix = GLUtils.multiplyMatrices(posMatrix, anchorMatrix)
    }

    posMatrix = GLUtils.multiplyMatrices(posMatrix, projectionMatrix)

    return posMatrix
  }

  private createTextCanvas() {
    const canvas = document.createElement('canvas')

    canvas.width = this.width
    canvas.height = this.height

    canvas.id = 'kilo-text-canvas'
    canvas.style.zIndex = '1000'
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'

    this.container.appendChild(canvas)
    this.ctx = canvas.getContext('2d')
  }
}
