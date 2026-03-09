// Captures keyboard and mouse state so gameplay systems can poll input each frame.
export class Input {
  keys: Set<string> = new Set();
  mouseX = 0;
  mouseY = 0;
  /** Mouse position in world coordinates */
  worldMouseX = 0;
  worldMouseY = 0;
  mouseDown = false;

  private canvas: HTMLCanvasElement | null = null;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundBlur: () => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundBlur = this.onBlur.bind(this);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    // Listens on the window so mouse updates continue even when overlays sit above the canvas.
    window.addEventListener("mousemove", this.boundMouseMove);
    window.addEventListener("mousedown", this.boundMouseDown);
    window.addEventListener("mouseup", this.boundMouseUp);
    window.addEventListener("blur", this.boundBlur);
  }

  detach(): void {
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("mousemove", this.boundMouseMove);
    window.removeEventListener("mousedown", this.boundMouseDown);
    window.removeEventListener("mouseup", this.boundMouseUp);
    window.removeEventListener("blur", this.boundBlur);
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
    // Prevents browser defaults for the keys the game uses heavily during play.
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code
      )
    ) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  private onMouseDown(_e: MouseEvent): void {
    this.mouseDown = true;
  }

  private onMouseUp(_e: MouseEvent): void {
    this.mouseDown = false;
  }

  private onBlur(): void {
    this.keys.clear();
    this.mouseDown = false;
  }

  // Exposes convenience getters derived from the raw key state.
  get pause(): boolean {
    return this.keys.has("KeyP") || this.keys.has("Escape");
  }
}
