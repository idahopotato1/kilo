/**
 * @packageDocumentation
 * @module kilo/Types
 */

/** Interface with x and y coordinates. */
export interface Point {
  /** X axis coordinate */
  x: number
  /** Y axis coordinate */
  y: number
}

/**
 * Simple 2D vector that provides vector math helpers.
 *
 * Most methods are chainable.
 *
 * ```typescript
const vector1 = new Vec(4, 8)
const vector2 = Vec.from(vector1)

vector1.add(vector2).multiply(3)
```
 */
export class Vec implements Point {
  /** X coordinate value. */
  x: number
  /** Y coordinate value. */
  y: number

  /**
   * Creates a new Vec from the provided Vec.
   *
   * @param v Vec to copy into new Vec.
   */
  static from(v: Vec) {
    return new Vec().copy(v)
  }

  /**
   * Initialize Vec object.
   *
   * @param x X coordinate value.
   * @param y Y coordinate value.
   */
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  /**
   * Set the coordinates of the Vec.
   *
   * @param x X coordinate value.
   * @param y Y coordinate value.
   */
  set(x: number, y: number) {
    this.x = x
    this.y = y

    return this
  }

  /**
   * Copies the x and y values from the provided Vec.
   *
   * @param vec The Vec to copy values from.
   */
  copy(vec: Vec) {
    const { x, y } = vec
    return this.set(x, y)
  }

  /**
   * Creates a cloned copy of the Vec.
   */
  clone() {
    return Vec.from(this)
  }

  /**
   * Adds the x and y values from the provided Vec.
   *
   * @param vec The Vec to add values from.
   */
  add(vec: Vec) {
    const { x, y } = vec

    this.x += x
    this.y += y

    return this
  }

  /**
   * Subtracts the x and y values from the provided Vec.
   *
   * @param vec The Vec to subtract values from.
   */
  subtract(vec: Vec) {
    const { x, y } = vec

    this.x -= x
    this.y -= y

    return this
  }

  /**
   * Multiplies the x and y values by the provided value.
   *
   * @param s The scalar value to multiply.
   */
  multiply(s: number) {
    this.x *= s
    this.y *= s

    return this
  }

  /**
   * Divides the x and y values by the provided value.
   *
   * @param s The scalar value to divide by.
   */
  divide(s: number) {
    this.x /= s
    this.y /= s

    return this
  }

  /** Gets the magnitude of the Vec. */
  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  /** Gets the normal of the Vec. */
  normalize() {
    const mag = this.mag()

    if (mag > 0) {
      this.divide(mag)
    }

    return this
  }

  /**
   * Gets the dot product of two Vecs.
   *
   * @param vec The Vec to get dot product from.
   */
  dot(vec: Vec) {
    const{ x, y } = vec

    return this.x * x + this.y * y
  }

  /**
   * Custom string representation.
   *
   * @returns String formatted as "(x, y)"
   */
  toString() {
    return `(${this.x}, ${this.y})`
  }
}
