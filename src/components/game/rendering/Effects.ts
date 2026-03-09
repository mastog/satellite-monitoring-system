// Renders full-screen post-effects such as flashes, vignettes, and scanlines during gameplay.

export class Effects {
  // Tracks the intensity of the current full-screen flash overlay.
  private flashAlpha = 0;
  private flashColor = "#ffffff";
  private flashDecay = 0.05;

  // Tracks the baseline and damage-boosted vignette intensity.
  vignetteIntensity = 0.3;

  flash(color: string = "#ffffff", intensity: number = 0.4): void {
    this.flashColor = color;
    this.flashAlpha = intensity;
  }

  update(): void {
    if (this.flashAlpha > 0.01) {
      this.flashAlpha *= 1 - this.flashDecay;
    } else {
      this.flashAlpha = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Draws the white flash overlay used for hits and explosive moments.
    if (this.flashAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Draws the dark vignette that frames the play area.
    if (this.vignetteIntensity > 0) {
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.25,
        width / 2,
        height / 2,
        width * 0.75
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${this.vignetteIntensity})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Adds faint scanlines so the game view keeps the same display texture as the UI.
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let y = 0; y < height; y += 3) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  /** Damage vignette pulse — intensifies then fades */
  damagePulse(): void {
    this.flash("#ff0000", 0.2);
    this.vignetteIntensity = 0.6;
    // Leaves the boosted value in place so the next update can decay it smoothly.
    setTimeout(() => {
      this.vignetteIntensity = 0.3;
    }, 200);
  }
}
