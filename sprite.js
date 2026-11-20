(function() {
  if (typeof Mario === 'undefined')
    window.Mario = {};

  var Sprite = Mario.Sprite = function(img, pos, size, speed, frames, once) {
    this.pos = pos || [0, 0];
    this.size = size || [16, 16];
    this.speed = speed || 0;
    this._index = 0;
    this.img = img;
    this.once = !!once;
    this.frames = frames || [0];
    this.done = false;
    this.toolIndex = null;
  };

  Sprite.prototype.update = function(dt, gameTime) {
    if (gameTime && gameTime === this.lastUpdated) return;
    if (this.speed > 0) {
      this._index += this.speed * dt;
    }
    if (gameTime) this.lastUpdated = gameTime;
  };

  Sprite.prototype.setFrame = function(frame) {
    this._index = frame;
  };

  Sprite.prototype.render = function(ctx, posx, posy, vX, vY, flipX) {
    var img = resources.get(this.img);
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return;

    var sx, sy, sw, sh, dw, dh;

    if (typeof this.toolIndex === 'number' && this.toolIndex >= 0) {
      var cols = 4;
      var rows = 3;
      var idx = Math.floor(this.toolIndex) % (cols * rows);
      var col = idx % cols;
      var row = Math.floor(idx / cols);

      sw = img.naturalWidth / cols;
      sh = img.naturalHeight / rows;
      sx = col * sw;
      sy = row * sh;

      dw = (this.size && this.size[0]) || 24;
      dh = (this.size && this.size[1]) || 24;
    } else {
      var frame = 0;
      if (this.speed > 0 && this.frames && this.frames.length > 0) {
        var max = this.frames.length;
        var fIdx = Math.floor(this._index);
        if (this.once && fIdx >= max) {
          this.done = true;
          return;
        }
        frame = this.frames[fIdx % max];
      }

      sx = this.pos[0] + frame * this.size[0];
      sy = this.pos[1];
      sw = this.size[0];
      sh = this.size[1];
      dw = sw;
      dh = sh;
    }

    var dx = Math.round(posx - (vX || 0));
    var dy = Math.round(posy - (vY || 0));

    ctx.save();
    if (flipX) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    ctx.restore();
  };
})();