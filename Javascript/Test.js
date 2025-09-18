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
  constructor(x, y, scale = 1.5, label = "P", faceLeft = false) {
    this.label = label;
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 5;
    this.attackQueue = 0;
    this.protecting = false;

    // Sprites
    this.idle = new Sprite("Warrior", "idle", "Warrior_Idle_", "png", 6, x, y, scale);
    this.attack = new Sprite("Warrior", "Attack", "Warrior_Attack_", "png", 12, x, y, scale);
    this.run = new Sprite("Warrior", "Run", "Warrior_Run_", "png", 8, x, y, scale);
    this.crouch = new Sprite("Warrior", "Crouch", "Warrior_Crouch_", "png", 6, x, y, scale);

    this.currentSprite = this.idle;
    this.lastFlipX = faceLeft; // initial facing
    this.idle.isFlipX = faceLeft;
    this.attack.isFlipX = faceLeft;
    this.run.isFlipX = faceLeft;
    this.crouch.isFlipX = faceLeft;
  }

  preload() {
    this.idle.preload();
    this.attack.preload();
    this.run.preload();
    this.crouch.preload();
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

    fill(0);
    textSize(10);
    textAlign(CENTER);
    text(`${Math.floor(healthRatio * 100)}%`, x + barWidth / 2, y - 2);
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

    if (keyIsDown(left)) {
      this.run.isFlipX = true;
      this.run.posX -= this.speed;
      this.lastFlipX = true;
      moving = true;
    }
    if (keyIsDown(right)) {
      this.run.isFlipX = false;
      this.run.posX += this.speed;
      this.lastFlipX = false;
      moving = true;
    }
    if (keyIsDown(up)) {
      this.run.posY -= this.speed;
      moving = true;
    }
    if (keyIsDown(down)) {
      this.run.posY += this.speed;
      moving = true;
    }

    // Pac-Man wrap-around
    let w = this.run.images[0].width * this.run.spriteScale;
    let h = this.run.images[0].height * this.run.spriteScale;

    if (this.run.posX > width) this.run.posX = -w;
    if (this.run.posX + w < 0) this.run.posX = width;
    if (this.run.posY > height) this.run.posY = -h;
    if (this.run.posY + h < 0) this.run.posY = height;

    if (this.currentSprite !== this.attack && this.currentSprite !== this.crouch) {
      if (moving) {
        this.run.posX = this.currentSprite.posX;
        this.run.posY = this.currentSprite.posY;
        this.currentSprite = this.run;
        this.idle.isFlipX = this.run.isFlipX;
      } else if (this.currentSprite === this.run && !moving) {
        this.idle.posX = this.run.posX;
        this.idle.posY = this.run.posY;
        this.idle.isFlipX = this.lastFlipX;
        this.currentSprite = this.idle;
      }
    }
  }

  triggerAttack() {
    if (this.currentSprite !== this.attack && this.currentSprite !== this.crouch) {
      this.attack.currentIndex = 0;
      this.attack.isLoop = false;
      this.attack.posX = this.currentSprite.posX;
      this.attack.posY = this.currentSprite.posY;
      this.attack.isFlipX = this.lastFlipX;
      this.currentSprite = this.attack;
      this.attackQueue++;
    }
  }

  triggerCrouch() {
    if (this.currentSprite !== this.attack) {
      this.crouch.currentIndex = 0;
      this.crouch.isLoop = true;
      this.crouch.posX = this.currentSprite.posX;
      this.crouch.posY = this.currentSprite.posY;
      this.crouch.isFlipX = this.lastFlipX;
      this.currentSprite = this.crouch;
      this.protecting = true;
    }
  }

  releaseCrouch() {
    if (this.currentSprite === this.crouch) {
      this.idle.posX = this.crouch.posX;
      this.idle.posY = this.crouch.posY;
      this.idle.isFlipX = this.lastFlipX;
      this.currentSprite = this.idle;
      this.protecting = false;
    }
  }

  handleAttackEnd() {
    if (this.currentSprite === this.attack) {
      if (this.attack.currentIndex === this.attack.totalSize - 1) {
        if (this.attackQueue > 1) {
          this.attackQueue--;
          this.attack.currentIndex = 0;
        } else {
          this.attackQueue = 0;
          this.idle.posX = this.attack.posX;
          this.idle.posY = this.attack.posY;
          this.idle.isFlipX = this.lastFlipX;
          this.currentSprite = this.idle;
        }
      }
    }
  }

  checkHit(opponent) {
    if (this.currentSprite === this.attack) {
      let swordRange = 60;
      let dx = opponent.currentSprite.posX - this.currentSprite.posX;
      let dy = Math.abs(opponent.currentSprite.posY - this.currentSprite.posY);

      if (dy < 40) {
        if (!this.attack.isFlipX && dx > 0 && dx < swordRange) {
          this.applyDamage(opponent);
        }
        if (this.attack.isFlipX && dx < 0 && Math.abs(dx) < swordRange) {
          this.applyDamage(opponent);
        }
      }
    }
  }

  applyDamage(opponent) {
    if (opponent.protecting) {
      let chance = random(1);
      if (chance < 0.5) {
        // block success → no damage
        return;
      } else {
        // partial damage
        opponent.health = max(0, opponent.health - 2);
      }
    } else {
      opponent.health = max(0, opponent.health - 5);
    }
  }
}

// --- Global ---
let warrior1, warrior2;
let gameOver = false;

function preload() {
  warrior1 = new Unit(100, 100, 1.5, "P1", false);
  warrior2 = new Unit(300, 300, 1.5, "P2", true);

  warrior1.preload();
  warrior2.preload();
}

function setup() {
  createCanvas(512, 512);
  frameRate(6);

  // Attack buttons
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

  if (gameOver) {
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(0);
    text("Game Over! Press R to Restart", width / 2, height / 2);
    return;
  }

  // P1 movement (WASD)
  warrior1.handleMovement(65, 68, 87, 83);

  // P2 movement (UHJK)
  warrior2.handleMovement(72, 75, 85, 74);

  // Check collisions
  warrior1.checkHit(warrior2);
  warrior2.checkHit(warrior1);

  warrior1.play();
  warrior2.play();

  // Check game over
  if (warrior1.health <= 0 || warrior2.health <= 0) {
    gameOver = true;
  }
}

function keyPressed() {
  if (keyCode === 32) return false;

  if (gameOver && (key === 'r' || key === 'R')) {
    preload();
    gameOver = false;
    return;
  }

  // P1 Controls
  if (key === 'x' || key === 'X') warrior1.triggerAttack();
  if (key === 'q' || key === 'Q') warrior1.triggerCrouch();

  // P2 Controls
  if (key === 'm' || key === 'M') warrior2.triggerAttack();
  if (key === 'n' || key === 'N') warrior2.triggerCrouch();
}

function keyReleased() {
  if (keyCode === 32) return false;

  // Release crouch
  if (key === 'q' || key === 'Q') warrior1.releaseCrouch();
  if (key === 'n' || key === 'N') warrior2.releaseCrouch();
}
