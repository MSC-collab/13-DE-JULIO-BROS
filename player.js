(function() {
	if (typeof Mario === 'undefined')
		window.Mario = {};

	var SPRITE_SIZE = [32, 32];
	var PLAYER_HITBOX = [0, 0, 16, 16];

	var Player = Mario.Player = function(pos) {
		this.power = 0;
		this.coins = 0;
		this.powering = [];
		this.bounce = false;
		this.jumping = 0;
		this.canJump = true;
		this.invincibility = 0;
		this.crouching = false;
		this.fireballs = 0;
		this.runheld = false;
		this.noInput = false;
		this.targetPos = [];

		Mario.Entity.call(this, {
			pos: pos,
			sprite: new Mario.Sprite('sprites/player.png', [0, 0], SPRITE_SIZE, 0),
			hitbox: PLAYER_HITBOX.slice()
		});
	};

	Mario.Util.inherits(Player, Mario.Entity);

	Player.prototype.run = function() {
		this.maxSpeed = 2.5;
		if (this.power == 2 && !this.runheld) {
			this.shoot();
		}
		this.runheld = true;
	};

	Player.prototype.shoot = function() {
		if (this.fireballs >= 2) return;
		this.fireballs += 1;
		var fb = new Mario.Fireball([this.pos[0] + 8, this.pos[1]]);
		fb.spawn(this.left);
		this.shooting = 2;
	};

	Player.prototype.noRun = function() {
		this.maxSpeed = 1.5;
		this.moveAcc = 0.07;
		this.runheld = false;
	};

	Player.prototype.moveRight = function() {
		if (this.vel[1] === 0 && this.standing) {
			if (this.crouching) {
				this.noWalk();
				return;
			}
			this.acc[0] = this.moveAcc;
			this.left = false;
		} else {
			this.acc[0] = this.moveAcc;
		}
	};

	Player.prototype.moveLeft = function() {
		if (this.vel[1] === 0 && this.standing) {
			if (this.crouching) {
				this.noWalk();
				return;
			}
			this.acc[0] = -this.moveAcc;
			this.left = true;
		} else {
			this.acc[0] = -this.moveAcc;
		}
	};

	Player.prototype.noWalk = function() {
		this.maxSpeed = 0;
		if (this.vel[0] === 0) return;

		if (Math.abs(this.vel[0]) <= 0.1) {
			this.vel[0] = 0;
			this.acc[0] = 0;
		}
	};

	Player.prototype.crouch = function() {
		if (this.power === 0) {
			this.crouching = false;
			return;
		}

		if (this.standing) this.crouching = true;
	};

	Player.prototype.noCrouch = function() {
		this.crouching = false;
	};

	Player.prototype.jump = function() {
		if (this.vel[1] > 0) {
			return;
		}
		if (this.jumping) {
			this.jumping -= 1;
		} else if (this.standing && this.canJump) {
			this.jumping = 20;
			this.canJump = false;
			this.standing = false;
			this.vel[1] = -6;
			if (this.power === 0) {
				sounds.smallJump.currentTime = 0;
				sounds.smallJump.play();
			} else {
				sounds.bigJump.currentTime = 0;
				sounds.bigJump.play();
			}
		}
	};

	Player.prototype.noJump = function() {
		this.canJump = true;
		if (this.jumping) {
			if (this.jumping <= 16) {
				this.vel[1] = 0;
				this.jumping = 0;
			} else this.jumping -= 1;
		}
	};

	Player.prototype.setAnimation = function() {
		if (this.dying) return;

		this.sprite.size = SPRITE_SIZE.slice();
		this.sprite.pos[1] = 0;

		if (this.jumping) {
			this.sprite.pos[0] = 0;
			this.sprite.speed = 0;
		} else if (this.standing) {
			if (Math.abs(this.vel[0]) > 0.1) {
				this.sprite.pos[0] = 0;
				this.sprite.frames = [0, 1, 2];
				this.sprite.speed = Math.max(4, Math.abs(this.vel[0]) * 6);
			} else {
				this.sprite.pos[0] = 0;
				this.sprite.speed = 0;
			}
			if (this.shooting) {
				this.shooting -= 1;
			}
		}

		if (this.flagging) {
			this.sprite.pos[0] = 0;
			this.sprite.frames = [0, 1];
			this.sprite.speed = 8;
			if (this.vel[1] === 0) this.sprite.frames = [0];
		}

		this.sprite.img = 'sprites/player.png';
	};

	Player.prototype.update = function(dt, vX) {
		if (this.powering.length !== 0) {
			var next = this.powering.shift();
			if (next == 5) return;
			this.sprite.size = SPRITE_SIZE.slice();
			if (this.powering.length === 0) {
				delete level.items[this.touchedItem];
			}
			return;
		}

		if (this.invincibility) {
			this.invincibility -= Math.round(dt * 60);
		}

		if (this.waiting) {
			this.waiting -= dt;
			if (this.waiting <= 0) {
				this.waiting = 0;
			} else return;
		}

		if (this.bounce) {
			this.bounce = false;
			this.standing = false;
			this.vel[1] = -3;
		}

		if (this.pos[0] <= vX) {
			this.pos[0] = vX;
			this.vel[0] = Math.max(this.vel[0], 0);
		}

		if (Math.abs(this.vel[0]) > this.maxSpeed) {
			this.vel[0] -= 0.05 * this.vel[0] / Math.abs(this.vel[0]);
			this.acc[0] = 0;
		}

		if (this.dying) {
			if (this.pos[1] < this.targetPos[1]) {
				this.vel[1] = 1;
			}
			this.dying -= 1 * dt;
			if (this.dying <= 0) {
				player = new Mario.Player(level.playerPos);
				level.loader.call();
				input.reset();
			}
		} else {
			this.acc[1] = 0.25;
			if (this.pos[1] > 240) {
				this.die();
			}
		}

		if (this.piping) {
			this.acc = [0, 0];
			var pos = [Math.round(this.pos[0]), Math.round(this.pos[1])];
			if (pos[0] === this.targetPos[0] && pos[1] === this.targetPos[1]) {
				this.piping = false;
				this.pipeLoc.call();
			}
		}

		if (this.flagging) {
			this.acc = [0, 0];
		}

		if (this.exiting) {
			this.left = false;
			this.flagging = false;
			this.vel[0] = 1.5;
			if (this.pos[0] >= this.targetPos[0]) {
				this.sprite.size = [0, 0];
				this.vel = [0, 0];
				window.setTimeout(function() {
					player.sprite.size = SPRITE_SIZE.slice();
					player.exiting = false;
					player.noInput = false;
					level.loader();
					music.overworld.currentTime = 0;
				}, 5000);
			}
		}

		this.vel[0] += this.acc[0];
		this.vel[1] += this.acc[1];
		this.pos[0] += this.vel[0];
		this.pos[1] += this.vel[1];

		this.setAnimation();
		this.sprite.update(dt);
	};

	Player.prototype.render = function(ctx, vX, vY) {
		if (this.hidden) return;
		var drawX = this.left ? this.pos[0] : this.pos[0] - 12;
		this.sprite.render(ctx, drawX, this.pos[1] - 16, vX, vY, this.left);
	};

	Player.prototype.checkCollisions = function() {
		if (this.piping || this.dying) return;
		var h = this.power > 0 ? 3 : 2;
		var w = 2;
		var baseX = Math.floor(this.pos[0] / 16);
		var baseY = Math.floor(this.pos[1] / 16);

		for (var i = -1; i < h; i++) {
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
	};

	Player.prototype.powerUp = function(idx) {
		sounds.powerup.play();
		this.powering = [0, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 3, 5, 1, 5, 2, 5, 3, 5, 1, 5, 4];
		this.touchedItem = idx;

		if (this.power === 0) {
			this.power = 1;
			this.hitbox = PLAYER_HITBOX.slice();
		} else if (this.power == 1) {
			this.power = 2;
		} else {
			this.powering = [];
			delete level.items[idx];
		}
	};

	Player.prototype.damage = function() {
		if (this.power === 0) {
			this.die();
		} else {
			sounds.pipe.play();
			this.powering = [0, 5, 1, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 3];
			this.invincibility = 120;
			this.power = 0;
			this.hitbox = PLAYER_HITBOX.slice();
		}
	};

	Player.prototype.die = function() {
		music.overworld.pause();
		music.underground.pause();
		music.overworld.currentTime = 0;
		music.death.play();
		this.noWalk();
		this.noRun();
		this.noJump();

		this.acc[0] = 0;
		this.sprite.pos = [0, 0];
		this.sprite.speed = 0;
		this.power = 0;
		this.waiting = 0.5;
		this.dying = 2;

		if (this.pos[1] < 240) {
			this.targetPos = [this.pos[0], this.pos[1] - 128];
			this.vel = [0, -5];
		} else {
			this.vel = [0, 0];
			this.targetPos = [this.pos[0], this.pos[1] - 16];
		}
	};

	Player.prototype.star = function(idx) {
		delete level.items[idx];
		this.starTime = 660;
	};

	Player.prototype.pipe = function(direction, destination) {
		sounds.pipe.play();
		this.piping = true;
		this.pipeLoc = destination;
		switch (direction) {
			case "LEFT":
				this.vel = [-1, 0];
				this.targetPos = [Math.round(this.pos[0] - 16), Math.round(this.pos[1])];
				break;
			case "RIGHT":
				this.vel = [1, 0];
				this.targetPos = [Math.round(this.pos[0] + 16), Math.round(this.pos[1])];
				break;
			case "DOWN":
				this.vel = [0, 1];
				this.targetPos = [Math.round(this.pos[0]), Math.round(this.pos[1] + this.hitbox[3])];
				break;
			case "UP":
				this.vel = [0, -1];
				this.targetPos = [Math.round(this.pos[0]), Math.round(this.pos[1] - this.hitbox[3])];
				break;
		}
	};

	Player.prototype.flag = function() {
		this.noInput = true;
		this.flagging = true;
		this.vel = [0, 2];
		this.acc = [0, 0];
	};

	Player.prototype.exit = function() {
		this.pos[0] += 16;
		this.targetPos[0] = level.exit * 16;
		this.left = true;
		this.setAnimation();
		this.waiting = 1;
		this.exiting = true;
	};
})();