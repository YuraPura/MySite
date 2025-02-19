// Глобальные переменные
let animationId = null;
let gameRunning = false;
let dropInterval = 1000; // Значение выбирается из меню сложности
let lastTime = 0;
let dropCounter = 0;
let nextPieceMatrix = null; // Для предпросмотра следующей фигуры
let pause = false;

// Настройка основного холста
const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const scale = 20;
context.scale(scale, scale);

// Элементы интерфейса
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const menuOverlay = document.getElementById("menu-overlay");
const difficultySelect = document.getElementById("difficulty");
const startBtn = document.getElementById("start-btn");

// Холст для предпросмотра следующей фигуры
const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");
const previewScale = 20;

// Создание арены (игрового поля)
function createMatrix(width, height) {
  const matrix = [];
  for (let i = 0; i < height; i++) {
    matrix.push(new Array(width).fill(0));
  }
  return matrix;
}
const arena = createMatrix(12, 20);

// Функция создания фигур
function createPiece(type) {
  if (type === "T") {
    return [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ];
  } else if (type === "O") {
    return [
      [2, 2],
      [2, 2],
    ];
  } else if (type === "L") {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3],
    ];
  } else if (type === "J") {
    return [
      [0, 4, 0],
      [0, 4, 0],
      [4, 4, 0],
    ];
  } else if (type === "I") {
    return [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
    ];
  } else if (type === "S") {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
  } else if (type === "Z") {
    return [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ];
  }
}

// Цвета фигур
const pieceColors = [
  null,
  "#800080", // T – фиолетовый
  "#FFD700", // O – золотой
  "#FFA500", // L – оранжевый
  "#00BFFF", // J – голубой
  "#00FFFF", // I – голубой (cyan)
  "#00FF00", // S – зелёный
  "#FF0000", // Z – красный
];

// Отрисовка матрицы на основном холсте
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = "#F39C0C"; // Рисуем тень
        context.fillRect(x + offset.x + 0.1, y + offset.y + 0.1, 0.8, 0.8);

        context.fillStyle = pieceColors[value]; // Рисуем сам блок
        context.fillRect(x + offset.x + 0.1, y + offset.y + 0.1, 0.8, 0.8);
      }
    });
  });
}

// Отрисовка ghost-фигуры (куда опустится фигура)
function drawGhost() {
  const ghostPos = { x: player.pos.x, y: player.pos.y };
  while (
    !collide(arena, {
      matrix: player.matrix,
      pos: { x: ghostPos.x, y: ghostPos.y + 1 },
    })
  ) {
    ghostPos.y++;
  }
  context.globalAlpha = 0.3;
  drawMatrix(player.matrix, ghostPos);
  context.globalAlpha = 1;
}

// Отрисовка всей игровой сцены
function draw() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
  drawMatrix(arena, { x: 0, y: 0 });
  drawGhost();
  drawMatrix(player.matrix, player.pos);
}

// Отрисовка следующей фигуры в окне предпросмотра
function drawNextPiece() {
  nextContext.fillStyle = "#000";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  const piece = nextPieceMatrix;
  const rows = piece.length;
  const cols = piece[0].length;
  const previewWidth = nextCanvas.width / previewScale;
  const previewHeight = nextCanvas.height / previewScale;
  const offsetX = Math.floor((previewWidth - cols) / 2);
  const offsetY = Math.floor((previewHeight - rows) / 2);
  piece.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        nextContext.fillStyle = pieceColors[value];
        nextContext.fillRect(
          (x + offsetX + 0.1) * previewScale,
          (y + offsetX + 0.1) * previewScale,
          16,
          16
        );
      }
    });
  });
}

// Проверка столкновений
function collide(arena, playerObj) {
  const m = playerObj.matrix;
  const o = playerObj.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] !== 0 && (!arena[y + o.y] || arena[y + o.y][x + o.x] !== 0)) {
        return true;
      }
    }
  }
  return false;
}

// Слияние фигуры с ареной
function merge(arena, playerObj) {
  playerObj.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + playerObj.pos.y][x + playerObj.pos.x] = value;
      }
    });
  });
}

// Удаление заполненных строк, начисление очков и повышение уровня
function arenaSweep() {
  let rowCount = 1;
  for (let y = arena.length - 1; y >= 0; y--) {
    if (arena[y].every((value) => value !== 0)) {
      const row = arena.splice(y, 1)[0].fill(0);
      arena.unshift(row);
      player.score += rowCount * 10;
      player.lines++;
      rowCount *= 2;
      y++;
    }
  }
  const newLevel = Math.floor(player.lines / 10) + 1;
  if (newLevel > player.level) {
    player.level = newLevel;
    dropInterval = Math.max(100, dropInterval - 100);
    updateLevel();
  }
}

// Поворот матрицы
function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

// Объект игрока
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
  lines: 0,
  level: 1,
};

let pieces = "TOLJISZ";
let lastPiece = null;

function randomPiece() {
  let filteredPieces = pieces.split("").filter((p) => p !== lastPiece); // Исключаем последнюю фигуру
  let type = filteredPieces[Math.floor(Math.random() * filteredPieces.length)]; // Случайный выбор

  lastPiece = type; // Запоминаем последнюю фигуру
  return createPiece(type);
}

// Сброс фигуры (используем nextPieceMatrix для предпросмотра)
function playerReset() {
  if (!nextPieceMatrix) {
    nextPieceMatrix = randomPiece();
  }
  player.matrix = nextPieceMatrix;
  nextPieceMatrix = randomPiece();
  drawNextPiece();
  player.pos.y = 0;
  player.pos.x =
    Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
  if (collide(arena, player)) {
    arena.forEach((row) => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    dropInterval = parseInt(difficultySelect.value);
    updateScore();
    updateLevel();
    stopGame();
  }
}

// Опускание фигуры на 1 ряд
function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

// Hard drop (мгновенное падение, пробел)
function playerHardDrop() {
  while (
    !collide(arena, {
      matrix: player.matrix,
      pos: { x: player.pos.x, y: player.pos.y + 1 },
    })
  ) {
    player.pos.y++;
  }
  merge(arena, player);
  playerReset();
  arenaSweep();
  updateScore();
  dropCounter = 0;
}

// Передвижение фигуры влево/вправо
function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

// Поворот фигуры
function playerRotate() {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, 1);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > player.matrix[0].length) {
      rotate(player.matrix, -1);
      player.pos.x = pos;
      return;
    }
  }
}

// Игровой цикл
function update(time = 0) {
  if (!gameRunning) return;

  if (!pause) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      playerDrop();
    }
    draw();
    animationId = requestAnimationFrame(update); // Продолжаем обновление
  }
}

// Обновление интерфейса
function updateScore() {
  scoreElement.innerText = player.score;
}
function updateLevel() {
  levelElement.innerText = player.level;
}

// Обработка нажатий клавиш (для ПК)
document.addEventListener("keydown", (event) => {
  if (!gameRunning) return;

  switch (event.keyCode) {
    case 37: // Влево
      if (!pause) playerMove(-1);
      break;
    case 39: // Вправо
      if (!pause) playerMove(1);
      break;
    case 40: // Вниз
      if (!pause) playerDrop();
      break;
    case 38: // Вверх – поворот
      if (!pause) playerRotate();
      break;
    case 32: // Пробел – hard drop
      if (!pause) playerHardDrop();
      break;
    case 27: // ESC – пауза/возобновление
      pause = !pause;
      if (!pause) {
        lastTime = performance.now(); // Обновляем тайминг, чтобы не было скачка
        update(); // Перезапускаем анимацию
      }
      break;
  }
});

// Кнопка "Старт" в меню
startBtn.addEventListener("click", () => {
  dropInterval = parseInt(difficultySelect.value);
  arena.forEach((row) => row.fill(0));
  player.score = 0;
  player.lines = 0;
  player.level = 1;
  updateScore();
  updateLevel();
  playerReset();
  menuOverlay.style.display = "none";
  gameRunning = true;
  lastTime = 0;
  dropCounter = 0;
  update();
});

function stopGame() {
  gameRunning = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  menuOverlay.style.display = "flex";
}

// Обработка нажатий на мобильных кнопках
function initMobileControls() {
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const downBtn = document.getElementById("down-btn");
  const rotateBtn = document.getElementById("rotate-btn");
  const harddropBtn = document.getElementById("harddrop-btn");

  leftBtn.addEventListener("click", () => {
    if (gameRunning) playerMove(-1);
  });
  rightBtn.addEventListener("click", () => {
    if (gameRunning) playerMove(1);
  });
  downBtn.addEventListener("click", () => {
    if (gameRunning) playerDrop();
  });
  rotateBtn.addEventListener("click", () => {
    if (gameRunning) playerRotate();
  });
  harddropBtn.addEventListener("click", () => {
    if (gameRunning) playerHardDrop();
  });

  // Показываем блок мобильных кнопок, если устройство поддерживает touch
  if ("ontouchstart" in window) {
    document.getElementById("mobile-controls").style.display = "block";
  }
}

// Инициализируем мобильное управление
initMobileControls();