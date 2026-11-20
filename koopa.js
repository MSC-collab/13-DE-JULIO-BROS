(function() {
  if (typeof Mario === 'undefined')
    window.Mario = {};

  var KOOPA_HITBOX = [4, 1, 16, 23];

  function applyToolSprite(koopa, sprite, keepExistingTool) {
    if (!sprite) return;
    var prevTool = keepExistingTool && typeof koopa.toolIndex === 'number'
      ? koopa.toolIndex
      : (typeof sprite.toolIndex === 'number' ? sprite.toolIndex : Math.floor(Math.random() * 12));
    koopa.toolIndex = prevTool;
    sprite.img = 'sprites/enemy.png';
    sprite.toolIndex = prevTool;
    sprite.pos = [0, 0];
    sprite.size[0] = 24;
    sprite.size[1] = 24;
    sprite.speed = 0;
  }

  var Koopa = Mario.Koopa = function(pos, sprite, para) {
    this.dying = false;
    this.shell = false;
    this.toolIndex = null;

    this.para = para;

    Mario.Entity.call(this, {
      pos: pos,
      sprite: sprite,
      hitbox: KOOPA_HITBOX.slice()
    });
    applyToolSprite(this, this.sprite, false);
    this.vel[0] = -0.5;
    this.idx = level.enemies.length;
  };

  Mario.Util.inherits(Koopa, Mario.Entity);

  Koopa.prototype.render = function(ctx, vX, vY) {
    if (!this.sprite) return;
    applyToolSprite(this, this.sprite, true);
    var flip = !this.left;
    this.sprite.render(ctx, this.pos[0], this.pos[1], vX, vY, flip);
  };

  Koopa.prototype.update = function(dt, vX) {
    if (this.turn) {
      this.vel[0] = -this.vel[0];
      if (this.shell) sounds.bump.play();
      this.turn = false;
    }
    if (this.vel[0] != 0) {
      this.left = (this.vel[0] < 0);
    }

    if (this.pos[0] - vX > 336) {
      return;
    } else if (this.pos[0] - vX < -32) {
      delete level.enemies[this.idx];
      return;
    }

    if (this.dying) {
      this.dying -= 1;
      if (!this.dying) {
        delete level.enemies[this.idx];
        return;
      }
    }

    if (this.shell) {
      if (this.vel[0] == 0) {
        this.shell -= 1;
        if (!this.shell) {
          this.shell = false;
          this.sprite = level.koopaSprite();
          applyToolSprite(this, this.sprite, true);
          this.hitbox = KOOPA_HITBOX.slice();
          if (this.left) {
            this.vel[0] = 0.5;
            this.left = false;
          } else {
            this.vel[0] = -0.5;
            this.left = true;
          }
        }
      } else {
        this.shell = 360;
        if (this.sprite) this.sprite.speed = 0;
      }
    }

    applyToolSprite(this, this.sprite, true);

    this.acc[1] = 0.2;
    this.vel[1] += this.acc[1];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    if (this.sprite) this.sprite.update(dt);
  };

  Koopa.prototype.collideWall = function(wall) {
    if (wall) {
      Mario.Entity.prototype.collideWall.call(this, wall);
    }
    this.turn = true;
  };

  Koopa.prototype.checkCollisions = function() {
    if (this.flipping) {
      return;
    }

    var h = this.pos[1] % 16 === 0 ? 2 : 3;
    var w = this.pos[0] % 16 === 0 ? 2 : 3;

    var baseX = Math.floor(this.pos[0] / 16);
    var baseY = Math.floor(this.pos[1] / 16);

    if (baseY > 14) {
      delete level.enemies[this.idx];
      return;
    }

    for (var i = 0; i < h; i++) {
      var row = baseY + i;
      if (row < 0 || row >= 15) continue;
      for (var j = 0; j < w; j++) {
        var col = baseX + j;
        if (col < 0) continue;
        if (level.statics[row] && level.statics[row][col]) {
          level.statics[row][col].isCollideWith(this);
        }
        if (level.blocks[row] && level.blocks[row][col]) {
          level.blocks[row][col].isCollideWith(this);
        }
      }
    }
    var that = this;
    level.enemies.forEach(function(enemy){
      if (!enemy || enemy === that) {
        return;
      } else {
        that.isCollideWith(enemy);
      }
    });
    this.isCollideWith(player);
  };

  Koopa.prototype.isCollideWith = function(ent) {
    if (ent instanceof Mario.Player && (this.dying || ent.invincibility)) {
      return;
    }

    var hpos1 = [this.pos[0] + this.hitbox[0], this.pos[1] + this.hitbox[1]];
    var hpos2 = [ent.pos[0] + ent.hitbox[0], ent.pos[1] + ent.hitbox[1]];

    if (!(hpos1[0] > hpos2[0]+ent.hitbox[2] || (hpos1[0]+this.hitbox[2] < hpos2[0]))) {
      if (!(hpos1[1] > hpos2[1]+ent.hitbox[3] || (hpos1[1]+this.hitbox[3] < hpos2[1]))) {
        if (ent instanceof Mario.Player) {
          if (ent.vel[1] > 0) {
            player.bounce = true;
          }
          if (this.shell) {
            sounds.kick.play();
            if (this.vel[0] === 0) {
              if (ent.left) {
                this.vel[0] = -4;
              } else {
                this.vel[0] = 4;
              }
            } else {
              if (ent.bounce) {
                this.vel[0] = 0;
              } else ent.damage();
            }
          } else if (ent.vel[1] > 0) {
            this.stomp();
          } else {
            ent.damage();
          }
        } else {
          if (this.shell && (ent instanceof Mario.Goomba)) {
            ent.bump();
          } else this.collideWall(ent);
        }
      }
    }
  };

  Koopa.prototype.stomp = function() {
    player.bounce = true;
    if (this.para) {
      this.para = false;
      if (this.sprite) this.sprite.pos = [0, 0];
    } else {
      sounds.stomp.play();
      this.shell = 360;
      if (this.sprite) this.sprite.speed = 0;
      this.vel = [0, 0];
    }
  };

  Koopa.prototype.bump = function() {
    sounds.kick.play();
    if (this.flipping) return;
    this.flipping = true;
    applyToolSprite(this, this.sprite, true);
    this.hitbox = KOOPA_HITBOX.slice();
    this.vel[0] = 0;
    this.vel[1] = -2.5;
  };
})();