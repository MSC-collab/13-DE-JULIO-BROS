var requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

// CONFIGURÁ TUS IMÁGENES ACÁ
var GAME_SPRITES = [
  'sprites/player.png',
  'sprites/enemy.png',
  'sprites/tiles.png',
  'sprites/playerl.png',
  'sprites/items.png',
  'sprites/enemyr.png',
  'sprites/edificios_bg.png',
  'sprites/escuela_13_julio.png'
];

// Resolución lógica base del juego (NES)
var BASE_WIDTH = 256;
var BASE_HEIGHT = 240;

// Factor para achicar/agrandar la escena (ej. 0.75 a 1.0)
var ZOOM_FACTOR = 0.85;

// Posición en el mundo (en píxeles lógicos) de la escuela al final del nivel
var SCHOOL_WORLD_X = 3100; // Ajustá según dónde termine tu nivel
var SCHOOL_WORLD_Y = 112;  // Ej.: piso en y=208 menos 96px de alto de la imagen = 112

var canvas = document.createElement("canvas");
var ctx = canvas.getContext('2d');

var renderScale = 3;
var offsetX = 0;
var offsetY = 0;

function applyCanvasLayout() {
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.display = 'block';
  canvas.style.background = '#000';

  var winW = window.innerWidth;
  var winH = window.innerHeight;
  canvas.width = winW;
  canvas.height = winH;

  renderScale = Math.min(winW / BASE_WIDTH, winH / BASE_HEIGHT) * ZOOM_FACTOR;
  offsetX = (winW - BASE_WIDTH * renderScale) * 0.5;
  offsetY = (winH - BASE_HEIGHT * renderScale) * 0.5;
}

if (document.body) {
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#000';
  document.body.appendChild(canvas);
} else {
  window.addEventListener('DOMContentLoaded', function() {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#000';
    document.body.appendChild(canvas);
    applyCanvasLayout();
  });
}

window.addEventListener('resize', applyCanvasLayout);
applyCanvasLayout();

var updateables = [];
var fireballs = [];
var player = new Mario.Player([0, 0]);

// Viewport lógico
var vX = 0,
    vY = 0,
    vWidth = BASE_WIDTH,
    vHeight = BASE_HEIGHT;

resources.load(GAME_SPRITES);
resources.onReady(init);

var level;
var sounds;
var music;
var lastTime;
var gameTime = 0;

function init() {
  music = {
    overworld: new Audio('sounds/aboveground_bgm.ogg'),
    underground: new Audio('sounds/underground_bgm.ogg'),
    clear: new Audio('sounds/stage_clear.wav'),
    death: new Audio('sounds/mariodie.wav')
  };
  sounds = {
    smallJump: new Audio('sounds/jump-small.wav'),
    bigJump: new Audio('sounds/jump-super.wav'),
    breakBlock: new Audio('sounds/breakblock.wav'),
    bump: new Audio('sounds/bump.wav'),
    coin: new Audio('sounds/coin.wav'),
    fireball: new Audio('sounds/fireball.wav'),
    flagpole: new Audio('sounds/flagpole.wav'),
    kick: new Audio('sounds/kick.wav'),
    pipe: new Audio('sounds/pipe.wav'),
    itemAppear: new Audio('sounds/itemAppear.wav'),
    powerup: new Audio('sounds/powerup.wav'),
    stomp: new Audio('sounds/stomp.wav')
  };

  Mario.oneone();
  lastTime = Date.now();
  main();
}

function main() {
  var now = Date.now();
  var dt = Math.min((now - lastTime) / 1000.0, 0.05);

  update(dt);
  render();

  lastTime = now;
  requestAnimFrame(main);
}

function update(dt) {
  gameTime += dt;

  handleInput(dt);
  updateEntities(dt, gameTime);
  checkCollisions();
}

function handleInput(dt) {
  if (player.piping || player.dying || player.noInput) return;

  if (input.isDown('RUN')) {
    player.run();
  } else {
    player.noRun();
  }

  if (input.isDown('JUMP')) {
    player.jump();
  } else {
    player.noJump();
  }

  if (input.isDown('DOWN')) {
    player.crouch();
  } else {
    player.noCrouch();
  }

  if (input.isDown('LEFT')) {
    player.moveLeft();
  } else if (input.isDown('RIGHT')) {
    player.moveRight();
  } else {
    player.noWalk();
  }
}

function updateEntities(dt, gameTime) {
  if (player && typeof player.update === 'function') {
    player.update(dt, vX);
  }

  for (var i = 0; i < updateables.length; i++) {
    if (updateables[i] && typeof updateables[i].update === 'function') {
      updateables[i].update(dt, gameTime);
    }
  }

  if (!level) return;

  if (player.exiting) {
    if (player.pos[0] > vX + 96) {
      vX = player.pos[0] - 96;
    }
  } else if (level.scrolling && player.pos[0] > vX + 80) {
    vX = player.pos[0] - 80;
  }

  if (player.powering.length !== 0 || player.dying) return;

  if (Array.isArray(level.items)) {
    for (var j = 0; j < level.items.length; j++) {
      var item = level.items[j];
      if (item && typeof item.update === 'function') item.update(dt);
    }
  }

  if (Array.isArray(level.enemies)) {
    for (var k = 0; k < level.enemies.length; k++) {
      var enemy = level.enemies[k];
      if (enemy && typeof enemy.update === 'function') enemy.update(dt, vX);
    }
  }

  for (var f = 0; f < fireballs.length; f++) {
    if (fireballs[f] && typeof fireballs[f].update === 'function') {
      fireballs[f].update(dt);
    }
  }

  if (Array.isArray(level.pipes)) {
    for (var p = 0; p < level.pipes.length; p++) {
      if (level.pipes[p] && typeof level.pipes[p].update === 'function') {
        level.pipes[p].update(dt);
      }
    }
  }
}

function checkCollisions() {
  if (!level || player.powering.length !== 0 || player.dying) return;

  if (player && typeof player.checkCollisions === 'function') {
    player.checkCollisions();
  }

  if (Array.isArray(level.items)) {
    for (var i = 0; i < level.items.length; i++) {
      var item = level.items[i];
      if (item && typeof item.checkCollisions === 'function') item.checkCollisions();
    }
  }

  if (Array.isArray(level.enemies)) {
    for (var j = 0; j < level.enemies.length; j++) {
      var enemy = level.enemies[j];
      if (enemy && typeof enemy.checkCollisions === 'function') enemy.checkCollisions();
    }
  }

  for (var f = 0; f < fireballs.length; f++) {
    if (fireballs[f] && typeof fireballs[f].checkCollisions === 'function') {
      fireballs[f].checkCollisions();
    }
  }

  if (Array.isArray(level.pipes)) {
    for (var p = 0; p < level.pipes.length; p++) {
      if (level.pipes[p] && typeof level.pipes[p].checkCollisions === 'function') {
        level.pipes[p].checkCollisions();
      }
    }
  }
}

function renderBackgroundBuildings() {
  var bgImg = resources.get('sprites/edificios_bg.png');
  if (!bgImg || !bgImg.complete || !bgImg.naturalWidth || !bgImg.naturalHeight) {
    return;
  }

  var parallaxX = (vX || 0) * 0.5;
  var tileW = bgImg.naturalWidth;
  var tileH = BASE_HEIGHT;
  var startTile = Math.floor(parallaxX / tileW) - 1;
  var endTile = Math.ceil((parallaxX + BASE_WIDTH) / tileW) + 1;

  for (var t = startTile; t <= endTile; t++) {
    var drawX = Math.round(t * tileW - parallaxX);
    var drawY = Math.round(-(vY || 0));
    ctx.drawImage(bgImg, drawX, drawY, tileW, tileH);
  }
}

function renderFinalSchool() {
  var schoolImg = resources.get('sprites/escuela_13_julio.png');
  if (!schoolImg || !schoolImg.complete || !schoolImg.naturalWidth || !schoolImg.naturalHeight) {
    return;
  }

  var drawX = Math.round(SCHOOL_WORLD_X - (vX || 0));
  var drawY = Math.round(SCHOOL_WORLD_Y - (vY || 0));
  var w = schoolImg.naturalWidth;
  var h = schoolImg.naturalHeight;

  if (drawX + w >= 0 && drawX <= BASE_WIDTH && drawY + h >= 0 && drawY <= BASE_HEIGHT) {
    ctx.drawImage(schoolImg, drawX, drawY, w, h);
  }
}

function render() {
  updateables = [];

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.translate(offsetX, offsetY);
  ctx.scale(renderScale, renderScale);
  ctx.imageSmoothingEnabled = false;

  // Recorta estrictamente al área lógica del nivel para que nada se salga por los lados
  ctx.beginPath();
  ctx.rect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  ctx.clip();

  ctx.fillStyle = (level && level.background) ? level.background : '#5c94fc';
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  renderBackgroundBuildings();
  renderFinalSchool();

  if (!level) {
    ctx.restore();
    return;
  }

  var startCol = Math.max(0, Math.floor(vX / 16) - 1);
  var endCol = Math.floor(vX / 16) + 20;

  // Escenario de fondo
  if (Array.isArray(level.scenery)) {
    for (var i = 0; i < 15; i++) {
      if (!level.scenery[i]) continue;
      for (var j = startCol; j < endCol; j++) {
        if (level.scenery[i][j]) {
          renderEntity(level.scenery[i][j]);
        }
      }
    }
  }

  // Ítems
  if (Array.isArray(level.items)) {
    for (var it = 0; it < level.items.length; it++) {
      if (level.items[it]) renderEntity(level.items[it]);
    }
  }

  // Enemigos
  if (Array.isArray(level.enemies)) {
    for (var en = 0; en < level.enemies.length; en++) {
      if (level.enemies[en]) renderEntity(level.enemies[en]);
    }
  }

  // Bolas de fuego
  for (var fb = 0; fb < fireballs.length; fb++) {
    if (fireballs[fb]) renderEntity(fireballs[fb]);
  }

  // Estáticos y bloques
  for (var r = 0; r < 15; r++) {
    for (var c = startCol; c < endCol; c++) {
      if (level.statics && level.statics[r] && level.statics[r][c]) {
        renderEntity(level.statics[r][c]);
      }
      if (level.blocks && level.blocks[r] && level.blocks[r][c]) {
        renderEntity(level.blocks[r][c]);
        updateables.push(level.blocks[r][c]);
      }
    }
  }

  // Jugador
  if (player && player.invincibility % 2 === 0) {
    renderEntity(player);
  }

  // Tuberías al frente
  if (Array.isArray(level.pipes)) {
    for (var pi = 0; pi < level.pipes.length; pi++) {
      if (level.pipes[pi]) renderEntity(level.pipes[pi]);
    }
  }

  ctx.restore();
}

function renderEntity(entity) {
  if (entity && typeof entity.render === 'function') {
    entity.render(ctx, vX, vY);
  }
}