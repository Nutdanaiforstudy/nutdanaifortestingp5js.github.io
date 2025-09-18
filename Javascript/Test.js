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
let currentSprite;
let attackQueue = 0; // Counts how many attack requests are queued

function preload() {
  warriorIdle = new Sprite("Warrior", "idle", "Warrior_Idle_", "png", 6, 100, 100, 1.5);
  warriorIdle.preload();

  warriorAttack = new Sprite("Warrior", "Attack", "Warrior_Attack_", "png", 12, 100, 100, 1.5);
  warriorAttack.preload();
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
    // If currently idle, start attack animation and stop looping idle
    if (currentSprite === warriorIdle) {
      warriorAttack.currentIndex = 0;
      warriorAttack.isLoop = false; // Attack animation doesn't loop by default
      currentSprite = warriorAttack;
    }
    attackQueue++; // Queue one more attack cycle
  });
}

function draw() {
  background(255, 204, 0);
  currentSprite.play();

  // If current animation is the attack
  if (currentSprite === warriorAttack) {
    // When the animation hits last frame
    if (warriorAttack.currentIndex === warriorAttack.totalSize - 1) {
      if (attackQueue > 1) {
        // If there is still queued attack requests, loop animation again
        attackQueue--;
        warriorAttack.currentIndex = 0;
      } else if (attackQueue === 1) {
        // This is the last queued attack, allow animation to finish this cycle
        attackQueue = 0;
        // After this cycle ends, switch back to idle
      } else {
        // No queued attacks left, switch to idle after finishing current animation
        currentSprite = warriorIdle;
        warriorIdle.currentIndex = 0;
      }
    }
  }
}

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
    // Mimic attack button behavior on keyboard
    if (currentSprite === warriorIdle) {
      warriorAttack.currentIndex = 0;
      warriorAttack.isLoop = false;
      currentSprite = warriorAttack;
    }
    attackQueue++;
  }
}
