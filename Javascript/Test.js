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
  constructor(x, y, scale = 1.5, label = "P", faceLeft = false, charType = "Dude") {
    this.label = label;
    this.charType = charType;
    this.speed = 5;
    this.attackQueue = 0;
    this.protecting = false;
    this.immortal = false;

    // Stats
    this.maxHealth = 100;
    this.attackPower = 5;

    if (charType === "Strength") this.maxHealth = 200;
    if (charType === "Strong") this.attackPower = 10;
    if (charType === "Noob") this.maxHealth = 1;

    this.health = this.maxHealth;

    // Sprites
    this.idle = new Sprite("Warrior", "idle", "Warrior_Idle_", "png", 6, x, y, scale);
    this.attack = new Sprite("Warrior", "Attack", "Warrior_Attack_", "png", 12, x, y, scale);
    this.run = new Sprite("Warrior", "Run", "Warrior_Run_", "png", 8, x, y, scale);
    this.crouch = new Sprite("Warrior", "Crouch", "Warrior_Crouch_", "png", 6, x, y, scale);

    this.currentSprite = this.idle;
    this.lastFlipX = faceLeft;
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
    let barWidth = 60;
    let barHeight = 8;
    let healthRatio = this.health / this.maxHealth;
    let x = this.currentSprite.posX + 10;
    let y = this.currentSprite.posY - 28;

    fill(120);
    rect(x, y, barWidth, barHeight);

    if (healthRatio > 0.5) fill(0, 200, 0);
    else if (healthRatio > 0.25) fill(255, 200, 0);
    else fill(255, 50, 50);
    rect(x, y, barWidth * constrain(healthRatio, 0, 1), barHeight);

    fill(0);
    textSize(11);
    textAlign(CENTER, CENTER);
    text(Math.round(healthRatio * 100) + "%", x + barWidth / 2, y - 10);
    pop();
  }

  drawLabel() {
    push();
    textAlign(CENTER);
    textSize(14);

    if (this.label === "P1") fill(255, 0, 0);
    else if (this.label === "P2") fill(0, 0, 255);
    else fill(0);

    let spriteWidth = this.run.images.length > 0 ? this.run.images[0].width * this.run.spriteScale : 70;
    text(this.label, this.currentSprite.posX + spriteWidth / 2, this.currentSprite.posY - 70);
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

    // Pac-Man wrap
    if (this.run.images.length > 0) {
      let w = this.run.images[0].width * this.run.spriteScale;
      let h = this.run.images[0].height * this.run.spriteScale;
      if (this.run.posX > width) this.run.posX = -w;
      if (this.run.posX + w < 0) this.run.posX = width;
      if (this.run.posY > height) this.run.posY = -h;
      if (this.run.posY + h < 0) this.run.posY = height;
    }

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

      if (dy < 50) {
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
    if (opponent.immortal) return;

    if (opponent.protecting) {
      let chance = random(1);
      if (chance < 0.5) {
        return; // block
      } else {
        opponent.health = max(0, opponent.health - 2);
        flashDamage(opponent);
        return;
      }
    }

    opponent.health = max(0, opponent.health - this.attackPower);
    flashDamage(opponent);
  }
}

// --- Globals ---
let warrior1 = null;
let warrior2 = null;
let gameOver = false;
let selectionMode = true;
let p1Choice = null, p2Choice = null;
let canvas;
let startButton = { x: 250, y: 400, w: 150, h: 44 };

const classes = ["Strength", "Strong", "Dude", "Noob"];
let thumbs = {};

function preload() {
  for (let cls of classes) {
    thumbs[cls] = loadImage("Warrior/idle/Warrior_Idle_1.png");
  }
}

function setup() {
  canvas = createCanvas(640, 480);
  frameRate(30);
  canvas.elt.setAttribute("tabindex", "0");
  canvas.elt.focus();
}

function draw() {
  background(200);

  if (selectionMode) {
    drawSelectionScreen();
    return;
  }

  if (gameOver) {
    drawGameOver();
    return;
  }

  // Movement
  if (warrior1) {
    warrior1.handleMovement(65, 68, 87, 83); // A D W S
    if (warrior1.charType === "Noob" && keyIsDown(90)) warrior1.immortal = true;
    else warrior1.immortal = false;
  }
  if (warrior2) {
    warrior2.handleMovement(72, 75, 85, 74); // H K U J
    if (warrior2.charType === "Noob" && keyIsDown(66)) warrior2.immortal = true;
    else warrior2.immortal = false;
  }

  // Collisions
  if (warrior1 && warrior2) {
    warrior1.checkHit(warrior2);
    warrior2.checkHit(warrior1);
  }

  // Play units
  if (warrior1) warrior1.play();
  if (warrior2) warrior2.play();

  // Damage flashes
  drawDamageFlashes();

  // Game over check
  if (warrior1 && warrior2 && (warrior1.health <= 0 || warrior2.health <= 0)) {
    gameOver = true;
  }
}

function drawSelectionScreen() {
  textAlign(CENTER);
  textSize(24);
  fill(0);
  text("Character Selection (Click to pick)", width / 2, 36);

  // 👇 Move instructions up under the title
  textSize(12);
  text("P1: WASD move, X attack, Q crouch, Z immortal", width / 2, 60);
  text("P2: UHJK move, M attack, N crouch, B immortal", width / 2, 76);

  let startX = width / 2 - 120;
  let startY = 90;
  let idx = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      let x = startX + col * 140;
      let y = startY + row * 140;
      let cls = classes[idx++];

      image(thumbs[cls], x, y, 120, 120);
      stroke(0); noFill(); rect(x, y, 120, 120);
    // Always draw class name in black
noStroke();
fill(0);
textSize(14);
text(cls, x + 60, y + 140);

// --- Both players choose the same character ---
if (p1Choice === cls && p2Choice === cls) {
  // outlines
  push();
  noFill();
  stroke(255, 0, 0);
  strokeWeight(3);
  rect(x - 6, y - 6, 132, 132); // outer red outline
  pop();

  push();
  noFill();
  stroke(0, 0, 255);
  strokeWeight(3);
  rect(x - 2, y - 2, 124, 124); // inner blue outline
  pop();

  // labels
  push();
  textSize(14);
  textAlign(CENTER, BOTTOM);
  fill(255, 0, 0);
  text("P1", x + 40, y - 8); // a bit left
  fill(0, 0, 255);
  text("P2", x + 80, y - 8); // a bit right
  pop();
}

// --- Only P1 selected ---
else if (p1Choice === cls) {
  push();
  noFill();
  stroke(255, 0, 0);
  strokeWeight(3);
  rect(x - 4, y - 4, 128, 128);

  textSize(14);
  textAlign(CENTER, BOTTOM);
  fill(255, 0, 0);
  text("P1", x + 60, y - 8); // perfectly centered
  pop();
}

// --- Only P2 selected ---
else if (p2Choice === cls) {
  push();
  noFill();
  stroke(0, 0, 255);
  strokeWeight(3);
  rect(x - 4, y - 4, 128, 128);

  textSize(14);
  textAlign(CENTER, BOTTOM);
  fill(0, 0, 255);
  text("P2", x + 60, y - 8); // perfectly centered
  pop();
}



    }
  }

  if (p1Choice) drawPreview(60, 320, "P1", p1Choice, color(255, 0, 0));
  if (p2Choice) drawPreview(width - 220, 320, "P2", p2Choice, color(0, 0, 255));

  if (p1Choice && p2Choice) {
    fill(60, 180, 75);
    rect(startButton.x, startButton.y, startButton.w, startButton.h, 8);
    fill(255); textSize(18); text("START", startButton.x + startButton.w / 2, startButton.y + startButton.h / 2 + 6);
  }

//   fill(0); textSize(12);
//   text("P1: WASD move, X attack, Q crouch, Z immortal", width / 2, height - 60);
//   text("P2: UHJK move, M attack, N crouch, B immortal", width / 2, height - 40);
}

function drawPreview(x, y, label, cls, tintCol) {
  push();
  // Label above character
  fill(0);
  textAlign(CENTER, BOTTOM);
  textSize(14);
  text(label, x + 80, y - 12); // center over 160px wide image

  // Character image
  image(thumbs[cls], x, y, 160, 160);

  // Stats bars
  let stats = getClassStats(cls);
  textSize(12); 
  fill(0); 
  text("Health", x + 80, y + 176);
  fill(200); 
  rect(x + 10, y + 186, 140, 10);
  fill(0, 200, 0); 
  rect(x + 10, y + 186, map(stats.health, 0, 200, 0, 140), 10);

  fill(0); 
  text("Attack", x + 80, y + 206);
  fill(200); 
  rect(x + 10, y + 216, 140, 10);
  fill(200, 100, 0); 
  rect(x + 10, y + 216, map(stats.attack, 0, 12, 0, 140), 10);
  pop();
}


function mousePressed() {
  if (!selectionMode) return;

  let startX = width / 2 - 120;
  let startY = 90;
  let idx = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      let x = startX + col * 140;
      let y = startY + row * 140;
      let cls = classes[idx++];
      if (mouseX > x && mouseX < x + 120 && mouseY > y && mouseY < y + 120) {
        if (!p1Choice) p1Choice = cls;
        else if (!p2Choice) p2Choice = cls;
        else {
          p1Choice = cls;
          p2Choice = null;
        }
        return;
      }
    }
  }

  if (p1Choice && p2Choice) {
    if (mouseX > startButton.x && mouseX < startButton.x + startButton.w &&
        mouseY > startButton.y && mouseY < startButton.y + startButton.h) {
      startGame();
    }
  }
}

function getClassStats(cls) {
  if (cls === "Strength") return { health: 200, attack: 5 };
  if (cls === "Strong") return { health: 100, attack: 10 };
  if (cls === "Dude") return { health: 100, attack: 5 };
  if (cls === "Noob") return { health: 1, attack: 5 };
  return { health: 100, attack: 5 };
}

function startGame() {
  warrior1 = new Unit(100, 200, 1.5, "P1", false, p1Choice);
  warrior2 = new Unit(420, 200, 1.5, "P2", true, p2Choice);

  // Apply stats
  if (p1Choice === "Strength") warrior1.maxHealth = 200;
  if (p1Choice === "Strong") warrior1.attackPower = 10;
  if (p1Choice === "Noob") warrior1.maxHealth = 1;
  warrior1.health = warrior1.maxHealth;

  if (p2Choice === "Strength") warrior2.maxHealth = 200;
  if (p2Choice === "Strong") warrior2.attackPower = 10;
  if (p2Choice === "Noob") warrior2.maxHealth = 1;
  warrior2.health = warrior2.maxHealth;

  // Preload sprites
  warrior1.preload();
  warrior2.preload();

  selectionMode = false;
  gameOver = false;
}

// Handle key presses
function keyPressed() {
  if (selectionMode) return;

  // P1 controls
  if (key === "x" || key === "X") warrior1.triggerAttack();
  if (key === "q" || key === "Q") warrior1.triggerCrouch();

  // P2 controls
  if (key === "m" || key === "M") warrior2.triggerAttack();
  if (key === "n" || key === "N") warrior2.triggerCrouch();

  // Restart after game over
  if (gameOver && (key === "r" || key === "R")) {
    p1Choice = null;
    p2Choice = null;
    selectionMode = true;
    gameOver = false;
  }
}

function keyReleased() {
  if (selectionMode) return;

  if (key === "q" || key === "Q") warrior1.releaseCrouch();
  if (key === "n" || key === "N") warrior2.releaseCrouch();
}

// --- Damage Flash effect ---
let flashList = [];

function flashDamage(unit) {
  flashList.push({ unit: unit, timer: 6 });
}

function drawDamageFlashes() {
  for (let i = flashList.length - 1; i >= 0; i--) {
    let f = flashList[i];
    push();
    fill(255, 0, 0, 100);
    noStroke();
    rect(f.unit.currentSprite.posX, f.unit.currentSprite.posY, 80, 100);
    pop();

    f.timer--;
    if (f.timer <= 0) flashList.splice(i, 1);
  }
}

// --- Game Over screen ---
function drawGameOver() {
  push();
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0);
  text("GAME OVER", width / 2, height / 2 - 40);

  if (warrior1.health <= 0 && warrior2.health <= 0) {
    text("Draw!", width / 2, height / 2);
  } else if (warrior1.health <= 0) {
    fill(0, 0, 255);
    text("P2 Wins!", width / 2, height / 2);
  } else if (warrior2.health <= 0) {
    fill(255, 0, 0);
    text("P1 Wins!", width / 2, height / 2);
  }

  fill(0);
  textSize(18);
  text("Press R to Restart", width / 2, height / 2 + 60);
  pop();
}
