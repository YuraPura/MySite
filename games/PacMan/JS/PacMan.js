// Состояния игры: "prestart", "playing", "gameover"
let gameState = "prestart";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const mapSelect = document.getElementById("mapSelect");
const difficultySelect = document.getElementById("difficultySelect");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");

const cellSize = 20;
let gameInterval;
let gamePaused = false;
let score = 0;
let levelData = [];

// Pac-Man: теперь вместо health – lives (3 жизни)
let pacman = {
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  dirAngle: 0,
  lives: 3,
  poweredUp: false,
  powerTime: 0,
};

// Призраки – добавлено свойство edible; когда съедобны, будем рисовать их серыми
let ghosts = [];
let ghostStartPos = { x: 0, y: 0 }; // стартовая позиция для сброса призраков

let gameStartTime = 0; // для анимации

// Звуковые эффекты (файлы из папки sounds)
const eatSound = new Audio("sounds/eat.mp3");
const gameoverSound = new Audio("sounds/gameover.mp3");
const winSound = new Audio("sounds/win.mp3");
const bgm = new Audio("sounds/bgm.mp3");
bgm.loop = true;

// 10 карт (переработанные, с более открытой геометрией)
const maps = [
  [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.##### ## #####.######",
    "     #.##### ## #####.#     ",
    "     #.##          ##.#     ",
    "     #.##   ####   ##.#     ",
    "######.##   #  #   ##.######",
    "      .    #  #    .       ",
    "######.##   ####   ##.######",
    "     #.##          ##.#     ",
    "     #.## ######## ##.#     ",
    "     #.##          ##.#     ",
    "     #.## ######## ##.#     ",
    "######.## ######## ##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#.####.#####.##.#####.####.#",
    "#o..##................##..o#",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################",
  ],
  [
    "############################",
    "#............##............#",
    "#..........................#",
    "#............##............#",
    "#............##............#",
    "#..........................#",
    "###.####################.###",
    "   .####################.   ",
    "###.####################.###",
    "#............##............#",
    "#............##............#",
    "############################",
  ],
  [
    "############################",
    "#..........................#",
    "#..........................#",
    "#..........................#",
    "#............##............#",
    "#............##............#",
    "############################",
  ],
  [
    "############################",
    "#............##............#",
    "#.####.#######.#######.####.#",
    "#.####.#######.#######.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#..........................#",
    "############################",
  ],
  [
    "############################",
    "#............##............#",
    "#.####.#######.#######.####.#",
    "#o####.#######.#######.####o#",
    "#.####.#######.#######.####.#",
    "#..........................#",
    "############################",
  ],
  [
    "############################",
    "#..........................#",
    "#............##............#",
    "#..........................#",
    "############################",
  ],
  [
    "############################",
    "#............##............#",
    "#.####.####.##.####.####.#",
    "#..........................#",
    "#.####.####.##.####.####.#",
    "#............##............#",
    "############################",
  ],
  [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.#####.##.#####.####.#",
    "#............##............#",
    "############################",
  ],
  [
    "############################",
    "#............##............#",
    "#............##............#",
    "#..........................#",
    "############################",
  ],
  [
    "############################",
    "#.#.#.#.#.#.#.#.#.#.#.#.#.#",
    "#..........................#",
    "#.#.#.#.#.#.#.#.#.#.#.#.#.#",
    "############################",
  ],
];

// Функция для поиска стартовой позиции призраков (первая свободная клетка в верхней центральной области)
function findGhostStart() {
  const cols = levelData[0].length;
  for (let row = 1; row < levelData.length; row++) {
    if (levelData[row][Math.floor(cols / 2)] !== "#") {
      return { x: Math.floor(cols / 2), y: row };
    }
  }
  return { x: 1, y: 1 };
}

// Функция для поиска безопасной стартовой позиции для Pac‑Man (нижняя центральная область, на достаточном расстоянии от призраков)
function findPacmanStart(ghostStart) {
  const rows = levelData.length;
  const cols = levelData[0].length;
  for (let row = rows - 2; row >= 0; row--) {
    let col = Math.floor(cols / 2);
    if (
      levelData[row][col] !== "#" &&
      Math.abs(col - ghostStart.x) + Math.abs(row - ghostStart.y) > 4
    ) {
      return { x: col, y: row };
    }
  }
  return { x: 1, y: rows - 2 };
}

// Функция для обновления блока с сердечками (жизнями)
function updateLivesDisplay() {
  let hearts = "";
  for (let i = 0; i < pacman.lives; i++) {
    hearts += "❤️";
  }
  livesDisplay.innerText = "Lives: " + hearts;
}

// Сброс позиций Pac‑Man и призраков после получения урона
function resetPositions() {
  const ghostStart = findGhostStart();
  ghostStartPos = ghostStart;
  const pacPos = findPacmanStart(ghostStart);
  pacman.x = pacPos.x;
  pacman.y = pacPos.y;
  pacman.dx = 0;
  pacman.dy = 0;
  pacman.dirAngle = 0;
  // Сброс призраков
  ghosts.forEach((ghost, index) => {
    // Приводим их к стартовой области
    if (index === 0) {
      ghost.x = ghostStart.x;
      ghost.y = ghostStart.y;
    } else if (index === 1) {
      ghost.x = ghostStart.x + 1;
      ghost.y = ghostStart.y;
    } else if (index === 2) {
      ghost.x = ghostStart.x;
      ghost.y = ghostStart.y + 1;
    } else {
      ghost.x = ghostStart.x + 1;
      ghost.y = ghostStart.y + 1;
    }
    ghost.edible = false;
  });
}

// Инициализация игры: загрузка карты, установка размеров канваса и начальных позиций
function initGame() {
  score = 0;
  scoreDisplay.innerText = "Score: " + score;
  levelData = [];
  const mapIndex = parseInt(mapSelect.value);
  const mapLayout = maps[mapIndex];
  for (let row = 0; row < mapLayout.length; row++) {
    levelData[row] = mapLayout[row].split("");
  }
  canvas.width = levelData[0].length * cellSize;
  canvas.height = levelData.length * cellSize;

  const ghostStart = findGhostStart();
  ghostStartPos = ghostStart;
  const pacPos = findPacmanStart(ghostStart);
  pacman.x = pacPos.x;
  pacman.y = pacPos.y;
  pacman.dx = 0;
  pacman.dy = 0;
  pacman.dirAngle = 0;
  pacman.lives = 3;
  pacman.poweredUp = false;
  updateLivesDisplay();

  ghosts = [
    {
      x: ghostStart.x,
      y: ghostStart.y,
      color: "red",
      dx: 0,
      dy: 0,
      edible: false,
    },
    {
      x: ghostStart.x + 1,
      y: ghostStart.y,
      color: "pink",
      dx: 0,
      dy: 0,
      edible: false,
    },
    {
      x: ghostStart.x,
      y: ghostStart.y + 1,
      color: "cyan",
      dx: 0,
      dy: 0,
      edible: false,
    },
    {
      x: ghostStart.x + 1,
      y: ghostStart.y + 1,
      color: "orange",
      dx: 0,
      dy: 0,
      edible: false,
    },
  ];

  bgm.currentTime = 0;
  bgm.play();
  gameStartTime = performance.now();
}

// Отрисовка игры
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Если состояние "prestart" – проигрываем анимацию большого Pac‑Man
  if (gameState === "prestart") {
    // Анимированный Pac‑Man в центре, занимающий примерно четверть экрана (по диаметру)
    const pacSize = Math.min(canvas.width, canvas.height) / 2;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const timeElapsed = performance.now() - gameStartTime;
    const mouthAngle = 0.2 * Math.PI * Math.abs(Math.sin(timeElapsed / 150));
    let dirAngle = 0;
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(
      centerX,
      centerY,
      pacSize / 2,
      dirAngle + mouthAngle,
      dirAngle + 2 * Math.PI - mouthAngle,
      false
    );
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Press Start", centerX, centerY + pacSize / 2 + 30);
    return;
  }

  // Отрисовка карты
  for (let row = 0; row < levelData.length; row++) {
    for (let col = 0; col < levelData[row].length; col++) {
      const cell = levelData[row][col];
      const x = col * cellSize;
      const y = row * cellSize;
      if (cell === "#") {
        ctx.fillStyle = "blue";
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = "lightblue";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellSize, cellSize);
      } else if (cell === ".") {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, 3, 0, 2 * Math.PI);
        ctx.fill();
      } else if (cell === "o") {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "gray";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // Отрисовка Pac‑Man (анимация рта)
  const timeElapsed = performance.now() - gameStartTime;
  const mouthAngle = 0.2 * Math.PI * Math.abs(Math.sin(timeElapsed / 150));
  if (pacman.dx === 1) pacman.dirAngle = 0;
  else if (pacman.dx === -1) pacman.dirAngle = Math.PI;
  else if (pacman.dy === -1) pacman.dirAngle = -Math.PI / 2;
  else if (pacman.dy === 1) pacman.dirAngle = Math.PI / 2;
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.moveTo(
    pacman.x * cellSize + cellSize / 2,
    pacman.y * cellSize + cellSize / 2
  );
  ctx.arc(
    pacman.x * cellSize + cellSize / 2,
    pacman.y * cellSize + cellSize / 2,
    cellSize / 2,
    pacman.dirAngle + mouthAngle,
    pacman.dirAngle + 2 * Math.PI - mouthAngle,
    false
  );
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "orange";
  ctx.stroke();

  // Отрисовка призраков; если edible – рисуем их серыми, иначе их исходный цвет
  ghosts.forEach((ghost) => {
    ctx.save();
    const ghostColor = ghost.edible ? "gray" : ghost.color;
    ctx.fillStyle = ghostColor;
    ctx.beginPath();
    ctx.arc(
      ghost.x * cellSize + cellSize / 2,
      ghost.y * cellSize + cellSize / 2,
      cellSize / 2,
      Math.PI,
      0
    );
    ctx.lineTo(ghost.x * cellSize + cellSize, ghost.y * cellSize + cellSize);
    ctx.lineTo(ghost.x * cellSize, ghost.y * cellSize + cellSize);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.stroke();

    // Рисуем глазки
    const centerX = ghost.x * cellSize + cellSize / 2;
    const centerY = ghost.y * cellSize + cellSize / 2;
    const eyeOffsetX = cellSize / 4;
    const eyeOffsetY = cellSize / 4;
    const eyeRadius = 3;
    const pupilRadius = 1.5;
    // Левый глаз
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(
      centerX - eyeOffsetX,
      centerY - eyeOffsetY,
      eyeRadius,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.arc(
      centerX - eyeOffsetX,
      centerY - eyeOffsetY,
      pupilRadius,
      0,
      2 * Math.PI
    );
    ctx.fill();
    // Правый глаз
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(
      centerX + eyeOffsetX,
      centerY - eyeOffsetY,
      eyeRadius,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.arc(
      centerX + eyeOffsetX,
      centerY - eyeOffsetY,
      pupilRadius,
      0,
      2 * Math.PI
    );
    ctx.fill();

    ctx.restore();
  });
}

// Обновление логики игры
function updateGame() {
  if (gamePaused || gameState !== "playing") return;

  // Если усиление закончилось (8 секунд), сбрасываем его
  if (pacman.poweredUp && performance.now() - pacman.powerTime > 8000) {
    pacman.poweredUp = false;
    ghosts.forEach((ghost) => {
      ghost.edible = false;
    });
  }

  const nextX = pacman.x + pacman.dx;
  const nextY = pacman.y + pacman.dy;
  if (!isWall(nextX, nextY)) {
    pacman.x = nextX;
    pacman.y = nextY;
    // Поедание обычной точки
    if (levelData[pacman.y][pacman.x] === ".") {
      levelData[pacman.y][pacman.x] = " ";
      score += 10;
      scoreDisplay.innerText = "Score: " + score;
      eatSound.play();
    }
    // Поедание силовой таблетки – включение усиления
    if (levelData[pacman.y][pacman.x] === "o") {
      levelData[pacman.y][pacman.x] = " ";
      score += 50;
      scoreDisplay.innerText = "Score: " + score;
      eatSound.play();
      pacman.poweredUp = true;
      pacman.powerTime = performance.now();
      ghosts.forEach((ghost) => {
        ghost.edible = true;
      });
    }
  }

  // Обработка столкновений с призраками
  ghosts.forEach((ghost) => {
    chaseGhost(ghost);
    const nextGhostX = ghost.x + ghost.dx;
    const nextGhostY = ghost.y + ghost.dy;
    if (!isWall(nextGhostX, nextGhostY)) {
      ghost.x = nextGhostX;
      ghost.y = nextGhostY;
    }
    // Столкновение: если Pac‑Man силён и призрак edible, он съедается; иначе – потеря жизни
    if (ghost.x === pacman.x && ghost.y === pacman.y) {
      if (pacman.poweredUp && ghost.edible) {
        score += 200;
        scoreDisplay.innerText = "Score: " + score;
        eatSound.play();
        ghost.x = ghostStartPos.x;
        ghost.y = ghostStartPos.y;
        ghost.edible = false;
      } else {
        pacman.lives--;
        updateLivesDisplay();
        if (pacman.lives <= 0) {
          gameoverSound.play();
          alert("Game Over! Score: " + score);
          clearInterval(gameInterval);
          gameState = "gameover";
          bgm.pause();
        } else {
          // Если жизни остались, сбрасываем позиции
          resetPositions();
        }
      }
    }
  });
}

function isWall(x, y) {
  if (y < 0 || y >= levelData.length || x < 0 || x >= levelData[0].length)
    return true;
  return levelData[y][x] === "#";
}

// Для Pac‑Man игра не завершается сбором всех точек – игра идёт, пока есть жизни
function checkWin() {
  return false;
}

// Логика движения призраков с учетом уровня сложности
function chaseGhost(ghost) {
  let possibleDirections = [];
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  directions.forEach((dir) => {
    const newX = ghost.x + dir.dx;
    const newY = ghost.y + dir.dy;
    if (!isWall(newX, newY)) {
      const distance = Math.abs(pacman.x - newX) + Math.abs(pacman.y - newY);
      possibleDirections.push({ dir: dir, distance: distance });
    }
  });

  let difficulty = difficultySelect.value;
  let randomThreshold;
  switch (difficulty) {
    case "easy":
      randomThreshold = 0.8;
      break;
    case "hard":
      randomThreshold = 0.1;
      break;
    case "normal":
    default:
      randomThreshold = 0.2;
      break;
  }

  if (possibleDirections.length > 0) {
    possibleDirections.sort((a, b) => a.distance - b.distance);
    if (Math.random() < randomThreshold) {
      const randomDir =
        possibleDirections[
          Math.floor(Math.random() * possibleDirections.length)
        ].dir;
      ghost.dx = randomDir.dx;
      ghost.dy = randomDir.dy;
    } else {
      ghost.dx = possibleDirections[0].dir.dx;
      ghost.dy = possibleDirections[0].dir.dy;
    }
  } else {
    ghost.dx = 0;
    ghost.dy = 0;
  }
}

function gameLoop() {
  updateGame();
  drawGame();
}

function startGame() {
  initGame();
  gameState = "playing";
  if (gameInterval) clearInterval(gameInterval);
  gamePaused = false;
  pauseBtn.innerText = "Пауза";
  gameInterval = setInterval(gameLoop, 150);
}

function togglePause() {
  gamePaused = !gamePaused;
  pauseBtn.innerText = gamePaused ? "Продолжить" : "Пауза";
  if (!gamePaused) gameLoop();
}

document.addEventListener("keydown", function (e) {
  if (gameState !== "playing") return;
  if (e.key === "ArrowLeft") {
    pacman.dx = -1;
    pacman.dy = 0;
  } else if (e.key === "ArrowRight") {
    pacman.dx = 1;
    pacman.dy = 0;
  } else if (e.key === "ArrowUp") {
    pacman.dx = 0;
    pacman.dy = -1;
  } else if (e.key === "ArrowDown") {
    pacman.dx = 0;
    pacman.dy = 1;
  } else if (e.key === "p" || e.key === "P") {
    togglePause();
  }
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

function drawLoop() {
  drawGame();
  requestAnimationFrame(drawLoop);
}
drawLoop();