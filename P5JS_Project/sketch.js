let paddle;
let gems = [];
let score = 0;
let state = "start"; // start, game, gameover
let spawnTimer = 0;
let bgImg;

let moveLeft = false;
let moveRight = false;

function preload() {
  // your own background image in /picture/2.jpg
  bgImg = loadImage("picture/2.jpg");
}

function setup() {
  let cnv = createCanvas(480, 640);
  cnv.elt.setAttribute("tabindex", "0"); // allow focus
  cnv.elt.focus();
  textFont("Arial");

  paddle = new Paddle();

  // prevent Wix page scroll with space/arrow keys
  window.addEventListener("keydown", function(e) {
    if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
      e.preventDefault();
    }
  }, false);
}

function draw() {
  if (state === "start") {
    background(50, 100, 200);
    fill(255);
    textAlign(CENTER);
    textSize(36);
    text("Gem Catcher", width/2, height/2 - 40);
    textSize(20);
    text("Press SPACE or TAP to Start", width/2, height/2 + 20);
  }
  else if (state === "game") {
    playGame();
    drawTouchButtons();
  }
  else if (state === "gameover") {
    background(0, 0, 50);
    fill(255, 200, 0);
    textAlign(CENTER);
    textSize(36);
    text("GAME OVER", width/2, height/2);
    textSize(20);
    text("Final Score: " + score, width/2, height/2 + 40);
    text("Press R or TAP to Restart", width/2, height/2 + 80);
  }
}

function playGame() {
  background(bgImg);
  paddle.update();
  paddle.show();

  spawnTimer--;
  if (spawnTimer <= 0) {
    spawnTimer = 90;
    let rare = random(1) < 0.1;
    gems.push(new Gem(random(30, width-30), -20, rare));
  }

  for (let g of gems) {
    g.update();
    g.show();

    if (!g.caught && g.y + g.size/2 >= paddle.y &&
        g.x > paddle.x && g.x < paddle.x + paddle.w) {
      g.caught = true;
      score += g.value;
    }

    if (g.y > height + 30 && !g.caught) {
      triggerGameOver();
    }
  }

  fill(255);
  textSize(20);
  textAlign(LEFT);
  text("Score: " + score, 20, 30);
}

function triggerGameOver() {
  state = "gameover";
}

function keyPressed() {
  if (state === "start" && key === " ") {
    startGame();
    return false;
  }
  else if (state === "gameover" && (key === "r" || key === "R")) {
    startGame();
    return false;
  }
}

function mousePressed() {
  // refocus canvas when clicked (important for Wix)
  let cnv = document.querySelector('canvas');
  if (cnv) cnv.focus();
}

function startGame() {
  state = "game";
  score = 0;
  gems = [];
  paddle = new Paddle();
  spawnTimer = 60;
}

// --------------------
// Touch Controls
// --------------------
function drawTouchButtons() {
  noStroke();
  fill(0, 100, 255, 150);
  rect(0, height-80, width/2, 80);   // left
  rect(width/2, height-80, width/2, 80); // right

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("◀", width/4, height-40);
  text("▶", 3*width/4, height-40);
}

function touchStarted() {
  if (state === "start") {
    startGame();
    return false;
  }
  if (state === "gameover") {
    startGame();
    return false;
  }
  if (state === "game") {
    if (mouseY > height-80) {
      if (mouseX < width/2) moveLeft = true;
      else moveRight = true;
    }
  }
  return false;
}

function touchEnded() {
  moveLeft = false;
  moveRight = false;
  return false;
}

// --------------------
// Classes
// --------------------
class Paddle {
  constructor() {
    this.w = 80;
    this.h = 20;
    this.x = width/2 - this.w/2;
    this.y = height - 40;
    this.speed = 7;
  }
  update() {
    if (keyIsDown(LEFT_ARROW) || moveLeft) this.x -= this.speed;
    if (keyIsDown(RIGHT_ARROW) || moveRight) this.x += this.speed;
    this.x = constrain(this.x, 0, width-this.w);
  }
  show() {
    fill(0,200,255);
    rect(this.x, this.y, this.w, this.h, 5);
  }
}

class Gem {
  constructor(x, y, rare=false) {
    this.x = x;
    this.y = y;
    this.size = 30;
    this.speed = 3;
    this.caught = false;
    this.rare = rare;
    this.value = rare ? 5 : 1;
  }
  update() {
    if (!this.caught) this.y += this.speed;
  }
  show() {
    if (this.caught) return;
    if (this.rare) fill(255, 50, 200);
    else fill(0, 255, 100);
    ellipse(this.x, this.y, this.size);
  }
}
