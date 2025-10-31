/**
 * Base UI Component class for game interface elements
 */
import { Scene } from 'phaser';

export interface UIComponentConfig {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  visible?: boolean;
  interactive?: boolean;
  depth?: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  hoverColor?: number;
  pressedColor?: number;
  fillColor?: number;
  showText?: boolean;
  textColor?: string;
  currentValue?: number;
  maxValue?: number;
  value?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export abstract class UIComponent {
  protected scene: Scene;
  protected config: UIComponentConfig;
  protected container?: Phaser.GameObjects.Container;
  protected children: Phaser.GameObjects.GameObject[] = [];
  protected isVisible: boolean = true;
  protected isInteractive: boolean = false;

  constructor(scene: Scene, config: UIComponentConfig = {}) {
    this.scene = scene;
    this.config = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      visible: true,
      interactive: false,
      depth: 100,
      ...config,
    };

    this.create();
  }

  /**
   * Create the component
   */
  protected abstract create(): void;

  /**
   * Add a child game object to this component
   */
  protected addChild<T extends Phaser.GameObjects.GameObject>(child: T): T {
    if (this.container) {
      this.container.add(child);
    }
    this.children.push(child);
    return child;
  }

  /**
   * Remove a child game object from this component
   */
  protected removeChild(child: Phaser.GameObjects.GameObject): void {
    if (this.container) {
      this.container.remove(child);
    }
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
    }
  }

  /**
   * Show the component
   */
  public show(): void {
    if (this.container) {
      this.container.setVisible(true);
    }
    this.isVisible = true;
    this.onShow();
  }

  /**
   * Hide the component
   */
  public hide(): void {
    if (this.container) {
      this.container.setVisible(false);
    }
    this.isVisible = false;
    this.onHide();
  }

  /**
   * Set component position
   */
  public setPosition(x: number, y: number): void {
    this.config.x = x;
    this.config.y = y;
    if (this.container) {
      this.container.setPosition(x, y);
    }
    this.onPositionChanged();
  }

  /**
   * Set component size
   */
  public setSize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.onSizeChanged();
  }

  /**
   * Destroy the component and clean up resources
   */
  public destroy(): void {
    this.children.forEach(child => child.destroy());
    this.children = [];
    if (this.container) {
      this.container.destroy();
    }
    this.onDestroy();
  }

  /**
   * Update the component (called each frame)
   */
  public update(): void {
    // Override in subclasses
  }

  // Event callbacks (override in subclasses)
  protected onShow(): void {}
  protected onHide(): void {}
  protected onPositionChanged(): void {}
  protected onSizeChanged(): void {}
  protected onDestroy(): void {}

  // Getters
  public get x(): number { return this.config.x || 0; }
  public get y(): number { return this.config.y || 0; }
  public get width(): number { return this.config.width || 100; }
  public get height(): number { return this.config.height || 100; }
  public get visible(): boolean { return this.isVisible; }
}

/**
 * Panel component - A basic UI panel with background
 */
export class Panel extends UIComponent {
  private background?: Phaser.GameObjects.Rectangle;
  private border?: Phaser.GameObjects.Rectangle;

  constructor(scene: Scene, config: UIComponentConfig & {
    backgroundColor?: number;
    borderColor?: number;
    borderWidth?: number;
    cornerRadius?: number;
  } = {}) {
    super(scene, config);
  }

  protected create(): void {
    // Create container
    this.container = this.scene.add.container(this.x, this.y);

    // Create background
    this.background = this.scene.add.rectangle(
      0, 0, this.width, this.height,
      this.config.backgroundColor || 0x2C3E50
    );
    this.addChild(this.background);

    // Create border if specified
    const borderWidth = this.config.borderWidth || 2;
    if (borderWidth > 0) {
      this.border = this.scene.add.rectangle(
        0, 0, this.width + borderWidth * 2, this.height + borderWidth * 2,
        this.config.borderColor || 0x34495E
      );
      this.border.setDepth(-1);
      this.addChild(this.border);
    }

    this.container.setDepth(this.config.depth || 100);
  }

  public setBackgroundColor(color: number): void {
    if (this.background) {
      this.background.setFillStyle(color);
    }
  }

  public setBorderColor(color: number): void {
    if (this.border) {
      this.border.setFillStyle(color);
    }
  }
}

/**
 * Text Button component
 */
export class TextButton extends UIComponent {
  private text?: Phaser.GameObjects.Text;
  private background?: Phaser.GameObjects.Rectangle;
  private onPressed?: () => void;
  private isHovered: boolean = false;
  private isPressed: boolean = false;

  constructor(scene: Scene, config: UIComponentConfig & {
    text: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: number;
    hoverColor?: number;
    pressedColor?: number;
    onPressed?: () => void;
  }) {
    super(scene, config);
    this.onPressed = config.onPressed;
  }

  protected create(): void {
    // Create container
    this.container = this.scene.add.container(this.x, this.y);

    // Create background
    this.background = this.scene.add.rectangle(
      0, 0, this.width, this.height,
      this.config.backgroundColor || 0x3498db
    ).setInteractive();
    this.addChild(this.background);

    // Create text
    this.text = this.scene.add.text(
      0, 0, this.config.text || '',
      {
        fontSize: `${this.config.fontSize || 16}px`,
        fontFamily: this.config.fontFamily || 'Arial',
        color: this.config.color || '#FFFFFF',
      }
    ).setOrigin(0.5);
    this.addChild(this.text);

    // Set up interactions
    this.setupInteractions();

    this.container.setDepth(this.config.depth || 100);
  }

  private setupInteractions(): void {
    if (!this.background) return;

    this.background.on('pointerdown', () => {
      this.isPressed = true;
      this.updateAppearance();
      if (this.onPressed) {
        this.onPressed();
      }
    });

    this.background.on('pointerup', () => {
      this.isPressed = false;
      this.updateAppearance();
    });

    this.background.on('pointerover', () => {
      this.isHovered = true;
      this.updateAppearance();
      this.scene.input.setDefaultCursor('pointer');
    });

    this.background.on('pointerout', () => {
      this.isHovered = false;
      this.isPressed = false;
      this.updateAppearance();
      this.scene.input.setDefaultCursor('default');
    });
  }

  private updateAppearance(): void {
    if (!this.background) return;

    if (this.isPressed) {
      this.background.setFillStyle(this.config.pressedColor || 0x2980b9);
    } else if (this.isHovered) {
      this.background.setFillStyle(this.config.hoverColor || 0x5dade2);
    } else {
      this.background.setFillStyle(this.config.backgroundColor || 0x3498db);
    }
  }

  public setText(text: string): void {
    if (this.text) {
      this.text.setText(text);
    }
  }
}

/**
 * Progress Bar component
 */
export class ProgressBar extends UIComponent {
  private background?: Phaser.GameObjects.Rectangle;
  private fill?: Phaser.GameObjects.Rectangle;
  private text?: Phaser.GameObjects.Text;

  constructor(scene: Scene, config: UIComponentConfig & {
    value?: number; // 0-1
    maxValue?: number;
    currentValue?: number;
    backgroundColor?: number;
    fillColor?: number;
    showText?: boolean;
    textColor?: string;
  } = {}) {
    super(scene, config);
  }

  protected create(): void {
    // Create container
    this.container = this.scene.add.container(this.x, this.y);

    // Create background
    this.background = this.scene.add.rectangle(
      0, 0, this.width, this.height,
      this.config.backgroundColor || 0x34495E
    );
    this.addChild(this.background);

    // Create fill
    this.fill = this.scene.add.rectangle(
      -this.width / 2, 0, this.width, this.height,
      this.config.fillColor || 0x2ecc71
    ).setOrigin(0, 0.5);
    this.addChild(this.fill);

    // Create text if enabled
    if (this.config.showText) {
      this.text = this.scene.add.text(
        0, 0, '0%',
        {
          fontSize: '12px',
          color: this.config.textColor || '#FFFFFF',
        }
      ).setOrigin(0.5);
      this.addChild(this.text);
    }

    this.container.setDepth(this.config.depth || 100);

    // Set initial value
    if (this.config.currentValue !== undefined && this.config.maxValue !== undefined) {
      this.setValue(this.config.currentValue, this.config.maxValue);
    } else if (this.config.value !== undefined) {
      this.setProgress(this.config.value);
    }
  }

  public setProgress(value: number): void {
    const clampedValue = Math.max(0, Math.min(1, value));
    if (this.fill) {
      this.fill.width = this.width * clampedValue;
    }
    if (this.text) {
      this.text.setText(`${Math.round(clampedValue * 100)}%`);
    }
  }

  public setValue(current: number, max: number): void {
    const progress = max > 0 ? current / max : 0;
    if (this.text) {
      this.text.setText(`${current}/${max}`);
    }
    this.setProgress(progress);
  }

  public setFillColor(color: number): void {
    if (this.fill) {
      this.fill.setFillStyle(color);
    }
  }
}

/**
 * Notification Toast component
 */
export class ToastNotification extends UIComponent {
  private background?: Phaser.GameObjects.Rectangle;
  private text?: Phaser.GameObjects.Text;
  private lifetime?: number;

  constructor(scene: Scene, config: UIComponentConfig & {
    text: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    lifetime?: number;
  }) {
    super(scene, config);
    this.lifetime = config.lifetime;
  }

  protected create(): void {
    const colors = {
      info: 0x3498db,
      success: 0x27ae60,
      warning: 0xf39c12,
      error: 0xe74c3c,
    };

    // Create container
    this.container = this.scene.add.container(this.x, this.y);

    // Create background
    const notificationType = this.config.type || 'info';
    this.background = this.scene.add.rectangle(
      0, 0, this.width, this.height,
      colors[notificationType as keyof typeof colors]
    );
    this.addChild(this.background);

    // Create text
    this.text = this.scene.add.text(
      0, 0, this.config.text || '',
      {
        fontSize: '14px',
        color: '#FFFFFF',
        wordWrap: { width: this.width - 20 },
        align: 'center',
      }
    ).setOrigin(0.5);
    this.addChild(this.text);

    this.container.setDepth(this.config.depth || 200);

    // Auto-destroy after lifetime
    if (this.lifetime) {
      this.scene.time.delayedCall(this.lifetime, () => {
        this.destroy();
      });
    }
  }

  public setText(text: string): void {
    if (this.text) {
      this.text.setText(text);
    }
  }
}