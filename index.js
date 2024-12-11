const r = require("raylib");

const screenWidth = 1920;
const screenHeight = 1080;
const scaleFactor = Math.min(screenWidth, screenHeight) / 2;

r.InitWindow(screenWidth, screenHeight, "raylib [core] example - basic window");
r.ToggleFullscreen();
r.SetWindowSize(screenWidth, screenHeight);
r.SetTargetFPS(60);

let centerX = 250;
let centerY = screenHeight / 2;
let radius = 25;
let delayBetweenShotsFrames = 8;
let lastShotCounter = 0;
let lastBossShotCounter = 0;
let enemySpeed = 5;

let delayBetweenEnemesFrames = 5;
let lastEnemyCounter = 0;

let enemyCount = 0;
let changeColor = r.RED;

let defaultChaseEnemyGenerateValue = 0.9;
let defaultChaseBossBulletGenerateValue = 0.9;

let letPlayerCanFire = true;

let checkCollisionEnemy = false;
let checkCollisionBullet = false;

class GameObject {
  constructor() {
    this.coords = { x: 0, y: 0 };
    this.speed = r.Vector2(-8, 0);
    this.radius = 1;
    this.id = -1;
  }
  isInWindow() {
    return this.coords.x >= screenWidth || this.coords.x <= 0;
  }
  moveTick() {
    this.coords.x += this.speed.x;
    this.coords.y += this.speed.y;
  }
  moveTickRevers() {
    this.coords.x -= this.speed.x;
    this.coords.y -= this.speed.y;
  }
}

class Enemy extends GameObject {
  constructor() {
    super();
    this.radius = Math.floor(Math.random() * (20 - 10 + 1) + 10);
    this.color = Object.assign({}, r.BLACK);
    this.exist = false;
    this.entity = "soldier";
  }
}

class ChaseEnemy extends Enemy {
  constructor() {
    super();
    this.modificatorEntity = "self-guided";
  }
  moveTick() {
    this.coords.x += this.speed.x;
    this.coords.y += this.speed.y;
    let dx = centerX - this.coords.x;
    let dy = centerY - this.coords.y;
    this.speed.x += Math.random() * 0.2 * Math.sign(dx);
    this.speed.y += Math.random() * 0.2 * Math.sign(dy);
  }
}

class Boss extends GameObject {
  constructor() {
    super();
    this.color = Object.assign({}, r.RED);
    this.orbitCenter = Object.assign({
      x: screenWidth / 2,
      y: screenHeight / 2,
    });
    //this.orbitRadius = screenHeight / 2 + 1;
    this.orbitRadius = 800;
    this.upperAngleLimit = Math.PI * 2;
    this.lowerAngleLimit = Math.PI;
    this.radius = 50;
    this.bossHp = 30;
    this.entity = "boss";
    this.angle = 0;
    this.coords.x = screenWidth;
    this.coords.y = 0;
    this.speed = 0.01;
    this.calcOrbitCenter(this.orbitRadius);
    this.hit = false;
  }
  bossHitAnimation(boolStatus) {
    this.hit = boolStatus;
    this.hit ? (this.color = r.WHITE) : (this.color = r.RED);
  }
  moveTick() {
    // Normalise angle toi be between 0 and 2* pi
    while (this.angle >= Math.PI * 2) {
      this.angle -= Math.PI * 2;
    }
    while (this.angle < 0) {
      this.angle += Math.PI * 2;
    }
    if (this.angle + this.speed > this.upperAngleLimit) {
      // console.log(
      //   "upper bound reverse " + this.angle + ", speed " + this.speed
      // );
      this.angle = this.upperAngleLimit;
      this.speed = -Math.abs(this.speed);
    }
    if (this.angle + this.speed < this.lowerAngleLimit) {
      // console.log(
      //   "lower bound reverse " + this.angle + ", speed " + this.speed
      // );
      this.angle = this.lowerAngleLimit;
      this.speed = Math.abs(this.speed);
    }
    this.angle += this.speed;
    // console.log("angle " + this.angle);
    this.calcPosByAngle(this.angle);

    // RETURN TO FIELD
    // console.log("x " + this.coords.x + " y " + this.coords.y);
    if (this.coords.x > screenWidth) {
      // console.log("returned to field");
      this.coords.x = screenWidth;
    }
    if (this.coords.x < 0) {
      // console.log("returned to field");
      this.coords.x = 0;
    }
    if (this.coords.y > screenHeight) {
      // console.log("returned to field");
      this.coords.y = screenHeight;
    }
    if (this.coords.y < 0) {
      // console.log("returned to field");
      this.coords.y = 0;
    }
  }
  calcOrbitCenter(r) {
    // console.log("r " + r);
    this.orbitRadius = r;
    let a = screenHeight / 2;
    if (r <= a) {
      throw (
        "radius " +
        r +
        " is smaller or equal to the side " +
        a +
        ", MUST be greater!"
      );
    }
    let c = r;
    let cosA = a / c;
    let sinA = Math.sqrt(1 - cosA * cosA);
    let b = sinA * c;
    this.orbitCenter.x = screenWidth + b;
    this.orbitCenter.y = screenHeight / 2;

    let angle = Math.acos(cosA);
    this.lowerAngleLimit = angle + Math.PI;
    this.upperAngleLimit = Math.PI * 2 - angle;
    // console.log(
    //   "angle " +
    //     angle +
    //     " this.upperAngleLimit " +
    //     this.upperAngleLimit +
    //     " this.lowerAngleLimit " +
    //     this.lowerAngleLimit
    // );
  }
  calcPosByAngle(alfa) {
    this.coords.x = this.orbitCenter.x + this.orbitRadius * Math.sin(alfa);
    this.coords.y = this.orbitCenter.y + this.orbitRadius * Math.cos(alfa);
  }
}

class Bullet extends GameObject {
  constructor() {
    super();
    this.owner = "";
    this.color = Object.assign({}, r.RED);
    //this.exist = false
  }
  preBossFireStage() {
    this.coords.x += this.speed.x;
    this.coords.y += this.speed.y;
    let dx = 0 - this.coords.x;
    let dy = screenHeight - this.coords.y;
    this.speed.x += Math.random() * 0.4 * Math.sign(dx);
    this.speed.y += Math.random() * 0.4 * Math.sign(dy);
  }
}

let bullets = new Array();
let bossBullets = new Array();

let movementSpeed = 6;
let blastRadius = 5;

let enemyArr = [];
let gameOver = true;
let bossStatus = true;

function degToRad(deg) {
  return deg * (Math.PI / 180.0);
}

const generateEnemy = (key) => {
  switch (key) {
    // add new case "preBossStage"
    case "preStage":
      let resultArr = [...enemyArr];
      if (resultArr.length < 10) {
        for (let i = 0; i <= resultArr.length; i++) {
          letPlayerCanFire = false;
          if (resultArr.length == 1) {
            letPlayerCanFire = true;
            break;
          }
        }
      }
      // if (resultArr.length < 10) {
      //   letPlayerCanFire = false;
      // }
      if (resultArr.length < 15) {
        for (let i = 0; i < bullets.length; i++) {
          if (resultArr.length === 1) {
            break;
          }
          bullets[i].preBossFireStage();
        }
      }
      break;
    case "Boss":
      while (enemyArr.length == 0) {
        let newEnemy = new Boss();
        newEnemy.exist = true;
        newEnemy.id = Math.random() * 31337;
        enemyArr.push(newEnemy);
      }
      break;
    default:
      if (lastEnemyCounter <= 0) {
        if (Math.random() > defaultChaseEnemyGenerateValue) {
          let newEnemy = new ChaseEnemy();
          newEnemy.exist = true;
          newEnemy.id = Math.random() * 31337;
          newEnemy.coords.x = screenWidth;
          // newEnemy.coords.y = 250;
          newEnemy.coords.y = Math.floor(Math.random() * screenHeight);
          enemyArr.push(newEnemy);
          lastEnemyCounter = delayBetweenEnemesFrames;
        } else {
          let newEnemy = new Enemy();
          newEnemy.exist = true;
          newEnemy.id = Math.random() * 31337;
          newEnemy.coords.x = screenWidth;
          // newEnemy.coords.y = 250;
          newEnemy.coords.y = Math.floor(Math.random() * screenHeight);
          enemyArr.push(newEnemy);
          lastEnemyCounter = delayBetweenEnemesFrames;
        }
      }
      break;
  }
};

const stopGame = () => {
  delayBetweenEnemesFrames = 5;
  changeColor = r.RED;
  defaultChaseEnemyGenerateValue = 0.9;
  enemyCount = 0;
  enemyArr = [];
  bullets = [];
  bossBullets = [];
  centerX = 250;
  centerY = screenHeight / 2;
  radius = 25;

  if (r.IsKeyDown(r.KEY_ENTER)) {
    gameOver = false;
    bossStatus = true;
  }
  if (checkCollisionEnemy) {
    r.BeginDrawing();
    r.ClearBackground(r.GRAY);
    r.DrawText(
      "You sucked a dick",
      screenWidth / 2.8,
      screenHeight / 2.5,
      60,
      r.BLACK
    );
    r.DrawText(
      "PRESS [ENTER] to suck again",
      screenWidth / 3.8,
      screenHeight / 2.0,
      60,
      r.BLACK
    );
    r.EndDrawing();
  } else {
    r.BeginDrawing();
    r.ClearBackground(r.GRAY);
    if (bossStatus == false) {
      r.DrawText(
        "YOU WIN!",
        screenWidth / 2.5,
        screenHeight / 2.5,
        60,
        r.BLACK
      );
      r.DrawText(
        "PRESS [ENTER] to start",
        screenWidth / 3.5,
        screenHeight / 2.0,
        60,
        r.BLACK
      );
    } else {
      r.DrawText(
        "PRESS [ENTER] to start",
        screenWidth / 3.5,
        screenHeight / 2.0,
        60,
        r.BLACK
      );
    }

    r.EndDrawing();
  }
};

const controlObj = () => {
  if (r.IsKeyDown(r.KEY_RIGHT)) {
    centerX = Math.min(screenWidth - radius, centerX + movementSpeed);
  }
  if (r.IsKeyDown(r.KEY_LEFT)) {
    centerX = Math.max(0 + radius, centerX - movementSpeed);
  }
  if (r.IsKeyDown(r.KEY_UP)) {
    centerY = Math.max(0 + radius, centerY - movementSpeed);
  }
  if (r.IsKeyDown(r.KEY_DOWN)) {
    screenHeight - radius;
    centerY = Math.min(screenHeight - radius, centerY + movementSpeed);
  }

  if (
    r.IsKeyDown(r.KEY_SPACE) &&
    lastShotCounter <= 0 &&
    letPlayerCanFire === true
  ) {
    let burstAngles = [0];
    if (enemyCount >= 300) {
      burstAngles = [-10, 10];
    }
    if (enemyCount >= 400) {
      burstAngles = [-15, -10, 0, 10, 15];
    }
    if (enemyCount >= 1000 && enemyArr.length == 1) {
      burstAngles = [0];
    }
    for (let i = burstAngles.length - 1; i >= 0; --i) {
      let newBullet = new Bullet();
      /*
      newBullet.speed.y = burst[i];
      let d =
        newBullet.speed.y * newBullet.speed.y +
        newBullet.speed.x * newBullet.speed.x;
      console.log(d);
      let r = Math.sqrt((8 * 8) / d);
      console.log(r);
      newBullet.speed.y *= r;
      newBullet.speed.x *= r;
      */
      newBullet.radius = 5;
      newBullet.speed.y = Math.sin(degToRad(burstAngles[i])) * 8;
      newBullet.speed.x = Math.cos(degToRad(burstAngles[i])) * 8;

      newBullet.owner = "player";
      newBullet.coords.x = centerX + radius;
      newBullet.coords.y = centerY;
      newBullet.id = Math.random() * 31337;
      newBullet.color.r = Math.random() * 255;
      newBullet.color.g = Math.random() * 255;
      newBullet.color.b = Math.random() * 255;
      bullets.push(newBullet);
    }
    lastShotCounter = delayBetweenShotsFrames;
  }

  let indexEnemy = enemyArr.length - 1;

  while (indexEnemy >= 0) {
    let enamy = enemyArr[indexEnemy];
    if (enamy.entity == "boss") {
      enamy.bossHitAnimation(checkCollisionBullet);
    }
    if (enamy.coords.x < 0) {
      enemyArr.splice(indexEnemy, 1);
    } else {
      enamy.moveTick();
    }
    --indexEnemy;
  }
  if (lastEnemyCounter > 0) {
    --lastEnemyCounter;
  }

  let indexBullets = bullets.length - 1;

  while (indexBullets >= 0) {
    let bullet = bullets[indexBullets];
    if (bullet.isInWindow()) {
      bullets.splice(indexBullets, 1);
    } else {
      bullet.moveTick();
    }
    --indexBullets;
  }
  if (lastShotCounter > 0) {
    --lastShotCounter;
  }

  let indexBossBullets = bossBullets.length - 1;

  while (indexBossBullets >= 0) {
    let bullet = bossBullets[indexBossBullets];
    if (bullet.isInWindow()) {
      bossBullets.splice(indexBossBullets, 1);
    } else {
      bullet.moveTickRevers();
    }
    --indexBossBullets;
  }
  if (lastBossShotCounter > 0) {
    --lastBossShotCounter;
  }
};

const generateEvent = (key) => {
  switch (key) {
    case "100":
      changeColor = r.GREEN;
      delayBetweenEnemesFrames = 4;
      break;
    case "200":
      changeColor = r.YELLOW;
      delayBetweenEnemesFrames = 2;
      break;
    case "300":
      changeColor = r.BLUE;
      delayBetweenEnemesFrames = 0;
      break;
    case "400":
      changeColor.r = Math.random() * 255;
      changeColor.g = Math.random() * 255;
      changeColor.b = Math.random() * 255;
      defaultChaseEnemyGenerateValue = 0.1;
      break;
    case "1000":
      changeColor.r = Math.random() * 255;
      delayBetweenEnemesFrames = 0;
      break;
    default:
      delayBetweenEnemesFrames = 5;
      changeColor = r.RED;
      break;
  }
};

const startFiringBoss = () => {
  if (lastBossShotCounter <= 0) {
    let burstAngles = [0];
    for (let i = burstAngles.length - 1; i >= 0; --i) {
      let newBullet = new Bullet();
      newBullet.speed.y = Math.sin(degToRad(burstAngles[i])) * 8;
      newBullet.speed.x = Math.cos(degToRad(burstAngles[i])) * 8;
      newBullet.owner = "boss";
      newBullet.radius = 10;
      if (enemyArr[0].entity == "boss") {
        //Error !!!! Element will sliced on "480" and in next iteration here "347" be UNDEFINED
        newBullet.coords.x =
          enemyArr[0].coords.x - enemyArr[0].radius - newBullet.radius - 3;
        newBullet.coords.y = enemyArr[0].coords.y;

        newBullet.id = Math.random() * 31337;
        newBullet.color = r.YELLOW;
        bossBullets.push(newBullet);
      }
    }
    lastBossShotCounter = delayBetweenShotsFrames;
  }
};

const startGame = () => {
  controlObj();
  if (enemyCount >= 100) {
    generateEvent("100");
  }
  if (enemyCount >= 200) {
    generateEvent("200");
  }
  if (enemyCount >= 300) {
    generateEvent("300");
  }
  if (enemyCount >= 400) {
    generateEvent("400");
  }
  if (enemyCount >= 1000) {
    generateEvent("1000");
    generateEnemy("preStage");
    if (enemyArr.length == 0) {
      generateEnemy("Boss");
    } else {
      startFiringBoss();
    }
  } else {
    generateEnemy();
  }

  // generateEnemy("Boss");
  // startFiringBoss();
  checkCollisionBullet = false;
  checkCollisionEnemy = false;

  aaaa: for (let i = enemyArr.length - 1; i >= 0; i--) {
    for (let j = bullets.length - 1; j >= 0; j--) {
      checkCollisionBullet = r.CheckCollisionCircles(
        r.Vector2(bullets[j].coords.x, bullets[j].coords.y),
        blastRadius,
        r.Vector2(enemyArr[i].coords.x, enemyArr[i].coords.y),
        enemyArr[i].radius
      );

      if (checkCollisionBullet) {
        if (enemyArr[i].entity == "boss") {
          --enemyArr[i].bossHp;
          bullets.splice(j, 1);
          if (enemyArr[i].bossHp == 0) {
            enemyArr.splice(i, 1);
            gameOver = true;
            bossStatus = false;
            enemyCount++;
          }
          continue aaaa;
        }
        if (enemyArr[i].entity == "soldier") {
          enemyArr.splice(i, 1);
          bullets.splice(j, 1);
          enemyCount++;
          continue aaaa;
        }
      }
      // console.log(enemyArr[i].position.x, i);
    }
    //let c =
    //  squqared(abs(centerX - enemy.position.x)) +
    //    squqared(abs(centerY - enemy.position.y)) <
    //  squqared(radius + 15);
    // checkCollision |= c;
  }

  let checkCollisionBossBullet = false;
  bbbb: for (let i = bossBullets.length - 1; i >= 0; i--) {
    for (let j = bullets.length - 1; j >= 0; j--) {
      checkCollisionBossBullet = r.CheckCollisionCircles(
        r.Vector2(bullets[j].coords.x, bullets[j].coords.y),
        blastRadius,
        r.Vector2(bossBullets[i].coords.x, bossBullets[i].coords.y),
        bossBullets[i].radius
      );

      if (checkCollisionBossBullet) {
        bullets.splice(j, 1);
        bossBullets.splice(i, 1);
        continue bbbb;
      }
      // console.log(enemyArr[i].position.x, i);
    }
    //let c =
    //  squqared(abs(centerX - enemy.position.x)) +
    //    squqared(abs(centerY - enemy.position.y)) <
    //  squqared(radius + 15);
    // checkCollision |= c;
  }

  for (let i = 0; i < bossBullets.length; i++) {
    checkCollisionEnemy |= r.CheckCollisionCircles(
      r.Vector2(centerX, centerY),
      radius,
      r.Vector2(bossBullets[i].coords.x, bossBullets[i].coords.y),
      bossBullets[i].radius
    );
    if (checkCollisionEnemy) {
      break;
    }
  }

  for (let i = 0; i < enemyArr.length; i++) {
    checkCollisionEnemy |= r.CheckCollisionCircles(
      r.Vector2(centerX, centerY),
      radius,
      r.Vector2(enemyArr[i].coords.x, enemyArr[i].coords.y),
      enemyArr[i].radius
    );
    if (checkCollisionEnemy) {
      break;
    }
  }
  if (checkCollisionEnemy) {
    gameOver = true;
  }
  r.BeginDrawing();

  r.ClearBackground(r.GRAY);

  r.DrawCircleV(r.Vector2(centerX, centerY), radius, r.BLACK);

  bullets.forEach((bullet, i) => {
    r.DrawCircleV(bullet.coords, bullet.radius, bullet.color);
  });

  bossBullets.forEach((bullet, i) => {
    r.DrawCircleV(bullet.coords, bullet.radius, bullet.color);
  });

  enemyArr.forEach((enemy) => {
    r.DrawCircleV(enemy.coords, enemy.radius, enemy.color);
  });

  if (enemyCount >= 1000) {
    if (enemyArr.length == 1) {
      r.DrawText(
        `!!BOSS!! HP:${enemyArr[0].bossHp}`,
        screenWidth / 2.5,
        100,
        50,
        changeColor
      );
    }
  } else {
    r.DrawText(`Count: ${enemyCount}`, screenWidth / 2.5, 100, 50, changeColor);
  }

  r.EndDrawing();
};

// const squqared = (val) => {
//   return val * val;
// };

// const abs = (val) => {
//   return val > 0 ? val : -val;
// };

while (!r.WindowShouldClose()) {
  if (!gameOver) {
    startGame();
  } else {
    stopGame();
  }
}
r.CloseWindow();
