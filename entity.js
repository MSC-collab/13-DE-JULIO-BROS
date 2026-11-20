(function() {
	if (typeof Mario === 'undefined')
		window.Mario = {};

	var Entity = Mario.Entity = function(options) {
		this.vel = [0,0];
		this.acc = [0,0];
		this.standing = true;
		this.pos = options.pos;
		this.sprite = options.sprite;
		this.hitbox = options.hitbox;
		this.left = false;
	};

	Entity.prototype.render = function(ctx, vX, vY) {
		this.sprite.render(ctx, this.pos[0], this.pos[1], vX, vY);
	};

	Entity.prototype.collideWall = function(wall) {
		var wHit = (wall && wall.hitbox) ? wall.hitbox : [0, 0, 16, 16];
		var hLeft = this.hitbox[0];
		var hWidth = this.hitbox[2];

		if (this.pos[0] + hLeft > wall.pos[0] + wHit[0]) {
			// Choque viniendo desde la derecha (moviéndose hacia la izquierda)
			this.pos[0] = wall.pos[0] + wHit[0] + wHit[2] - hLeft;
			this.vel[0] = Math.max(0, this.vel[0]);
			this.acc[0] = Math.max(0, this.acc[0]);
		} else {
			// Choque viniendo desde la izquierda (moviéndose hacia la derecha)
			this.pos[0] = wall.pos[0] + wHit[0] - hLeft - hWidth;
			this.vel[0] = Math.min(0, this.vel[0]);
			this.acc[0] = Math.min(0, this.acc[0]);
		}
	};

	Entity.prototype.bump = function() {;}
})();