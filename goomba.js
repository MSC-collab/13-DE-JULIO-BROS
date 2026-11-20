(function() {
  if (typeof Mario === 'undefined')
    window.Mario = {};

  var Goomba = Mario.Goomba = function(pos, sprite) {
    this.dying = false;
    Mario.Entity.call(this, {
      pos: pos,
      sprite: sprite,
      hitbox: [4, 1, 16, 23]
    });
    if (this.sprite) {
      this.sprite.img = 'sprites/enemy.png';
      if (typeof this.sprite.toolIndex !== 'number') {
        this.sprite.toolIndex = Math.floor(Math.random() * 12);
      }
      this.sprite.size[0] = 24;
      this.sprite.size[1] = 24;
      this.sprite.speed = 0;
    }
    this.vel[0] = -0.5;
    this.idx = level.enemies.length;
  };

  Mario.Util.inherits(Goomba, Mario.Entity);

  Goomba.prototype.render = function(ctx, vX, vY) {
    if (!this.sprite) return;
    this.sprite.img = 'sprites/enemy.png';
    if (typeof this.sprite.toolIndex !== 'number') {
      this.sprite.toolIndex = Math.floor(Math.random() * 12);
    }
    this.sprite.size[0] = 24;
    this.sprite.size[1] = 24;
    this.sprite.speed = 0;
    var flip = this.vel[0] > 0;
    this.sprite.render(ctx, this.pos[0], this.pos[1], vX, vY, flip);
  };

  Goomba.prototype.update = function(dt, vX) {
    if (this.pos[0] - vX > 400) {
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
    this.acc[1] = 0.2;
    this.vel[1] += this.acc[1];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    if (this.sprite) this.sprite.update(dt);
  };

  Goomba.prototype.collideWall = function(wall) {
    if (wall) {
      Mario.Entity.prototype.collideWall.call(this, wall);
    }
    this.vel[0] = -this.vel[0];
  };

  Goomba.prototype.checkCollisions = function() {
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

  Goomba.prototype.isCollideWith = function(ent) {
    if (ent instanceof Mario.Player && (this.dying || ent.invincibility)) {
      return;
    }

    var hpos1 = [this.pos[0] + this.hitbox[0], this.pos[1] + this.hitbox[1]];
    var hpos2 = [ent.pos[0] + ent.hitbox[0], ent.pos[1] + ent.hitbox[1]];

    if (!(hpos1[0] > hpos2[0]+ent.hitbox[2] || (hpos1[0]+this.hitbox[2] < hpos2[0]))) {
      if (!(hpos1[1] > hpos2[1]+ent.hitbox[3] || (hpos1[1]+this.hitbox[3] < hpos2[1]))) {
        if (ent instanceof Mario.Player) {
          if (ent.vel[1] > 0) {
            this.stomp();
          } else if (ent.starTime) {
            this.bump();
          } else {
            ent.damage();
          }
        } else {
          this.collideWall(ent);
        }
      }
    }
  };

  Goomba.prototype.stomp = function() {
    sounds.stomp.play();
    player.bounce = true;
    if (this.sprite) this.sprite.speed = 0;
    this.vel[0] = 0;
    this.dying = 10;
  };

  Goomba.prototype.bump = function() {
    sounds.kick.play();
    this.flipping = true;
    this.pos[1] -= 1;
    this.vel[0] = 0;
    this.vel[1] = -2.5;
  };
})();