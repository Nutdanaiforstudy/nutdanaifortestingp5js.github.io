// --- Sprite class ---
class Sprite {
  constructor(characterFolder, actionFolder, fileName, fileExt, totalSize, posX, posY, scale) {
    this.characterFolder = characterFolder;
    this.actionFolder = actionFolder;
    this.fileName = fileName;
    this.fileExt = fileExt; // should be "png" (no dot)
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
      // Correct path (no double dots)
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
        this.render(); // stay at last frame
      } else {
        this.renderNext();
      }
    }
  }
}

// --- Global variables ---
let warriorIdle;

function preload() {
  // Example: Warrior/idle/Warrior_Idle_1.png ... Warrior_Idle_6.png
  warriorIdle = new Sprite("Warrior", "idle", "Warrior_Idle_", "png", 6, 300, 300, 1.5);
  warriorIdle.preload();
}

function setup() {
  createCanvas(512, 512);
  frameRate(6); // controls speed
}

function draw() {
  background(255, 204, 0);
  warriorIdle.play();
}

function keyPressed() {
  if (key === 'f' || key === 'F') {
    warriorIdle.isFlipX = !warriorIdle.isFlipX;
  }
  if (key === 's' || key === 'S') {
    warriorIdle.isStop = !warriorIdle.isStop;
  }
  if (key === 'l' || key === 'L') {
    warriorIdle.isLoop = !warriorIdle.isLoop;
  }
}
