// Tracks the viewport position and applies smoothing and shake so the camera follows gameplay cleanly.
import { CAMERA_LERP, SHAKE_DECAY } from "@/lib/game/balance";

export class Camera {
  x = 0;
  y = 0;
  width: number;
  height: number;

  // Stores the current shake state applied after impacts and other high-intensity events.
  private shakeIntensity = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /** Smoothly follow a target position */
  follow(targetX: number, targetY: number): void {
    this.x += (targetX - this.x) * CAMERA_LERP;
    this.y += (targetY - this.y) * CAMERA_LERP;
  }

  /** Add screen shake */
  shake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  /** Update shake per frame */
  updateShake(): void {
    if (this.shakeIntensity > 0.5) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= SHAKE_DECAY;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  /** Get screen-space X from world X */
  screenX(worldX: number): number {
    return worldX - this.x + this.width / 2 + this.shakeOffsetX;
  }

  /** Get screen-space Y from world Y */
  screenY(worldY: number): number {
    return worldY - this.y + this.height / 2 + this.shakeOffsetY;
  }

  /** Get world X from screen X */
  worldX(screenX: number): number {
    return screenX + this.x - this.width / 2;
  }

  /** Get world Y from screen Y */
  worldY(screenY: number): number {
    return screenY + this.y - this.height / 2;
  }

  /** Check if a world-space entity is visible (with margin) */
  isVisible(worldX: number, worldY: number, margin: number = 64): boolean {
    const sx = this.screenX(worldX);
    const sy = this.screenY(worldY);
    return (
      sx >= -margin &&
      sx <= this.width + margin &&
      sy >= -margin &&
      sy <= this.height + margin
    );
  }

  /** Viewport bounds in world space */
  get left(): number {
    return this.x - this.width / 2;
  }
  get right(): number {
    return this.x + this.width / 2;
  }
  get top(): number {
    return this.y - this.height / 2;
  }
  get bottom(): number {
    return this.y + this.height / 2;
  }
}
