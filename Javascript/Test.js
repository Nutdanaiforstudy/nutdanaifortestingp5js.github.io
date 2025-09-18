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
  constructor(x, y, scale = 1.5) {
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 5;
    this.attackQueue = 0;

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
    this.handleAttackEnd();
  }

  drawHealthBar() {
    push();
    noStroke();
    let barWidth = 50;
    let barHeight = 6;
    let healthRatio = this.health / this.maxHealth;

    let x = this.currentSprite.posX + 10;
    let y = this.currentSprite.posY - 20;

    fill(255, 0, 0);
    rect(x, y, barWidth, barHeight);

    fill(0, 255, 0);
    rect(x, y, barWidth * healthRatio, barHeight);
    pop();
  }

  handleMovement() {
    let moving = false;

    if (keyIsDown(65)) { // A
      this.run.isFlipX = true;
      this.run.posX -= this.speed;
      moving = true;
    }
    if (keyIsDown(68)) { // D
      this.run.isFlipX = false;
      this.run.posX += this.speed;
      moving = true;
    }
    if (keyIsDown(87)) { // W
      this.run.posY -= this.speed;
      moving = true;
    }
    if (keyIsDown(83)) { // S
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
}

// --- Global ---
let warrior;

function preload() {
  warrior = new Unit(100, 100, 1.5);
  warrior.preload();
}

function setup() {
  createCanvas(512, 512);
  frameRate(6);

  // --- Attack button ---
  const attackButton = createButton('Attack');
  attackButton.position(10, 530);
  attackButton.style('font-size', '16px');
  attackButton.style('padding', '8px 16px');
  attackButton.mousePressed(() => warrior.triggerAttack());

  // Autofocus
  canvas = document.querySelector('canvas');
  canvas.setAttribute('tabindex', '0');
  canvas.focus();
}

function draw() {
  background(255, 204, 0);
  warrior.handleMovement();
  warrior.play();
}

function keyPressed() {
  if (keyCode === 32) return false; // stop page scroll

  if (key === 'f' || key === 'F') warrior.currentSprite.isFlipX = !warrior.currentSprite.isFlipX;
  if (key === 'c' || key === 'C') warrior.currentSprite.isStop = !warrior.currentSprite.isStop;
  if (key === 'l' || key === 'L') warrior.currentSprite.isLoop = !warrior.currentSprite.isLoop;
  if (key === 'x' || key === 'X' || keyCode === 32) warrior.triggerAttack();
}

function keyReleased() {
  if (keyCode === 32) return false;
}
