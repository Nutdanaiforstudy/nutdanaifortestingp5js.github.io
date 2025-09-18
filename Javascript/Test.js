// --- Sprite class (animation handler) ---
class Sprite {
  constructor(characterFolder, actionFolder, fileName, fileExt, totalSize, scale) {
    this.characterFolder = characterFolder;
    this.actionFolder = actionFolder;
    this.fileName = fileName;
    this.fileExt = fileExt;
    this.totalSize = totalSize;

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

  render(x, y) {
    push();
    translate(x, y);

    if (this.isFlipX) {
      scale(-this.spriteScale, this.spriteScale);
      image(this.images[this.currentIndex], -this.images[this.currentIndex].width, 0);
    } else {
      scale(this.spriteScale, this.spriteScale);
      image(this.images[this.currentIndex], 0, 0);
    }

    pop();
  }

  renderNext(x, y) {
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
    this.render(x, y);
  }

  play(x, y) {
    if (this.isLoop) {
      this.renderNext(x, y);
    } else {
      if (this.currentIndex === this.totalSize - 1) {
        this.render(x, y);
      } else {
        this.renderNext(x, y);
      }
    }
  }
}

// --- Unit class (character with animations + health) ---
class Unit {
  constructor(x, y, scale = 1.5) {
    this.x = x;
    this.y = y;
    this.scale = scale;

    // Health system
    this.maxHealth = 100;
    this.currentHealth = 100;

    // Movement
    this.speed = 5;

    // States
    this.state = "idle"; // idle, run, attack
    this.attackQueue = 0;

    // Sprites
    this.idle = new Sprite("Warrior", "idle", "Warrior_Idle_", "png", 6, this.scale);
    this.run = new Sprite("Warrior", "Run", "Warrior_Run_", "png", 8, this.scale);
    this.attack = new Sprite("Warrior", "Attack", "Warrior_Attack_", "png", 12, this.scale);
    this.currentSprite = this.idle;
  }

  preload() {
    this.idle.preload();
    this.run.preload();
    this.attack.preload();
  }

  update() {
    let moving = false;

    // Movement WASD
    if (keyIsDown(65)) { // A
      this.run.isFlipX = true;
      this.x -= this.speed;
      moving = true;
    }
    if (keyIsDown(68)) { // D
      this.run.isFlipX = false;
      this.x += this.speed;
      moving = true;
    }
    if (keyIsDown(87)) { // W
      this.y -= this.speed;
      moving = true;
    }
    if (keyIsDown(83)) { // S
      this.y += this.speed;
      moving = true;
    }

    // Pac-Man style wrapping
    let w = this.run.images[0].width * this.scale;
    let h = this.run.images[0].height * this.scale;

    if (this.x > width) this.x = -w;
    if (this.x + w < 0) this.x = width;
    if (this.y > height) this.y = -h;
    if (this.y + h < 0) this.y = height;

    // Update state
    if (this.state !== "attack") {
      if (moving) {
        this.state = "run";
        this.currentSprite = this.run;
      } else {
        this.state = "idle";
        this.currentSprite = this.idle;
      }
    }

    // Handle attack animation
    if (this.state === "attack") {
      if (this.attack.currentIndex === this.attack.totalSize - 1) {
        if (this.attackQueue > 1) {
          this.attackQueue--;
          this.attack.currentIndex = 0;
        } else {
          this.state = "idle";
          this.currentSprite = this.idle;
        }
      }
    }
  }

  draw() {
    // Draw sprite
    this.currentSprite.play(this.x, this.y);

    // Draw health bar
    this.drawHealthBar();
  }

  drawHealthBar() {
    let barWidth = 80;
    let barHeight = 10;
    let healthPercent = this.currentHealth / this.maxHealth;

    push();
    noStroke();
    fill(255, 0, 0);
    rect(this.x, this.y - 20, barWidth, barHeight); // background (red)
    fill(0, 255, 0);
    rect(this.x, this.y - 20, barWidth * healthPercent, barHeight); // foreground (green)
    pop();
  }

  takeDamage(amount) {
    this.currentHealth -= amount;
    if (this.currentHealth < 0) this.currentHealth = 0;
  }

  heal(amount) {
    this.currentHealth += amount;
    if (this.currentHealth > this.maxHealth) this.currentHealth = this.maxHealth;
  }

  triggerAttack() {
    if (this.state !== "attack") {
      this.state = "attack";
      this.currentSprite = this.attack;
      this.attack.currentIndex = 0;
    }
    this.attackQueue++;
  }
}

// --- Global variables ---
let warrior;

function preload() {
  warrior = new Unit(100, 100, 1.5);
  warrior.preload();
}

function setup() {
  createCanvas(512, 512);
  frameRate(6);

  // Attack button
  const attackButton = createButton('Attack');
  attackButton.position(10, 530);
  attackButton.mousePressed(() => {
    warrior.triggerAttack();
  });
}

function draw() {
  background(255, 204, 0);
  warrior.update();
  warrior.draw();
}

function keyPressed() {
  if (keyCode === 32) {
    warrior.triggerAttack();
    return false; // prevent page scroll
  }

  if (key === 'c' || key === 'C') {
    warrior.currentSprite.isStop = !warrior.currentSprite.isStop;
  }
}
