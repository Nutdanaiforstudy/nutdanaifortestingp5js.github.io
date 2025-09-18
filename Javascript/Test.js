// --- Sprite class ---
class Sprite {
  constructor(characterFolder, actionFolder, fileName, fileExt, totalSize, posX, posY, scale) {
    this.characterFolder = characterFolder;
    this.actionFolder = actionFolder;
    this.fileName = fileName;
    this.fileExt = fileExt;
    this.totalSize = totalSize;

    this.posX = posX;
    this.posY = posY;
    this.spriteScale = scale;

    this.images = [];
    this.currentIndex = 0;
    this.isStop = false;
    this.isFlipX = false;
    this.isLoop = true;
  }

  preload() {
    for (let i = 1; i <= this.totalSize; i++) {
      let path = `${this.characterFolder}/${this.actionFolder}/${this.fileName}${i}.${this.fileExt}`;
      this.images.push(loadImage(path));
    }
  }

  render() {
    push();
    translate(this.posX, this.posY);

    if (this.isFlipX) {
      scale(-this.spriteScale, this.spriteScale);
      image(this.images[this.currentIndex], -this.images[this.currentIndex].width, 0);
    } else {
      scale(this.spriteScale, this.spriteScale);
      image(this.images[this.currentIndex], 0, 0);
    }

    pop();
  }

  renderNext() {
    if (!this.isStop) {
      this.currentIndex++;
      if (this.currentIndex >= this.totalSize) {
        if (this.isLoop) {
          this.currentIndex = 0;
        } else {
          this.currentIndex = this.totalSize - 1;
        }
      }
    }
    this.render();
  }

  play() {
    if (this.isLoop) {
      this.renderNext();
    } else {
      if (this.currentIndex === this.totalSize - 1) {
        this.render();
      } else {
        this.renderNext();
      }
    }
  }
}

// --- Unit class ---
class Unit {
  constructor(x, y, scale = 1.5, label = "P") {
    this.label = label;
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 5;
    this.attackQueue = 0;
    this.facing = 1; // 1 = right, -1 = left

    // Sprites
    this.idle = new Sprite("Warrior", "idle", "Warrior_Idle_", "png", 6, x, y, scale);
    this.attack = new Sprite("Warrior", "Attack", "Warrior_Attack_", "png", 12, x, y, scale);
    this.run = new Sprite("Warrior", "Run", "Warrior_Run_", "png", 8, x, y, scale);

    this.currentSprite = this.idle;
  }

  preload() {
    this.idle.preload();
    this.attack.preload();
    this.run.preload();
  }

  play() {
    this.currentSprite.play();
    this.drawHealthBar();
    this.drawLabel();
    this.handleAttackEnd();
  }

  drawHealthBar() {
    push();
    noStroke();
    let barWidth = 50;
    let barHeight = 6;
    let healthRatio = this.health / this.maxHealth;

    let x = this.currentSprite.posX + 10;
    let y = this.currentSprite.posY - 25;

    fill(255, 0, 0);
    rect(x, y, barWidth, barHeight);

    fill(0, 255, 0);
    rect(x, y, barWidth * healthRatio, barHeight);
    pop();
  }

  drawLabel() {
    push();
    fill(0);
    textAlign(CENTER);
    textSize(14);
    text(this.label, this.currentSprite.posX + 35, this.currentSprite.posY - 35);
    pop();
  }

  handleMovement(left, right, up, down) {
    let moving = false;

    if (keyIsDown(left)) { // Left
      this.run.isFlipX = true;
      this.facing = -1;
      this.run.posX -= this.speed;
      moving = true;
    }
    if (keyIsDown(right)) { // Right
      this.run.isFlipX = false;
      this.facing = 1;
      this.run.posX += this.speed;
      moving = true;
    }
    if (keyIsDown(up)) { // Up
      this.run.posY -= this.speed;
      moving = true;
    }
    if (keyIsDown(down)) { // Down
      this.run.posY += this.speed;
      moving = true;
    }

    // --- Pac-Man wrap-around ---
    let w = this.run.images[0].width * this.run.spriteScale;
    let h = this.run.images[0].height * this.run.spriteScale;

    if (this.run.posX > width) this.run.posX = -w;
    if (this.run.posX + w < 0) this.run.posX = width;
    if (this.run.posY > height) this.run.posY = -h;
    if (this.run.posY + h < 0) this.run.posY = height;

    if (this.currentSprite !== this.attack) {
      if (moving) {
        this.run.posX = this.currentSprite.posX;
        this.run.posY = this.currentSprite.posY;
        this.currentSprite = this.run;
      } else if (this.currentSprite === this.run && !moving) {
        this.idle.posX = this.run.posX;
        this.idle.posY = this.run.posY;
        this.currentSprite = this.idle;
      }
    }
  }

  triggerAttack() {
    if (this.currentSprite === this.idle || this.currentSprite === this.run) {
      this.attack.currentIndex = 0;
      this.attack.isLoop = false;
      this.attack.isFlipX = this.facing === -1; // Face attack direction
      this.attack.posX = this.currentSprite.posX;
      this.attack.posY = this.currentSprite.posY;
      this.currentSprite = this.attack;
    }
    this.attackQueue++;
  }

  handleAttackEnd() {
    if (this.currentSprite === this.attack) {
      if (this.attack.currentIndex === this.attack.totalSize - 1) {
        if (this.attackQueue > 1) {
          this.attackQueue--;
          this.attack.currentIndex = 0;
        } else if (this.attackQueue === 1) {
          this.attackQueue = 0;
        } else {
          this.currentSprite = this.idle;
          this.idle.currentIndex = 0;
        }
      }
    }
  }

  // --- Attack hitbox ---
  getAttackHitbox() {
    if (this.currentSprite !== this.attack) return null;

    let w = this.attack.images[0].width * this.attack.spriteScale;
    let h = this.attack.images[0].height * this.attack.spriteScale;

    let offset = this.facing * (w * 0.6); // Sword extends outward
    return {
      x: this.attack.posX + (this.facing === 1 ? offset : offset - w * 0.4),
      y: this.attack.posY,
      w: w * 0.6,
      h: h * 0.8
    };
  }

  getBodyHitbox() {
    let w = this.idle.images[0].width * this.idle.spriteScale;
    let h = this.idle.images[0].height * this.idle.spriteScale;
    return {
      x: this.currentSprite.posX,
      y: this.currentSprite.posY,
      w: w,
      h: h
    };
  }

  checkHit(opponent) {
    let sword = this.getAttackHitbox();
    if (!sword) return;

    let body = opponent.getBodyHitbox();
    if (
      sword.x < body.x + body.w &&
      sword.x + sword.w > body.x &&
      sword.y < body.y + body.h &&
      sword.y + sword.h > body.y
    ) {
      opponent.health = max(0, opponent.health - 5); // reduce health
    }
  }
}

// --- Global ---
let warrior1, warrior2;

function preload() {
  warrior1 = new Unit(100, 100, 1.5, "P1");
  warrior2 = new Unit(300, 300, 1.5, "P2");

  warrior1.preload();
  warrior2.preload();
}

function setup() {
  createCanvas(512, 512);
  frameRate(6);

  // --- Attack buttons ---
  const attackButton1 = createButton('P1 Attack');
  attackButton1.position(10, 530);
  attackButton1.mousePressed(() => warrior1.triggerAttack());

  const attackButton2 = createButton('P2 Attack');
  attackButton2.position(120, 530);
  attackButton2.mousePressed(() => warrior2.triggerAttack());

  // Autofocus
  canvas = document.querySelector('canvas');
  canvas.setAttribute('tabindex', '0');
  canvas.focus();
}

function draw() {
  background(255, 204, 0);

  // P1 movement (WASD)
  warrior1.handleMovement(65, 68, 87, 83); // A, D, W, S

  // P2 movement (UHJK)
  warrior2.handleMovement(72, 75, 85, 74); // H, K, U, J

  // Draw + play
  warrior1.play();
  warrior2.play();

  // Check attacks
  warrior1.checkHit(warrior2);
  warrior2.checkHit(warrior1);
}

function keyPressed() {
  if (keyCode === 32) return false; // stop page scroll

  // --- P1 Controls ---
  if (key === 'x' || key === 'X') warrior1.triggerAttack();

  // --- P2 Controls ---
  if (key === 'm' || key === 'M') warrior2.triggerAttack();
}

function keyReleased() {
  if (keyCode === 32) return false;
}
