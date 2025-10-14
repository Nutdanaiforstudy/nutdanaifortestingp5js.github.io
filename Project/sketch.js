// Full p5.js sketch — selection popup + same-level characters in battle.
// Includes: robust thumb loader, knight support, wait-for-sprites, start button fix,
// selection popup messages, and automatic horizontal separation to avoid overlap.

// ----------------- Sprite helper (with optional alt folder) -----------------
class Sprite {
  constructor(characterFolder, actionFolder, fileName, fileExt, totalSize, posX, posY, scale, zeroPad = 0, altCharacterFolder = null) {
    this.characterFolder = characterFolder;
    this.altCharacterFolder = altCharacterFolder;
    this.actionFolder = actionFolder;
    this.fileName = fileName;
    this.fileExt = fileExt;
    this.totalSize = totalSize || 0;
    this.posX = posX;
    this.posY = posY;
    this.spriteScale = scale || 1;
    this.images = new Array(this.totalSize).fill(null);
    this.currentIndex = 0;
    this.isStop = false;
    this.isFlipX = false;
    this.isLoop = true;
    this.zeroPad = zeroPad;
    this.advanceRate = 1; // can increase for slow-motion (Knight can set this)
  }
  preload() {
    if (this.images.filter(Boolean).length === this.totalSize) return;
    for (let i = 1; i <= this.totalSize; i++) {
      const n = this.zeroPad > 0 ? String(i).padStart(this.zeroPad, "0") : String(i);
      const candidates = [];

      // common path variants to be robust
      candidates.push(`${this.characterFolder}/${this.actionFolder}/${this.fileName}${n}.${this.fileExt}`);
      candidates.push(`${this.characterFolder}/${this.actionFolder}/${this.fileName}${i}.${this.fileExt}`);
      if (this.altCharacterFolder) {
        candidates.push(`${this.altCharacterFolder}/${this.actionFolder}/${this.fileName}${n}.${this.fileExt}`);
        candidates.push(`${this.altCharacterFolder}/${this.actionFolder}/${this.fileName}${i}.${this.fileExt}`);
      }
      // capitalization variants
      candidates.push(`${this.characterFolder}/${capitalize(this.actionFolder)}/${this.fileName}${n}.${this.fileExt}`);
      candidates.push(`${this.characterFolder}/${capitalize(this.actionFolder)}/${this.fileName}${i}.${this.fileExt}`);
      if (this.altCharacterFolder) {
        candidates.push(`${this.altCharacterFolder}/${capitalize(this.actionFolder)}/${this.fileName}${n}.${this.fileExt}`);
        candidates.push(`${this.altCharacterFolder}/${capitalize(this.actionFolder)}/${this.fileName}${i}.${this.fileExt}`);
      }

      const uniq = [...new Set(candidates)];
      const idx = i - 1;
      tryLoadAny(uniq, img => { this.images[idx] = img; });
    }
  }
  render() {
    const img = this.images[this.currentIndex];
    if (!img) return;
    push();
    translate(this.posX, this.posY);
    scale(this.isFlipX ? -this.spriteScale : this.spriteScale, this.spriteScale);
    image(img, this.isFlipX ? -img.width : 0, 0);
    pop();
  }
  renderNext() {
    if (!this.isStop) {
      if (this.advanceRate <= 1 || frameCount % this.advanceRate === 0) {
        this.currentIndex++;
        if (this.currentIndex >= this.totalSize) {
          this.currentIndex = this.isLoop ? 0 : this.totalSize - 1;
        }
      }
    }
    this.render();
  }
  play() {
    if (this.images.length === 0) return;
    if (this.isLoop) this.renderNext();
    else {
      if (this.currentIndex === this.totalSize - 1) this.render();
      else this.renderNext();
    }
  }
}
function capitalize(s) { return !s ? s : s.charAt(0).toUpperCase() + s.slice(1); }
function tryLoadAny(paths, onSuccess) {
  const p = paths.slice();
  function tryOne() {
    if (p.length === 0) return;
    const path = p.shift();
    loadImage(path, img => onSuccess(img), () => tryOne());
  }
  tryOne();
}

// ----------------- Animated projectile -----------------
class AnimatedProjectile {
  constructor(x, y, vx, images, owner, lifeFrames = 120) {
    this.x = x; this.y = y; this.vx = vx;
    this.images = images || []; this.frameIndex = 0;
    this.timer = lifeFrames; this.owner = owner; this.hitUnits = [];
    this.scale = 0.85;
    this.radius = (this.images.length > 0 && this.images[0]) ? (this.images[0].width / 2) * this.scale : 12;
  }
  update() {
    this.x += this.vx;
    if (frameCount % 2 === 0 && this.images.length > 0) this.frameIndex = (this.frameIndex + 1) % this.images.length;
    this.timer--;
  }
  draw() {
    push();
    translate(this.x, this.y);
    scale(this.vx < 0 ? -this.scale : this.scale, this.scale);
    if (this.images.length > 0 && this.images[this.frameIndex]) {
      imageMode(CENTER); image(this.images[this.frameIndex], 0, 0); imageMode(CORNER);
    } else { noStroke(); fill(60,180,255,220); ellipse(0,0,this.radius*2); }
    pop();
  }
  collidesWith(unit) {
    if (!unit || unit.isDead) return false;
    const ux = unit.centerX(), uy = unit.centerY();
    return dist(ux, uy, this.x, this.y) <= this.radius + 18;
  }
  isOffscreen() { return (this.x < -200 || this.x > width + 200); }
}

// ----------------- AttackEffect -----------------
class AttackEffect {
  constructor(x, y, images, lifeFramesPerImage = 6) {
    this.x = x; this.y = y; this.images = images || []; this.imageIndex = 0;
    this.count = 0; this.lifeFramesPerImage = lifeFramesPerImage; this.finished = false; this.scale = 0.9;
  }
  update() {
    this.count++;
    if (this.count >= this.lifeFramesPerImage) {
      this.count = 0; this.imageIndex++;
      if (this.imageIndex >= this.images.length) this.finished = true;
    }
  }
  draw() {
    if (this.finished) return;
    push(); translate(this.x, this.y); imageMode(CENTER); scale(this.scale);
    if (this.images.length > 0 && this.images[this.imageIndex]) image(this.images[this.imageIndex], 0, 0);
    imageMode(CORNER); pop();
  }
}

// ----------------- Unit -----------------
class Unit {
  constructor(x, y, scale = 1.5, label = "P", faceLeft = false, charChoice = "Frog", stats = {}) {
    this.displayName = charChoice;
    this.role = normalizeRole(charChoice);
    this.label = label;
    this.speed = stats.speed || 5;
    this.attackQueue = 0; this.protecting = false; this.immortal = false; this.isJumping = false; this.isDead = false;
    this.maxHealth = stats.maxHealth || 100; this.attackPower = stats.attackPower || 5; this.health = this.maxHealth;
    this.attackProjectileTriggered = false;
    this.attackCooldown = 0; this.jumpCooldown = 0;
    this.vy = 0;

    const folder = getSpriteFolder(this.role);

    if (folder === "crow") {
      this.idle   = new Sprite(folder, "idle",   "idle_",   "png", CROW_FRAMES.idle,   x, y, scale);
      this.attack = new Sprite(folder, "attack", "attack_", "png", CROW_FRAMES.attack, x, y, scale);
      this.run    = new Sprite(folder, "run",    "walk_",   "png", CROW_FRAMES.run,    x, y, scale);
      this.crouch = new Sprite(folder, "idle",   "idle_",   "png", CROW_FRAMES.idle,   x, y, scale);
      this.damage = new Sprite(folder, "damage", "damage_", "png", CROW_FRAMES.damage, x, y, scale);
      this.death  = new Sprite(folder, "death",  "death_",  "png", CROW_FRAMES.death,  x, y, scale);
      this.jump   = new Sprite(folder, "jump",   "jump_",   "png", CROW_FRAMES.jump,   x, y, scale);
    } else if (folder === "frog") {
      this.idle   = new Sprite(folder, "idle",   "Idle_",      "png", FROG_FRAMES.idle,   x, y, scale);
      this.attack = new Sprite(folder, "attack", "Explosion_", "png", FROG_FRAMES.attackEnd - FROG_FRAMES.attackStart + 1, x, y, scale);
      this.run    = new Sprite(folder, "walk",   "Hop_",       "png", FROG_FRAMES.run,    x, y, scale);
      this.crouch = new Sprite(folder, "idle",   "Idle_",      "png", FROG_FRAMES.idle,   x, y, scale);
      this.damage = new Sprite(folder, "death",  "Hurt_",      "png", FROG_FRAMES.damage, x, y, scale);
      this.death  = new Sprite(folder, "death",  "Hurt_",      "png", FROG_FRAMES.death,  x, y, scale);
      this.jump   = new Sprite(folder, "walk",   "Hop_",       "png", FROG_FRAMES.run,    x, y, scale);
    } else if (folder === "knight") {
      // Knight — many files use uppercase names; our loader tries variants
      this.idle   = new Sprite(folder, "idle",   "idle_",   "png", KNIGHT_FRAMES.idle, x, y, scale, 2, "Knight");
      this.attack = new Sprite(folder, "attack", "ATTACK1_", "png", KNIGHT_FRAMES.attack, x, y, scale, 2, "Knight");
      this.run    = new Sprite(folder, "walk",   "WALK_",    "png", KNIGHT_FRAMES.run, x, y, scale, 2, "Knight");
      this.crouch = new Sprite(folder, "block",  "DEFEND_",  "png", KNIGHT_FRAMES.defend, x, y, scale, 2, "Knight");
      this.damage = new Sprite(folder, "death",  "HURT_",    "png", KNIGHT_FRAMES.hurt, x, y, scale, 2, "Knight");
      this.death  = new Sprite(folder, "death",  "DEATH_",   "png", KNIGHT_FRAMES.death, x, y, scale, 2, "Knight");
      this.jump   = new Sprite(folder, "jump",   "JUMP_",    "png", KNIGHT_FRAMES.jump, x, y, scale, 2, "Knight");

      // Make Knight motions slower
      this.idle.advanceRate = 6;
      this.attack.advanceRate = 6;
      this.run.advanceRate = 6;
      this.crouch.advanceRate = 6;
      this.damage.advanceRate = 6;
      this.death.advanceRate = 6;
      this.jump.advanceRate = 6;
    } else {
      this.idle   = new Sprite("Warrior", "idle",   "Warrior_Idle_",   "png", 6,  x, y, scale);
      this.attack = new Sprite("Warrior", "Attack", "Warrior_Attack_", "png", 12, x, y, scale);
      this.run    = new Sprite("Warrior", "Run",    "Warrior_Run_",    "png", 8,  x, y, scale);
      this.crouch = new Sprite("Warrior", "Crouch", "Warrior_Crouch_", "png", 6,  x, y, scale);
      this.damage = null; this.death = null; this.jump = null;
    }

    this.currentSprite = this.idle;
    this.lastFlipX = faceLeft;
    this.idle.isFlipX = faceLeft; this.attack.isFlipX = faceLeft;
    if (this.run) this.run.isFlipX = faceLeft;
    if (this.crouch) this.crouch.isFlipX = faceLeft;
    if (this.damage) this.damage.isFlipX = faceLeft;
    if (this.death) this.death.isFlipX = faceLeft;
    if (this.jump) this.jump.isFlipX = faceLeft;
  }

  preload() {
    if (this.idle) this.idle.preload();
    if (this.attack) this.attack.preload();
    if (this.run) this.run.preload();
    if (this.crouch) this.crouch.preload();
    if (this.damage) this.damage.preload();
    if (this.death) this.death.preload();
    if (this.jump) this.jump.preload();
  }

  play() {
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.jumpCooldown > 0) this.jumpCooldown--;
    this.currentSprite.play();
    this.handleAttackEnd(); this.handleJumpEnd(); this.handleDeathEnd();
  }

  handleMovement(left, right) {
    if (this.isDead) return;
    let moving = false;
    if (keyIsDown(left)) { if (this.run) this.run.isFlipX = true; if (this.run) this.run.posX -= this.speed; this.lastFlipX = true; moving = true; }
    if (keyIsDown(right)) { if (this.run) this.run.isFlipX = false; if (this.run) this.run.posX += this.speed; this.lastFlipX = false; moving = true; }

    if (this.isJumping) {
      this.vy += 1.2;
      this.currentSprite.posY += this.vy;
      if (keyIsDown(left)) this.currentSprite.posX -= this.speed * 0.6;
      if (keyIsDown(right)) this.currentSprite.posX += this.speed * 0.6;
      const targetY = FLOOR_Y - getSpriteHeight(this.currentSprite);
      if (this.currentSprite.posY >= targetY) {
        this.currentSprite.posY = targetY; this.isJumping = false; this.vy = 0; this.immortal = false;
        if (!this.isDead) { this.idle.posX = this.currentSprite.posX; anchorToFloor(this.idle); this.idle.isFlipX = this.lastFlipX; this.currentSprite = this.idle; }
      }
    } else {
      if (this.run) anchorToFloor(this.run); anchorToFloor(this.idle); anchorToFloor(this.crouch);
      if (this.attack) anchorToFloor(this.attack); if (this.death) anchorToFloor(this.death); if (this.damage) anchorToFloor(this.damage);
      if (this.jump && !this.isJumping) this.jump.posY = FLOOR_Y - getSpriteHeight(this.jump);

      if (this.run && this.run.images.length > 0 && this.run.images[0]) {
        let w = this.run.images[0].width * this.run.spriteScale;
        if (this.run.posX > width) this.run.posX = -w;
        if (this.run.posX + w < 0) this.run.posX = width;
      }

      if (!this.isDead && this.currentSprite !== this.attack && this.currentSprite !== this.crouch && this.currentSprite !== this.jump && this.currentSprite !== (this.death || null)) {
        if (moving && this.run) {
          this.run.posX = this.currentSprite.posX; this.run.posY = this.currentSprite.posY; this.currentSprite = this.run; this.idle.isFlipX = this.run.isFlipX;
        } else if (this.currentSprite === this.run && !moving) {
          this.idle.posX = this.run.posX; this.idle.posY = this.run.posY; this.idle.isFlipX = this.lastFlipX; this.currentSprite = this.idle;
        }
      }
    }
  }

  triggerAttack() {
    if (this.isDead) return; if (this.attackCooldown > 0) return;
    if (this.role === "Frog") {
      spawnSingleBubble(this); spawnAttackEffect(this); this.attackCooldown = 16;
      return;
    }
    if (this.currentSprite !== this.attack && this.currentSprite !== this.crouch && this.currentSprite !== this.jump) {
      this.attack.currentIndex = 0; this.attack.isLoop = false;
      this.attack.posX = this.currentSprite.posX; this.attack.posY = this.currentSprite.posY;
      this.attack.isFlipX = this.lastFlipX; this.currentSprite = this.attack; this.attackQueue++;
      this.attackProjectileTriggered = false; this.attackCooldown = 20;
    }
  }

  triggerCrouch() {
    if (this.isDead) return;
    if (this.currentSprite !== this.attack && this.currentSprite !== this.jump) {
      this.crouch.currentIndex = 0; this.crouch.isLoop = true; this.crouch.posX = this.currentSprite.posX;
      anchorToFloor(this.crouch); this.crouch.isFlipX = this.lastFlipX; this.currentSprite = this.crouch; this.protecting = true;
    }
  }
  releaseCrouch() {
    if (this.isDead) return;
    if (this.currentSprite === this.crouch) {
      this.idle.posX = this.crouch.posX; anchorToFloor(this.idle); this.idle.isFlipX = this.lastFlipX; this.currentSprite = this.idle; this.protecting = false;
    }
  }

  triggerJump() {
    if (this.isDead) return; if (!this.jump) return;
    if (this.currentSprite === this.attack || this.currentSprite === this.crouch || this.currentSprite === this.death) return;
    if (this.jumpCooldown > 0 || this.isJumping) return;
    this.vy = -20;
    this.jump.currentIndex = 0; this.jump.isLoop = true;
    this.jump.posX = this.currentSprite.posX; this.jump.posY = FLOOR_Y - getSpriteHeight(this.jump) - 20;
    this.jump.isFlipX = this.lastFlipX; this.currentSprite = this.jump; this.isJumping = true; this.jumpCooldown = 40;
    if (this.role === "Z-Crow") this.immortal = true;
  }

  handleJumpEnd() {
    if (this.currentSprite === this.jump) {
      if (this.jump.currentIndex === this.jump.totalSize - 1 && !this.isJumping) {
        if (this.role === "Z-Crow") this.immortal = false;
        if (!this.isDead) { this.idle.posX = this.jump.posX; anchorToFloor(this.idle); this.idle.isFlipX = this.lastFlipX; this.currentSprite = this.idle; }
      }
    }
  }

  triggerDeath() {
    if (this.isDead) return;
    this.isDead = true; this.protecting = false; this.attackQueue = 0;
    if (this.death && this.death.images.length > 0) {
      this.death.currentIndex = 0; this.death.isLoop = false; this.death.posX = this.currentSprite.posX;
      anchorToFloor(this.death); this.death.isFlipX = this.lastFlipX; this.currentSprite = this.death;
    }
  }
  handleDeathEnd() {}

  handleAttackEnd() {
    if (this.currentSprite === this.attack) {
      if (this.attack.currentIndex === this.attack.totalSize - 1) {
        if (this.attackQueue > 1) { this.attackQueue--; this.attack.currentIndex = 0; }
        else { this.attackQueue = 0; if (!this.isDead) { this.idle.posX = this.attack.posX; anchorToFloor(this.idle); this.idle.isFlipX = this.lastFlipX; this.currentSprite = this.idle; } }
      }
    }
  }

  checkHit(opponent) {
    if (this.isDead) return; if (opponent.isDead) return;
    if (this.role !== "Frog" && this.currentSprite === this.attack) {
      let swordRange = 60;
      let dx = opponent.currentSprite.posX - this.currentSprite.posX;
      let dy = Math.abs(opponent.currentSprite.posY - this.currentSprite.posY);
      if (dy < 50) {
        if (!this.attack.isFlipX && dx > 0 && dx < swordRange) this.applyDamage(opponent);
        if (this.attack.isFlipX && dx < 0 && Math.abs(dx) < swordRange) this.applyDamage(opponent);
      }
    }
  }

  applyDamage(opponent) {
    if (opponent.isJumping) return;
    if (opponent.immortal) return;
    if (opponent.protecting) {
      let chance = random(1);
      if (chance < 0.5) return;
      else { opponent.health = max(0, opponent.health - 2); flashDamage(opponent); if (opponent.health <= 0) opponent.triggerDeath(); return; }
    }
    opponent.health = max(0, opponent.health - this.attackPower);
    flashDamage(opponent);
    if (opponent.health <= 0) opponent.triggerDeath();
  }

  centerX() {
    const img = this.currentSprite?.images?.[0];
    if (!img) return this.currentSprite.posX + 40;
    return this.currentSprite.posX + (img.width * this.currentSprite.spriteScale) / 2;
  }
  centerY() {
    const img = this.currentSprite?.images?.[0];
    if (!img) return this.currentSprite.posY + 40;
    return this.currentSprite.posY + (img.height * this.currentSprite.spriteScale) / 2;
  }
}

// ----------------- Globals -----------------
let warrior1 = null, warrior2 = null;
let gameOver = false, selectionMode = true;
let p1Choice = null, p2Choice = null;
let canvas;
let startButton = { x: 350, y: 420, w: 200, h: 48 };

// Character list — includes Knight
const classes = ["Z-Crow", "ej", "Frog", "Knight"];
let thumbs = {};
const CROW_FRAMES   = { idle: 4, attack: 5, damage: 3, death: 5, jump: 6, run: 4 };
const FROG_FRAMES   = { idle: 6, attackStart: 4, attackEnd: 9, damage: 4, death: 4, run: 7 };
const KNIGHT_FRAMES = { idle: 7, run: 8, attack: 6, jump: 5, death: 10, defend: 6, hurt: 4 };

function normalizeRole(charChoice) {
  if (charChoice === "Z-Crow" || charChoice === "ZCrow") return "Z-Crow";
  if (charChoice === "Frog") return "Frog";
  if (charChoice === "Knight") return "Knight";
  return "Warrior";
}
function getSpriteFolder(role) {
  if (role === "Z-Crow") return "crow";
  if (role === "Frog") return "frog";
  if (role === "Knight") return "knight";
  return "Warrior";
}

// selection BG
let selectBg = null, selectBgLoaded = false;

// battle BG (auto-select from list)
const BATTLE_BG_FILES = [
  'battle_bg/bg_13.png',
  'battle_bg/bg_9.png',
  'battle_bg/bg_f_12.png',
  'battle_bg/bg_f_6.png'
];
let battleBgImg = null, battleBgLoaded = false, battleBgDom = null;

// death timer
let endTimer = 0, endSceneActive = false;
const END_SCENE_FRAMES = 150;

// FLOOR_Y
const FLOOR_Y = 500;

// projectiles/effects
let projectiles = [], attackEffects = [], bubbleFrames = [];

// waiting-for-sprites flag
let waitingForSprites = false;

// Selection popup (message when clicking a character card)
let selectionPopup = null; // {text, x, y, timer}

// ----------------- Helpers -----------------
function getSpriteHeight(sprite) {
  const img0 = sprite?.images?.[0];
  if (!sprite || !img0) return 80;
  return img0.height * sprite.spriteScale;
}
function anchorToFloor(sprite) {
  if (!sprite) return;
  sprite.posY = FLOOR_Y - getSpriteHeight(sprite);
}
function unitHasLoaded(u) {
  if (!u) return false;
  if (!u.idle || !u.idle.images) return false;
  return u.idle.images.filter(Boolean).length > 0;
}

// ----------------- Preload -----------------
function preload() {
  // selection background candidates
  const bgCandidates = [
    "background/Background.png",
    "crow/background/Background.png",
    "frog/background/Background.png",
    "crow/Background.png",
    "frog/Background.png"
  ];
  let chosen = false;
  for (let p of bgCandidates) {
    loadImage(p,
      img => { if (!chosen) { selectBg = img; selectBgLoaded = true; chosen = true; } },
      () => {}
    );
  }

  // random battle background
  const pick = random(BATTLE_BG_FILES);
  loadImage(pick,
    img => { battleBgImg = img; battleBgLoaded = true; },
    () => { battleBgLoaded = false; }
  );

  // load frog projectile frames
  bubbleFrames = [];
  const s = FROG_FRAMES.attackStart, e = FROG_FRAMES.attackEnd;
  for (let i = s; i <= e; i++) bubbleFrames.push(loadImage(`frog/attack/Explosion_${i}.png`));

  // thumbs for selection cards (try variants)
  for (let cls of classes) {
    const folder = getSpriteFolder(normalizeRole(cls));
    thumbs[cls] = null;
    const candidates = [];
    if (folder === "crow") {
      candidates.push(`crow/idle/idle_01.png`, `crow/idle/idle_1.png`, `Crow/Idle/idle_01.png`);
    } else if (folder === "frog") {
      candidates.push(`frog/idle/Idle_01.png`, `frog/idle/Idle_1.png`, `Frog/Idle/Idle_01.png`);
    } else if (folder === "knight") {
      candidates.push(`knight/idle/idle_01.png`, `knight/idle/idle_1.png`, `Knight/Idle/idle_01.png`, `Knight/idle/idle_01.png`);
    } else {
      candidates.push(`Warrior/idle/Warrior_Idle_01.png`, `Warrior/idle/Warrior_Idle_1.png`);
    }
    tryLoadAny(candidates, img => { thumbs[cls] = img; });
  }
}

// ----------------- Setup -----------------
function setup() {
  canvas = createCanvas(900, 560);
  frameRate(30);
  canvas.elt.setAttribute("tabindex", "0");
  canvas.elt.focus();

  if (!battleBgLoaded) {
    battleBgDom = createImg('battle_bg/Turbo_12s_to_1min_small.gif', '', () => {
      battleBgDom.style('position', 'absolute');
      battleBgDom.style('left', '0px'); battleBgDom.style('top', '0px');
      battleBgDom.style('width', `${width}px`); battleBgDom.style('height', `${height}px`);
      battleBgDom.style('z-index', '-1');
    });
    battleBgDom.hide();
  }

  const attackButton1 = createButton('P1 Attack');
  attackButton1.position(10, height + 20);
  attackButton1.mousePressed(() => { if (warrior1) warrior1.triggerAttack(); });
  const attackButton2 = createButton('P2 Attack');
  attackButton2.position(120, height + 20);
  attackButton2.mousePressed(() => { if (warrior2) warrior2.triggerAttack(); });
}

// ----------------- Draw -----------------
function draw() {
  if (selectionMode) {
    if (battleBgDom) battleBgDom.hide();
    if (selectBgLoaded && selectBg) background(selectBg); else background(18,20,26);
    drawSelectionScreen();
    return;
  }

  if (waitingForSprites) {
    if (unitHasLoaded(warrior1) && unitHasLoaded(warrior2)) {
      waitingForSprites = false;
      if (battleBgDom) {
        battleBgDom.show();
        battleBgDom.style('width', `${width}px`);
        battleBgDom.style('height', `${height}px`);
        battleBgDom.style('left', `${canvas.position().x}px`);
        battleBgDom.style('top', `${canvas.position().y}px`);
        canvas.style('z-index','0'); battleBgDom.style('z-index','-1');
      }
    } else {
      if (battleBgImg) image(battleBgImg, 0, 0, width, height);
      else background(26,28,36);
      push();
      fill(0,0,0,160); rect(0,0,width,height);
      textAlign(CENTER, CENTER); textSize(26); fill(255);
      text("Loading sprites...", width/2, height/2 - 10);
      textSize(14); text("This may take a moment — waiting for frames to finish loading.", width/2, height/2 + 24);
      pop();
      return;
    }
  }

  if (battleBgImg) image(battleBgImg, 0, 0, width, height);
  if (battleBgDom) {
    battleBgDom.show();
    battleBgDom.style('width', `${width}px`);
    battleBgDom.style('height', `${height}px`);
    battleBgDom.style('left', `${canvas.position().x}px`);
    battleBgDom.style('top', `${canvas.position().y}px`);
    canvas.style('z-index','0'); battleBgDom.style('z-index','-1');
  }
  if (!battleBgImg && !battleBgDom) background(26,28,36);

  push(); stroke(255,215,0,30); strokeWeight(2); line(0, FLOOR_Y, width, FLOOR_Y); pop();

  if (gameOver) {
    if (warrior1) warrior1.play(); if (warrior2) warrior2.play();
    updateAndDrawProjectiles(); updateAndDrawEffects(); drawDamageFlashes();
    if (!endSceneActive) { endSceneActive = true; endTimer = END_SCENE_FRAMES; }
    drawDeathScene(); endTimer--; if (endTimer <= 0) resetToSelection();
    return;
  }

  // Input & movement
  if (warrior1) {
    warrior1.handleMovement(65, 68);
    if (keyIsDown(87) && !warrior1.isJumping && !warrior1.isDead) warrior1.triggerJump();
  }
  if (warrior2) {
    warrior2.handleMovement(72, 75);
    if (keyIsDown(85) && !warrior2.isJumping && !warrior2.isDead) warrior2.triggerJump();
  }

  updateAndDrawProjectiles(); updateAndDrawEffects();

  if (warrior1 && warrior2) { warrior1.checkHit(warrior2); warrior2.checkHit(warrior1); }

  drawHUD();

  if (warrior1) warrior1.play();
  if (warrior2) warrior2.play();

  drawDamageFlashes();

  if (warrior1 && warrior1.health <= 0) {
    const done = (!warrior1.death) || (warrior1.death && warrior1.death.currentIndex === warrior1.death.totalSize - 1);
    if (done) gameOver = true;
  }
  if (warrior2 && warrior2.health <= 0) {
    const done = (!warrior2.death) || (warrior2.death && warrior2.death.currentIndex === warrior2.death.totalSize - 1);
    if (done) gameOver = true;
  }
}

// ----------------- HUD -----------------
function drawHUD() {
  const pad = 12;
  const portraitSize = 56;
  const topY = 12;
  const gapBetweenPanels = 200;
  const maxPanelW = Math.floor((width - pad*2 - gapBetweenPanels) / 2);
  const panelW = Math.min(420, Math.max(220, maxPanelW));
  const panelH = 70;

  // LEFT (P1)
  const leftX = pad;
  push();
  noStroke(); fill(0,0,0,140); rect(leftX, topY, panelW, panelH, 6);
  if (warrior1 && thumbs[p1Choice]) image(thumbs[p1Choice], leftX + 8, topY + (panelH - portraitSize)/2, portraitSize, portraitSize);
  else { fill(80); ellipse(leftX + 8 + portraitSize/2, topY + panelH/2, portraitSize, portraitSize); }
  textSize(11); fill(180); textAlign(LEFT, TOP); text("PLAYER 1", leftX + 8 + portraitSize + 10, topY + 6);
  textSize(18); fill(255);
  const name1 = warrior1 ? (warrior1.displayName || p1Choice || "P1") : (p1Choice || "P1");
  text(name1, leftX + 8 + portraitSize + 10, topY + 22);
  const barX = leftX + 8 + portraitSize + 10;
  const barY = topY + panelH - 22;
  const barW = panelW - (8 + portraitSize + 22);
  const barH = 12;
  fill(90); rect(barX, barY, barW, barH, 6);
  if (warrior1) {
    const r = constrain(warrior1.health / warrior1.maxHealth, 0, 1);
    if (r > 0.5) fill(0,200,0); else if (r > 0.25) fill(255,200,0); else fill(255,50,50);
    rect(barX, barY, barW * r, barH, 6);
    fill(255); textSize(12); textAlign(RIGHT, CENTER); text(Math.round(r*100) + "%", barX + barW - 6, barY + barH/2);
  } else {
    fill(0,200,0); rect(barX, barY, barW, barH, 6);
    fill(255); textSize(12); textAlign(RIGHT, CENTER); text("100%", barX + barW - 6, barY + barH/2);
  }
  pop();

  // RIGHT (P2)
  const rightX = width - pad - panelW;
  push();
  noStroke(); fill(0,0,0,140); rect(rightX, topY, panelW, panelH, 6);
  if (warrior2 && thumbs[p2Choice]) image(thumbs[p2Choice], rightX + panelW - 8 - portraitSize, topY + (panelH - portraitSize)/2, portraitSize, portraitSize);
  else { fill(80); ellipse(rightX + panelW - 8 - portraitSize/2, topY + panelH/2, portraitSize, portraitSize); }
  textSize(11); fill(180); textAlign(RIGHT, TOP);
  const playerLabel2 = (warrior2 && warrior2.label === "P2") ? "PLAYER 2" : "CPU";
  text(playerLabel2, rightX + panelW - 8 - portraitSize - 10, topY + 6);
  textSize(18); fill(255);
  const name2 = warrior2 ? (warrior2.displayName || p2Choice || "P2") : (p2Choice || "P2");
  textAlign(RIGHT, TOP); text(name2, rightX + panelW - 8 - portraitSize - 10, topY + 22);
  const bar2X = rightX + 8;
  const bar2Y = topY + panelH - 22;
  const bar2W = panelW - (8 + portraitSize + 22);
  const bar2H = 12;
  fill(90); rect(bar2X, bar2Y, bar2W, bar2H, 6);
  if (warrior2) {
    const r2 = constrain(warrior2.health / warrior2.maxHealth, 0, 1);
    if (r2 > 0.5) fill(0,200,0); else if (r2 > 0.25) fill(255,200,0); else fill(255,50,50);
    rect(bar2X, bar2Y, bar2W * r2, bar2H, 6);
    fill(255); textSize(12); textAlign(LEFT, CENTER); text(Math.round(r2*100) + "%", bar2X + 6, bar2Y + bar2H/2);
  } else {
    fill(0,200,0); rect(bar2X, bar2Y, bar2W, bar2H, 6);
    fill(255); textSize(12); textAlign(LEFT, CENTER); text("100%", bar2X + 6, bar2Y + bar2H/2);
  }
  pop();
}

// ----------------- spawn / effects / collisions -----------------
function spawnSingleBubble(unit) {
  const dir = unit.lastFlipX ? -1 : 1;
  const startX = unit.centerX() + dir * 28;
  const startY = unit.isJumping ? unit.centerY() - 30 : unit.centerY();
  const speed = 12 * dir;
  const frames = bubbleFrames.slice();
  projectiles.push(new AnimatedProjectile(startX, startY, speed, frames, unit, 140));
}
function spawnAttackEffect(unit) {
  const frames = bubbleFrames.slice();
  attackEffects.push(new AttackEffect(unit.centerX(), unit.centerY(), frames, 6));
}

function updateAndDrawProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; p.update(); p.draw();
    const victims = [warrior1, warrior2];
    for (let v of victims) {
      if (!v) continue; if (v === p.owner) continue; if (p.hitUnits.includes(v)) continue;
      if (v.isJumping || v.immortal) continue;
      if (p.collidesWith(v)) {
        p.hitUnits.push(v);
        v.health = max(0, v.health - p.owner.attackPower);
        flashDamage(v);
        if (v.health <= 0) v.triggerDeath();
      }
    }
    if (p.timer <= 0 || p.isOffscreen()) projectiles.splice(i, 1);
  }
}
function updateAndDrawEffects() {
  for (let i = attackEffects.length - 1; i >= 0; i--) {
    const e = attackEffects[i]; e.update(); e.draw();
    if (e.finished) attackEffects.splice(i,1);
  }
}

// ----------------- selection UI & flow -----------------
let cardBounds = [];
function drawSelectionScreen() {
  push(); noStroke(); fill(12,14,20,180); rect(20,20,width-40,80,10); pop();
  fill(255); textAlign(LEFT, TOP); textSize(28); text("Choose your fighter", 40, 28);
  textSize(12); fill(200); text("Click a card to assign P1 then P2. Start when both selected.", 40, 60);
  textAlign(RIGHT, TOP); fill(240);
  text("P1: A/D • E attack • R crouch • W jump", width - 40, 28);
  text("P2: H/K • I attack • O crouch • U jump", width - 40, 46);

  const cols = 4; const cardW = 150; const cardH = 160; const gap = 28;
  const startX = (width - ((cardW + gap) * cols - gap)) / 2;
  const startY = 120;
  cardBounds = [];

  for (let i = 0; i < classes.length; i++) {
    const col = i % cols; const row = Math.floor(i / cols);
    const x = startX + col * (cardW + gap); const y = startY + row * (cardH + 60);
    push(); fill(40); stroke(90); rect(x, y, cardW, cardH, 8); pop();
    if (thumbs[classes[i]]) { imageMode(CENTER); image(thumbs[classes[i]], x + cardW/2, y + cardH/2 - 8, 120, 120); imageMode(CORNER); }
    noStroke(); fill(255); textAlign(CENTER, TOP); textSize(16); text(classes[i], x + cardW/2, y + cardH - 38);

    const stats = getClassStats(classes[i]);
    fill(120); rect(x + 14, y + cardH - 22, cardW - 28, 8);
    fill(0,200,0); rect(x + 14, y + cardH - 22, map(stats.health, 0, 200, 0, cardW - 28), 8);
    fill(120); rect(x + 14, y + cardH - 10, cardW - 28, 8);
    fill(200,120,0); rect(x + 14, y + cardH - 10, map(stats.attack, 0, 12, 0, cardW - 28), 8);

    if (p1Choice === classes[i] || p2Choice === classes[i]) {
      push(); noFill(); strokeWeight(3);
      if (p1Choice === classes[i] && p2Choice === classes[i]) {
        stroke(255,100,100); rect(x-6,y-6,cardW+12,cardH+12,10);
        stroke(100,150,255); rect(x-2,y-2,cardW+4,cardH+4,8);
      } else if (p1Choice === classes[i]) {
        stroke(255,100,100); rect(x-4,y-4,cardW+8,cardH+8,8);
      } else {
        stroke(100,150,255); rect(x-4,y-4,cardW+8,cardH+8,8);
      }
      pop();
      push(); textSize(12); textAlign(LEFT, TOP);
      if (p1Choice === classes[i]) { fill(255,100,100); text("P1", x + 8, y + 8); }
      if (p2Choice === classes[i]) { fill(100,150,255); text("P2", x + cardW - 28, y + 8); }
      pop();
    }
    cardBounds.push({ x, y, w: cardW, h: cardH, cls: classes[i] });
  }

  // draw selection popup message if present
  if (selectionPopup && selectionPopup.timer > 0) {
    push();
    const pad = 10;
    textSize(14); textAlign(LEFT, TOP);
    fill(0,0,0,200); rect(selectionPopup.x - 8, selectionPopup.y - 44, textWidth(selectionPopup.text) + pad*2, 36, 8);
    fill(255); text(selectionPopup.text, selectionPopup.x - 8 + pad, selectionPopup.y - 42);
    pop();
    selectionPopup.timer--;
    if (selectionPopup.timer <= 0) selectionPopup = null;
  }

  const canStart = p1Choice && p2Choice;
  push(); fill(canStart ? color(80,200,120) : color(90)); noStroke(); rect(startButton.x, startButton.y, startButton.w, startButton.h, 8);
  fill(255); textSize(18); textAlign(CENTER, CENTER);
  text(canStart ? "START" : "Choose two fighters", startButton.x + startButton.w/2, startButton.y + startButton.h/2);
  pop();
}

function mousePressed() {
  if (selectionMode) {
    // card clicks first
    for (let b of cardBounds) {
      if (!b) continue;
      if (mouseX > b.x && mouseX < b.x + b.w && mouseY > b.y && mouseY < b.y + b.h) {
        // Show popup message for this class
        const msg = pickClassMessage(b.cls);
        selectionPopup = { text: msg, x: b.x + b.w/2, y: b.y, timer: 90 }; // ~3 seconds at 30 FPS

        if (!p1Choice) p1Choice = b.cls;
        else if (!p2Choice) p2Choice = b.cls;
        else { p1Choice = b.cls; p2Choice = null; }
        return; // prevent falling through to start button
      }
    }
    // start button hit test fix
    if (p1Choice && p2Choice) {
      if (mouseX > startButton.x && mouseX < startButton.x + startButton.w &&
          mouseY > startButton.y && mouseY < startButton.y + startButton.h) {
        startGame();
      }
    }
  }
}
function touchStarted() { mousePressed(); return false; }

function pickClassMessage(cls) {
  if (cls === "Z-Crow") return 'Z-Crow: "I can control all the crow"';
  if (cls === "ej") return 'ej: "Kneel before me"';
  if (cls === "Frog") return 'Frog: "ribbit brir birt trib"';
  if (cls === "Knight") return 'Knight: "I\\'m the paladin"';
  return cls;
}

function getClassStats(cls) {
  const role = normalizeRole(cls);
  if (role === "Z-Crow") return { health: 120, attack: 6, speed: 8, maxHealth: 120, attackPower: 6 };
  if (role === "Frog")   return { health: 90,  attack: 7, speed: 7,  maxHealth: 90,  attackPower: 7 };
  if (role === "Knight") return { health: 160, attack: 6, speed: 5,  maxHealth: 160, attackPower: 6 };
  return { health: 100, attack: 5, speed: 7, maxHealth: 100, attackPower: 5 };
}

function startGame() {
  const bigScale = 3.0;
  const s1 = getClassStats(p1Choice || "Z-Crow");
  const s2 = getClassStats(p2Choice || "Frog");

  // initial X positions (left / right)
  const leftX = 220;
  const rightX = width - 320;

  warrior1 = new Unit(leftX, FLOOR_Y - 120, bigScale, "P1", false, p1Choice || "Z-Crow", { maxHealth: s1.maxHealth, attackPower: s1.attackPower, speed: s1.speed });
  warrior2 = new Unit(rightX, FLOOR_Y - 120, bigScale, "P2", true, p2Choice || "Frog", { maxHealth: s2.maxHealth, attackPower: s2.attackPower, speed: s2.speed });

  warrior1.health = warrior1.maxHealth; warrior2.health = warrior2.maxHealth;
  warrior1.preload(); warrior2.preload();

  // anchor all relevant sprites to the same floor Y
  anchorToFloor(warrior1.idle); if (warrior1.run) anchorToFloor(warrior1.run); if (warrior1.jump) anchorToFloor(warrior1.jump);
  anchorToFloor(warrior2.idle); if (warrior2.run) anchorToFloor(warrior2.run); if (warrior2.jump) anchorToFloor(warrior2.jump);

  // ensure both fighters sit on same vertical level (use idle sprite as canonical)
  if (warrior1.idle && warrior2.idle) {
    const y = FLOOR_Y - getSpriteHeight(warrior1.idle);
    warrior1.idle.posY = y; warrior1.currentSprite.posY = y;
    warrior2.idle.posY = y; warrior2.currentSprite.posY = y;
  }

  // Avoid horizontal overlap: ensure minimum separation
  const minSeparation = 220; // tweak this for tighter / wider spacing
  const c1 = warrior1.centerX();
  const c2 = warrior2.centerX();
  const dx = Math.abs(c2 - c1);
  if (dx < minSeparation) {
    // push warrior2 to the right of warrior1
    let targetX = warrior1.currentSprite.posX + minSeparation;
    // keep inside canvas
    const maxRight = width - 120;
    if (targetX > maxRight) {
      // instead pull warrior1 left
      warrior1.currentSprite.posX = constrain(warrior1.currentSprite.posX - (minSeparation - dx), 20, width/2 - 40);
      targetX = warrior1.currentSprite.posX + minSeparation;
    }
    warrior2.currentSprite.posX = targetX;
    // update idle/run positions too
    if (warrior1.idle) warrior1.idle.posX = warrior1.currentSprite.posX;
    if (warrior2.idle) warrior2.idle.posX = warrior2.currentSprite.posX;
    if (warrior1.run) warrior1.run.posX = warrior1.currentSprite.posX;
    if (warrior2.run) warrior2.run.posX = warrior2.currentSprite.posX;
  }

  selectionMode = false; gameOver = false; endSceneActive = false; endTimer = 0;
  waitingForSprites = true; // wait until sprites have finished loading
  projectiles = []; attackEffects = [];
  if (battleBgDom) battleBgDom.hide();
}

function keyPressed() {
  if (selectionMode) return;
  if (gameOver) return;
  if ((key === "e" || key === "E") && warrior1) warrior1.triggerAttack();
  if ((key === "r" || key === "R") && warrior1) warrior1.triggerCrouch();
  if ((key === "i" || key === "I") && warrior2) warrior2.triggerAttack();
  if ((key === "o" || key === "O") && warrior2) warrior2.triggerCrouch();
  if (gameOver && (key === "r" || key === "R")) resetToSelection();
}
function keyReleased() {
  if (selectionMode) return;
  if ((key === "r" || key === "R") && warrior1) warrior1.releaseCrouch();
  if ((key === "o" || key === "O") && warrior2) warrior2.releaseCrouch();
}

let flashList = [];
function flashDamage(unit) { flashList.push({ unit: unit, timer: 6 }); }
function drawDamageFlashes() {
  for (let i = flashList.length - 1; i >= 0; i--) {
    const f = flashList[i];
    push(); fill(255, 0, 0, 120); noStroke(); rect(f.unit.currentSprite.posX, f.unit.currentSprite.posY, 80, 100); pop();
    f.timer--; if (f.timer <= 0) flashList.splice(i, 1);
  }
}

function drawDeathScene() {
  push(); fill(0,0,0,160); rect(0,0,width,height); pop();
  textAlign(CENTER, CENTER); textSize(36); fill(255);
  if (warrior1 && warrior2 && warrior1.health <= 0 && warrior2.health <= 0) text("DRAW", width/2, height/2 - 20);
  else if (warrior1 && warrior1.health <= 0) text("P2 WINS", width/2, height/2 - 20);
  else if (warrior2 && warrior2.health <= 0) text("P1 WINS", width/2, height/2 - 20);
  textSize(16); text("Returning to selection...", width/2, height/2 + 20);
}

function resetToSelection() {
  if (battleBgDom) battleBgDom.hide();
  warrior1 = null; warrior2 = null; selectionMode = true; p1Choice = null; p2Choice = null;
  gameOver = false; endSceneActive = false; endTimer = 0; projectiles = []; attackEffects = [];
  selectionPopup = null;
}

// optional shadow helper
function drawShadow(unit) {
  if (!unit || unit.isDead) return;
  push(); noStroke(); fill(0,0,0,60);
  let spriteWidth = 60 * (unit.role === "Frog" ? 1.6 : 1.3);
  let shadowY = FLOOR_Y - 6;
  ellipse(unit.currentSprite.posX + spriteWidth / 2, shadowY, spriteWidth, 14);
  pop();
}
