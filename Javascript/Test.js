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

// --- Global variables ---
let warriorIdle;
let warriorAttack;
let warriorRun;
let currentSprite;
let attackQueue = 0; // Counts how many attack requests are queued
let speed = 5;       // Movement speed

function preload() {
  warriorIdle = new Sprite("Warrior", "idle", "Warrior_Idle_", "png", 6, 100, 100, 1.5);
  warriorIdle.preload();

  warriorAttack = new Sprite("Warrior", "Attack", "Warrior_Attack_", "png", 12, 100, 100, 1.5);
  warriorAttack.preload();

  warriorRun = new Sprite("Warrior", "Run", "Warrior_Run_", "png", 8, 100, 100, 1.5);
  warriorRun.preload();
}

function setup() {
  createCanvas(512, 512);
  frameRate(6);
  currentSprite = warriorIdle;

  // --- Create the Attack button ---
  const attackButton = createButton('Attack');
  attackButton.position(10, 530);
  attackButton.style('font-size', '16px');
  attackButton.style('padding', '8px 16px');

  attackButton.mousePressed(() => {
    triggerAttack();
  });
}

function draw() {
  background(255, 204, 0);

  handleMovement();

  currentSprite.play();

  // If current animation is the attack
  if (currentSprite === warriorAttack) {
    if (warriorAttack.currentIndex === warriorAttack.totalSize - 1) {
      if (attackQueue > 1) {
        attackQueue--;
        warriorAttack.currentIndex = 0;
      } else if (attackQueue === 1) {
        attackQueue = 0;
      } else {
        currentSprite = warriorIdle;
        warriorIdle.currentIndex = 0;
      }
    }
  }
}

// --- Movement control ---
function handleMovement() {
  let moving = false;

  if (keyIsDown(65)) { // A = left
    warriorRun.isFlipX = true;
    warriorRun.posX -= speed;
    moving = true;
  }
  if (keyIsDown(68)) { // D = right
    warriorRun.isFlipX = false;
    warriorRun.posX += speed;
    moving = true;
  }
  if (keyIsDown(87)) { // W = up
    warriorRun.posY -= speed;
    moving = true;
  }
  if (keyIsDown(83)) { // S = down
    warriorRun.posY += speed;
    moving = true;
  }

  if (currentSprite !== warriorAttack) {
    if (moving) {
      warriorRun.posX = currentSprite.posX;
      warriorRun.posY = currentSprite.posY;
      currentSprite = warriorRun;
    } else if (currentSprite === warriorRun && !moving) {
      warriorIdle.posX = warriorRun.posX;
      warriorIdle.posY = warriorRun.posY;
      currentSprite = warriorIdle;
    }
  }
}

// --- Attack trigger (button + key) ---
function triggerAttack() {
  if (currentSprite === warriorIdle || currentSprite === warriorRun) {
    warriorAttack.currentIndex = 0;
    warriorAttack.isLoop = false;
    warriorAttack.posX = currentSprite.posX;
    warriorAttack.posY = currentSprite.posY;
    currentSprite = warriorAttack;
  }
  attackQueue++;
}

// --- Key controls ---
function keyPressed() {
  if (key === 'f' || key === 'F') {
    currentSprite.isFlipX = !currentSprite.isFlipX;
  }

  if (key === 's' || key === 'S') {
    currentSprite.isStop = !currentSprite.isStop;
  }

  if (key === 'l' || key === 'L') {
    currentSprite.isLoop = !currentSprite.isLoop;
  }

  if (key === 'a' || key === 'A') {
    triggerAttack();
  }
}
