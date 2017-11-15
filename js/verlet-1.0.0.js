(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
Copyright 2013 Sub Protocol and other contributors
http://subprotocol.com/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// DistanceConstraint -- constrains to initial distance
// PinConstraint -- constrains to static/fixed point
// AngleConstraint -- constrains 3 particles to an angle

var Vec2 = require('./vec2');

exports.DistanceConstraint = DistanceConstraint;
exports.PinConstraint = PinConstraint;
exports.AngleConstraint = AngleConstraint;

function DistanceConstraint(a, b, stiffness, distance /*optional*/) {
  this.a = a;
  this.b = b;
  this.distance = typeof distance != 'undefined' ? distance : a.pos.sub(b.pos).length();
  this.stiffness = stiffness;
}

DistanceConstraint.prototype.relax = function(stepCoef) {
  var normal = this.a.pos.sub(this.b.pos);
  var m = normal.length2();
  normal.mutableScale((this.distance * this.distance - m) / m * this.stiffness * stepCoef);
  this.a.pos.mutableAdd(normal);
  this.b.pos.mutableSub(normal);
};

DistanceConstraint.prototype.draw = function(ctx) {
  ctx.beginPath();
  ctx.moveTo(this.a.pos.x, this.a.pos.y);
  ctx.lineTo(this.b.pos.x, this.b.pos.y);
  ctx.strokeStyle = '#d8dde2';
  ctx.stroke();
};

function PinConstraint(a, pos) {
  this.a = a;
  this.pos = new Vec2().mutableSet(pos);
}

PinConstraint.prototype.relax = function(/* stepCoef */) {
  this.a.pos.mutableSet(this.pos);
};

PinConstraint.prototype.draw = function(ctx) {
  ctx.beginPath();
  ctx.arc(this.pos.x, this.pos.y, 6, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0,153,255,0.1)';
  ctx.fill();
};

function AngleConstraint(a, b, c, stiffness) {
  this.a = a;
  this.b = b;
  this.c = c;
  this.angle = this.b.pos.angle2(this.a.pos, this.c.pos);
  this.stiffness = stiffness;
}

AngleConstraint.prototype.relax = function(stepCoef) {
  var angle = this.b.pos.angle2(this.a.pos, this.c.pos);
  var diff = angle - this.angle;

  if (diff <= -Math.PI) diff += 2 * Math.PI;
  else if (diff >= Math.PI) diff -= 2 * Math.PI;

  diff *= stepCoef * this.stiffness;

  this.a.pos = this.a.pos.rotate(this.b.pos, diff);
  this.c.pos = this.c.pos.rotate(this.b.pos, -diff);
  this.b.pos = this.b.pos.rotate(this.a.pos, diff);
  this.b.pos = this.b.pos.rotate(this.c.pos, -diff);
};

AngleConstraint.prototype.draw = function(ctx) {
  ctx.beginPath();
  ctx.moveTo(this.a.pos.x, this.a.pos.y);
  ctx.lineTo(this.b.pos.x, this.b.pos.y);
  ctx.lineTo(this.c.pos.x, this.c.pos.y);
  var tmp = ctx.lineWidth;
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,0,0.2)';
  ctx.stroke();
  ctx.lineWidth = tmp;
};

},{"./vec2":4}],2:[function(require,module,exports){
//this exports all the verlet methods globally, so that the demos work.

var VerletJS = require('./verlet');
var constraint = require('./constraint');
require('./objects'); //patches VerletJS.prototype (bad)
window.Vec2 = require('./vec2');
window.VerletJS = VerletJS;

window.Particle = VerletJS.Particle;

window.DistanceConstraint = constraint.DistanceConstraint;
window.PinConstraint = constraint.PinConstraint;
window.AngleConstraint = constraint.AngleConstraint;

},{"./constraint":1,"./objects":3,"./vec2":4,"./verlet":5}],3:[function(require,module,exports){
/*
Copyright 2013 Sub Protocol and other contributors
http://subprotocol.com/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// generic verlet entities

var Vec2 = require('./vec2');
var VerletJS = require('./verlet');
var Particle = VerletJS.Particle;
var constraints = require('./constraint');
var DistanceConstraint = constraints.DistanceConstraint;

VerletJS.prototype.point = function(pos) {
  var composite = new this.Composite();
  composite.particles.push(new Particle(pos));
  this.composites.push(composite);
  return composite;
};

VerletJS.prototype.lineSegments = function(vertices, stiffness) {
  var i;

  var composite = new this.Composite();

  for (i in vertices) {
    composite.particles.push(new Particle(vertices[i]));
    if (i > 0)
      composite.constraints.push(
        new DistanceConstraint(composite.particles[i], composite.particles[i - 1], stiffness)
      );
  }

  this.composites.push(composite);
  return composite;
};

VerletJS.prototype.cloth = function(origin, width, height, segments, pinMod, stiffness) {
  var composite = new this.Composite();

  var xStride = width / segments;
  var yStride = height / segments;

  var x, y;
  for (y = 0; y < segments; ++y) {
    for (x = 0; x < segments; ++x) {
      var px = origin.x + x * xStride - width / 2 + xStride / 2;
      var py = origin.y + y * yStride - height / 2 + yStride / 2;
      composite.particles.push(new Particle(new Vec2(px, py)));

      if (x > 0)
        composite.constraints.push(
          new DistanceConstraint(
            composite.particles[y * segments + x],
            composite.particles[y * segments + x - 1],
            stiffness
          )
        );

      if (y > 0)
        composite.constraints.push(
          new DistanceConstraint(
            composite.particles[y * segments + x],
            composite.particles[(y - 1) * segments + x],
            stiffness
          )
        );
    }
  }

  for (x = 0; x < segments; ++x) {
    if (x % pinMod == 0) composite.pin(x);
  }

  this.composites.push(composite);
  return composite;
};

VerletJS.prototype.tire = function(origin, radius, segments, spokeStiffness, treadStiffness) {
  var stride = 2 * Math.PI / segments;
  var i;

  var composite = new this.Composite();

  // particles
  for (i = 0; i < segments; ++i) {
    var theta = i * stride;
    composite.particles.push(
      new Particle(
        new Vec2(origin.x + Math.cos(theta) * radius, origin.y + Math.sin(theta) * radius)
      )
    );
  }

  var center = new Particle(origin);
  composite.particles.push(center);

  // constraints
  for (i = 0; i < segments; ++i) {
    composite.constraints.push(
      new DistanceConstraint(
        composite.particles[i],
        composite.particles[(i + 1) % segments],
        treadStiffness
      )
    );
    composite.constraints.push(
      new DistanceConstraint(composite.particles[i], center, spokeStiffness)
    );
    composite.constraints.push(
      new DistanceConstraint(
        composite.particles[i],
        composite.particles[(i + 5) % segments],
        treadStiffness
      )
    );
  }

  this.composites.push(composite);
  return composite;
};

},{"./constraint":1,"./vec2":4,"./verlet":5}],4:[function(require,module,exports){
/*
Copyright 2013 Sub Protocol and other contributors
http://subprotocol.com/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// A simple 2-dimensional vector implementation

module.exports = Vec2;

function Vec2(x, y) {
  this.x = x || 0;
  this.y = y || 0;
}

Vec2.prototype.add = function(v) {
  return new Vec2(this.x + v.x, this.y + v.y);
};

Vec2.prototype.sub = function(v) {
  return new Vec2(this.x - v.x, this.y - v.y);
};

Vec2.prototype.mul = function(v) {
  return new Vec2(this.x * v.x, this.y * v.y);
};

Vec2.prototype.div = function(v) {
  return new Vec2(this.x / v.x, this.y / v.y);
};

Vec2.prototype.scale = function(coef) {
  return new Vec2(this.x * coef, this.y * coef);
};

Vec2.prototype.mutableSet = function(v) {
  this.x = v.x;
  this.y = v.y;
  return this;
};

Vec2.prototype.mutableAdd = function(v) {
  this.x += v.x;
  this.y += v.y;
  return this;
};

Vec2.prototype.mutableSub = function(v) {
  this.x -= v.x;
  this.y -= v.y;
  return this;
};

Vec2.prototype.mutableMul = function(v) {
  this.x *= v.x;
  this.y *= v.y;
  return this;
};

Vec2.prototype.mutableDiv = function(v) {
  this.x /= v.x;
  this.y /= v.y;
  return this;
};

Vec2.prototype.mutableScale = function(coef) {
  this.x *= coef;
  this.y *= coef;
  return this;
};

Vec2.prototype.equals = function(v) {
  return this.x == v.x && this.y == v.y;
};

Vec2.prototype.epsilonEquals = function(v, epsilon) {
  return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
};

Vec2.prototype.length = function(/* v */) {
  return Math.sqrt(this.x * this.x + this.y * this.y);
};

Vec2.prototype.length2 = function(/* v */) {
  return this.x * this.x + this.y * this.y;
};

Vec2.prototype.dist = function(v) {
  return Math.sqrt(this.dist2(v));
};

Vec2.prototype.dist2 = function(v) {
  var x = v.x - this.x;
  var y = v.y - this.y;
  return x * x + y * y;
};

Vec2.prototype.normal = function() {
  var m = Math.sqrt(this.x * this.x + this.y * this.y);
  return new Vec2(this.x / m, this.y / m);
};

Vec2.prototype.dot = function(v) {
  return this.x * v.x + this.y * v.y;
};

Vec2.prototype.angle = function(v) {
  return Math.atan2(this.x * v.y - this.y * v.x, this.x * v.x + this.y * v.y);
};

Vec2.prototype.angle2 = function(vLeft, vRight) {
  return vLeft.sub(this).angle(vRight.sub(this));
};

Vec2.prototype.rotate = function(origin, theta) {
  var x = this.x - origin.x;
  var y = this.y - origin.y;
  return new Vec2(
    x * Math.cos(theta) - y * Math.sin(theta) + origin.x,
    x * Math.sin(theta) + y * Math.cos(theta) + origin.y
  );
};

Vec2.prototype.toString = function() {
  return '(' + this.x + ', ' + this.y + ')';
};

/* eslint-disable no-unused-vars */
function test_Vec2() {
  var assert = function(label, expression) {
    console.log('Vec2(' + label + '): ' + (expression == true ? 'PASS' : 'FAIL'));
    if (expression != true) throw 'assertion failed';
  };

  assert('equality', new Vec2(5, 3).equals(new Vec2(5, 3)));
  assert('epsilon equality', new Vec2(1, 2).epsilonEquals(new Vec2(1.01, 2.02), 0.03));
  assert('epsilon non-equality', !new Vec2(1, 2).epsilonEquals(new Vec2(1.01, 2.02), 0.01));
  assert('addition', new Vec2(1, 1).add(new Vec2(2, 3)).equals(new Vec2(3, 4)));
  assert('subtraction', new Vec2(4, 3).sub(new Vec2(2, 1)).equals(new Vec2(2, 2)));
  assert('multiply', new Vec2(2, 4).mul(new Vec2(2, 1)).equals(new Vec2(4, 4)));
  assert('divide', new Vec2(4, 2).div(new Vec2(2, 2)).equals(new Vec2(2, 1)));
  assert('scale', new Vec2(4, 3).scale(2).equals(new Vec2(8, 6)));
  assert('mutable set', new Vec2(1, 1).mutableSet(new Vec2(2, 3)).equals(new Vec2(2, 3)));
  assert('mutable addition', new Vec2(1, 1).mutableAdd(new Vec2(2, 3)).equals(new Vec2(3, 4)));
  assert('mutable subtraction', new Vec2(4, 3).mutableSub(new Vec2(2, 1)).equals(new Vec2(2, 2)));
  assert('mutable multiply', new Vec2(2, 4).mutableMul(new Vec2(2, 1)).equals(new Vec2(4, 4)));
  assert('mutable divide', new Vec2(4, 2).mutableDiv(new Vec2(2, 2)).equals(new Vec2(2, 1)));
  assert('mutable scale', new Vec2(4, 3).mutableScale(2).equals(new Vec2(8, 6)));
  assert('length', Math.abs(new Vec2(4, 4).length() - 5.65685) <= 0.00001);
  assert('length2', new Vec2(2, 4).length2() == 20);
  assert('dist', Math.abs(new Vec2(2, 4).dist(new Vec2(3, 5)) - 1.4142135) <= 0.000001);
  assert('dist2', new Vec2(2, 4).dist2(new Vec2(3, 5)) == 2);

  var normal = new Vec2(2, 4).normal();
  assert(
    'normal',
    Math.abs(normal.length() - 1.0) <= 0.00001 &&
      normal.epsilonEquals(new Vec2(0.4472, 0.89443), 0.0001)
  );
  assert('dot', new Vec2(2, 3).dot(new Vec2(4, 1)) == 11);
  assert('angle', new Vec2(0, -1).angle(new Vec2(1, 0)) * (180 / Math.PI) == 90);
  assert('angle2', new Vec2(1, 1).angle2(new Vec2(1, 0), new Vec2(2, 1)) * (180 / Math.PI) == 90);
  assert('rotate', new Vec2(2, 0).rotate(new Vec2(1, 0), Math.PI / 2).equals(new Vec2(1, 1)));
  assert('toString', new Vec2(2, 4) == '(2, 4)');
}
/* eslint-enable no-unused-vars */

},{}],5:[function(require,module,exports){
/*
Copyright 2013 Sub Protocol and other contributors
http://subprotocol.com/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

window.requestAnimFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };

var Vec2 = require('./vec2');
var constraint = require('./constraint');
var PinConstraint = constraint.PinConstraint;

exports = module.exports = VerletJS;
exports.Particle = Particle;
exports.Composite = Composite;

function Particle(pos) {
  this.pos = new Vec2().mutableSet(pos);
  this.lastPos = new Vec2().mutableSet(pos);
}

Particle.prototype.draw = function(ctx) {
  ctx.beginPath();
  ctx.arc(this.pos.x, this.pos.y, 2, 0, 2 * Math.PI);
  ctx.fillStyle = '#2dad8f';
  ctx.fill();
};

function VerletJS(width, height, canvas) {
  this.width = width;
  this.height = height;
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.mouse = new Vec2(0, 0);
  this.mouseDown = false;
  this.draggedEntity = null;
  this.selectionRadius = 20;
  this.highlightColor = '#4f545c';

  this.bounds = function(particle) {
    if (particle.pos.y > this.height - 1) particle.pos.y = this.height - 1;

    if (particle.pos.x < 0) particle.pos.x = 0;

    if (particle.pos.x > this.width - 1) particle.pos.x = this.width - 1;
  };

  var _this = this;

  // prevent context menu
  this.canvas.oncontextmenu = function(e) {
    e.preventDefault();
  };

  this.canvas.onmousedown = function(/* e */) {
    _this.mouseDown = true;
    var nearest = _this.nearestEntity();
    if (nearest) {
      _this.draggedEntity = nearest;
    }
  };

  this.canvas.onmouseup = function(/* e */) {
    _this.mouseDown = false;
    _this.draggedEntity = null;
  };

  this.canvas.onmousemove = function(e) {
    var rect = _this.canvas.getBoundingClientRect();
    _this.mouse.x = e.clientX - rect.left;
    _this.mouse.y = e.clientY - rect.top;
  };

  // simulation params
  this.gravity = new Vec2(0, 0.2);
  this.friction = 0.99;
  this.groundFriction = 0.8;

  // holds composite entities
  this.composites = [];
}

VerletJS.prototype.Composite = Composite;

function Composite() {
  this.particles = [];
  this.constraints = [];

  this.drawParticles = null;
  this.drawConstraints = null;
}

Composite.prototype.pin = function(index, pos) {
  pos = pos || this.particles[index].pos;
  var pc = new PinConstraint(this.particles[index], pos);
  this.constraints.push(pc);
  return pc;
};

VerletJS.prototype.frame = function(step) {
  var i, j, c;

  for (c in this.composites) {
    for (i in this.composites[c].particles) {
      var particles = this.composites[c].particles;

      // calculate velocity
      var velocity = particles[i].pos.sub(particles[i].lastPos).scale(this.friction);

      // ground friction
      if (particles[i].pos.y >= this.height - 1 && velocity.length2() > 0.000001) {
        var m = velocity.length();
        velocity.x /= m;
        velocity.y /= m;
        velocity.mutableScale(m * this.groundFriction);
      }

      // save last good state
      particles[i].lastPos.mutableSet(particles[i].pos);

      // gravity
      particles[i].pos.mutableAdd(this.gravity);

      // inertia
      particles[i].pos.mutableAdd(velocity);
    }
  }

  // handle dragging of entities
  if (this.draggedEntity) this.draggedEntity.pos.mutableSet(this.mouse);

  // relax
  var stepCoef = 1 / step;
  for (c in this.composites) {
    var constraints = this.composites[c].constraints;
    for (i = 0; i < step; ++i) for (j in constraints) constraints[j].relax(stepCoef);
  }

  // bounds checking
  for (c in this.composites) {
    particles = this.composites[c].particles;
    for (i in particles) this.bounds(particles[i]);
  }
};

VerletJS.prototype.draw = function() {
  var i, c;

  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  for (c in this.composites) {
    // draw constraints
    if (this.composites[c].drawConstraints) {
      this.composites[c].drawConstraints(this.ctx, this.composites[c]);
    } else {
      var constraints = this.composites[c].constraints;
      for (i in constraints) constraints[i].draw(this.ctx);
    }

    // draw particles
    if (this.composites[c].drawParticles) {
      this.composites[c].drawParticles(this.ctx, this.composites[c]);
    } else {
      var particles = this.composites[c].particles;
      for (i in particles) particles[i].draw(this.ctx);
    }
  }

  // highlight nearest / dragged entity
  var nearest = this.draggedEntity || this.nearestEntity();
  if (nearest) {
    this.ctx.beginPath();
    this.ctx.arc(nearest.pos.x, nearest.pos.y, 8, 0, 2 * Math.PI);
    this.ctx.strokeStyle = this.highlightColor;
    this.ctx.stroke();
  }
};

VerletJS.prototype.nearestEntity = function() {
  var c, i;
  var d2Nearest = 0;
  var entity = null;
  var constraintsNearest = null;

  // find nearest point
  for (c in this.composites) {
    var particles = this.composites[c].particles;
    for (i in particles) {
      var d2 = particles[i].pos.dist2(this.mouse);
      if (d2 <= this.selectionRadius * this.selectionRadius && (entity == null || d2 < d2Nearest)) {
        entity = particles[i];
        constraintsNearest = this.composites[c].constraints;
        d2Nearest = d2;
      }
    }
  }

  // search for pinned constraints for this entity
  for (i in constraintsNearest)
    if (constraintsNearest[i] instanceof PinConstraint && constraintsNearest[i].a == entity)
      entity = constraintsNearest[i];

  return entity;
};

},{"./constraint":1,"./vec2":4}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvY29uc3RyYWludC5qcyIsImxpYi9kaXN0LmpzIiwibGliL29iamVjdHMuanMiLCJsaWIvdmVjMi5qcyIsImxpYi92ZXJsZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypcbkNvcHlyaWdodCAyMDEzIFN1YiBQcm90b2NvbCBhbmQgb3RoZXIgY29udHJpYnV0b3JzXG5odHRwOi8vc3VicHJvdG9jb2wuY29tL1xuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmdcbmEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG53aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG5kaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cbnBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0b1xudGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsXG5FWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbk1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG5OT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFXG5MSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OXG5PRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbldJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuKi9cblxuLy8gRGlzdGFuY2VDb25zdHJhaW50IC0tIGNvbnN0cmFpbnMgdG8gaW5pdGlhbCBkaXN0YW5jZVxuLy8gUGluQ29uc3RyYWludCAtLSBjb25zdHJhaW5zIHRvIHN0YXRpYy9maXhlZCBwb2ludFxuLy8gQW5nbGVDb25zdHJhaW50IC0tIGNvbnN0cmFpbnMgMyBwYXJ0aWNsZXMgdG8gYW4gYW5nbGVcblxudmFyIFZlYzIgPSByZXF1aXJlKCcuL3ZlYzInKTtcblxuZXhwb3J0cy5EaXN0YW5jZUNvbnN0cmFpbnQgPSBEaXN0YW5jZUNvbnN0cmFpbnQ7XG5leHBvcnRzLlBpbkNvbnN0cmFpbnQgPSBQaW5Db25zdHJhaW50O1xuZXhwb3J0cy5BbmdsZUNvbnN0cmFpbnQgPSBBbmdsZUNvbnN0cmFpbnQ7XG5cbmZ1bmN0aW9uIERpc3RhbmNlQ29uc3RyYWludChhLCBiLCBzdGlmZm5lc3MsIGRpc3RhbmNlIC8qb3B0aW9uYWwqLykge1xuICB0aGlzLmEgPSBhO1xuICB0aGlzLmIgPSBiO1xuICB0aGlzLmRpc3RhbmNlID0gdHlwZW9mIGRpc3RhbmNlICE9ICd1bmRlZmluZWQnID8gZGlzdGFuY2UgOiBhLnBvcy5zdWIoYi5wb3MpLmxlbmd0aCgpO1xuICB0aGlzLnN0aWZmbmVzcyA9IHN0aWZmbmVzcztcbn1cblxuRGlzdGFuY2VDb25zdHJhaW50LnByb3RvdHlwZS5yZWxheCA9IGZ1bmN0aW9uKHN0ZXBDb2VmKSB7XG4gIHZhciBub3JtYWwgPSB0aGlzLmEucG9zLnN1Yih0aGlzLmIucG9zKTtcbiAgdmFyIG0gPSBub3JtYWwubGVuZ3RoMigpO1xuICBub3JtYWwubXV0YWJsZVNjYWxlKCh0aGlzLmRpc3RhbmNlICogdGhpcy5kaXN0YW5jZSAtIG0pIC8gbSAqIHRoaXMuc3RpZmZuZXNzICogc3RlcENvZWYpO1xuICB0aGlzLmEucG9zLm11dGFibGVBZGQobm9ybWFsKTtcbiAgdGhpcy5iLnBvcy5tdXRhYmxlU3ViKG5vcm1hbCk7XG59O1xuXG5EaXN0YW5jZUNvbnN0cmFpbnQucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbihjdHgpIHtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHgubW92ZVRvKHRoaXMuYS5wb3MueCwgdGhpcy5hLnBvcy55KTtcbiAgY3R4LmxpbmVUbyh0aGlzLmIucG9zLngsIHRoaXMuYi5wb3MueSk7XG4gIGN0eC5zdHJva2VTdHlsZSA9ICcjZDhkZGUyJztcbiAgY3R4LnN0cm9rZSgpO1xufTtcblxuZnVuY3Rpb24gUGluQ29uc3RyYWludChhLCBwb3MpIHtcbiAgdGhpcy5hID0gYTtcbiAgdGhpcy5wb3MgPSBuZXcgVmVjMigpLm11dGFibGVTZXQocG9zKTtcbn1cblxuUGluQ29uc3RyYWludC5wcm90b3R5cGUucmVsYXggPSBmdW5jdGlvbigvKiBzdGVwQ29lZiAqLykge1xuICB0aGlzLmEucG9zLm11dGFibGVTZXQodGhpcy5wb3MpO1xufTtcblxuUGluQ29uc3RyYWludC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKGN0eCkge1xuICBjdHguYmVnaW5QYXRoKCk7XG4gIGN0eC5hcmModGhpcy5wb3MueCwgdGhpcy5wb3MueSwgNiwgMCwgMiAqIE1hdGguUEkpO1xuICBjdHguZmlsbFN0eWxlID0gJ3JnYmEoMCwxNTMsMjU1LDAuMSknO1xuICBjdHguZmlsbCgpO1xufTtcblxuZnVuY3Rpb24gQW5nbGVDb25zdHJhaW50KGEsIGIsIGMsIHN0aWZmbmVzcykge1xuICB0aGlzLmEgPSBhO1xuICB0aGlzLmIgPSBiO1xuICB0aGlzLmMgPSBjO1xuICB0aGlzLmFuZ2xlID0gdGhpcy5iLnBvcy5hbmdsZTIodGhpcy5hLnBvcywgdGhpcy5jLnBvcyk7XG4gIHRoaXMuc3RpZmZuZXNzID0gc3RpZmZuZXNzO1xufVxuXG5BbmdsZUNvbnN0cmFpbnQucHJvdG90eXBlLnJlbGF4ID0gZnVuY3Rpb24oc3RlcENvZWYpIHtcbiAgdmFyIGFuZ2xlID0gdGhpcy5iLnBvcy5hbmdsZTIodGhpcy5hLnBvcywgdGhpcy5jLnBvcyk7XG4gIHZhciBkaWZmID0gYW5nbGUgLSB0aGlzLmFuZ2xlO1xuXG4gIGlmIChkaWZmIDw9IC1NYXRoLlBJKSBkaWZmICs9IDIgKiBNYXRoLlBJO1xuICBlbHNlIGlmIChkaWZmID49IE1hdGguUEkpIGRpZmYgLT0gMiAqIE1hdGguUEk7XG5cbiAgZGlmZiAqPSBzdGVwQ29lZiAqIHRoaXMuc3RpZmZuZXNzO1xuXG4gIHRoaXMuYS5wb3MgPSB0aGlzLmEucG9zLnJvdGF0ZSh0aGlzLmIucG9zLCBkaWZmKTtcbiAgdGhpcy5jLnBvcyA9IHRoaXMuYy5wb3Mucm90YXRlKHRoaXMuYi5wb3MsIC1kaWZmKTtcbiAgdGhpcy5iLnBvcyA9IHRoaXMuYi5wb3Mucm90YXRlKHRoaXMuYS5wb3MsIGRpZmYpO1xuICB0aGlzLmIucG9zID0gdGhpcy5iLnBvcy5yb3RhdGUodGhpcy5jLnBvcywgLWRpZmYpO1xufTtcblxuQW5nbGVDb25zdHJhaW50LnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oY3R4KSB7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgY3R4Lm1vdmVUbyh0aGlzLmEucG9zLngsIHRoaXMuYS5wb3MueSk7XG4gIGN0eC5saW5lVG8odGhpcy5iLnBvcy54LCB0aGlzLmIucG9zLnkpO1xuICBjdHgubGluZVRvKHRoaXMuYy5wb3MueCwgdGhpcy5jLnBvcy55KTtcbiAgdmFyIHRtcCA9IGN0eC5saW5lV2lkdGg7XG4gIGN0eC5saW5lV2lkdGggPSA1O1xuICBjdHguc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsMjU1LDAsMC4yKSc7XG4gIGN0eC5zdHJva2UoKTtcbiAgY3R4LmxpbmVXaWR0aCA9IHRtcDtcbn07XG4iLCIvL3RoaXMgZXhwb3J0cyBhbGwgdGhlIHZlcmxldCBtZXRob2RzIGdsb2JhbGx5LCBzbyB0aGF0IHRoZSBkZW1vcyB3b3JrLlxuXG52YXIgVmVybGV0SlMgPSByZXF1aXJlKCcuL3ZlcmxldCcpO1xudmFyIGNvbnN0cmFpbnQgPSByZXF1aXJlKCcuL2NvbnN0cmFpbnQnKTtcbnJlcXVpcmUoJy4vb2JqZWN0cycpOyAvL3BhdGNoZXMgVmVybGV0SlMucHJvdG90eXBlIChiYWQpXG53aW5kb3cuVmVjMiA9IHJlcXVpcmUoJy4vdmVjMicpO1xud2luZG93LlZlcmxldEpTID0gVmVybGV0SlM7XG5cbndpbmRvdy5QYXJ0aWNsZSA9IFZlcmxldEpTLlBhcnRpY2xlO1xuXG53aW5kb3cuRGlzdGFuY2VDb25zdHJhaW50ID0gY29uc3RyYWludC5EaXN0YW5jZUNvbnN0cmFpbnQ7XG53aW5kb3cuUGluQ29uc3RyYWludCA9IGNvbnN0cmFpbnQuUGluQ29uc3RyYWludDtcbndpbmRvdy5BbmdsZUNvbnN0cmFpbnQgPSBjb25zdHJhaW50LkFuZ2xlQ29uc3RyYWludDtcbiIsIi8qXG5Db3B5cmlnaHQgMjAxMyBTdWIgUHJvdG9jb2wgYW5kIG90aGVyIGNvbnRyaWJ1dG9yc1xuaHR0cDovL3N1YnByb3RvY29sLmNvbS9cblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nXG5hIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcblwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xud2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvXG5wZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG9cbnRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbmluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG5NRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORFxuTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRVxuTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTlxuT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OXG5XSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiovXG5cbi8vIGdlbmVyaWMgdmVybGV0IGVudGl0aWVzXG5cbnZhciBWZWMyID0gcmVxdWlyZSgnLi92ZWMyJyk7XG52YXIgVmVybGV0SlMgPSByZXF1aXJlKCcuL3ZlcmxldCcpO1xudmFyIFBhcnRpY2xlID0gVmVybGV0SlMuUGFydGljbGU7XG52YXIgY29uc3RyYWludHMgPSByZXF1aXJlKCcuL2NvbnN0cmFpbnQnKTtcbnZhciBEaXN0YW5jZUNvbnN0cmFpbnQgPSBjb25zdHJhaW50cy5EaXN0YW5jZUNvbnN0cmFpbnQ7XG5cblZlcmxldEpTLnByb3RvdHlwZS5wb2ludCA9IGZ1bmN0aW9uKHBvcykge1xuICB2YXIgY29tcG9zaXRlID0gbmV3IHRoaXMuQ29tcG9zaXRlKCk7XG4gIGNvbXBvc2l0ZS5wYXJ0aWNsZXMucHVzaChuZXcgUGFydGljbGUocG9zKSk7XG4gIHRoaXMuY29tcG9zaXRlcy5wdXNoKGNvbXBvc2l0ZSk7XG4gIHJldHVybiBjb21wb3NpdGU7XG59O1xuXG5WZXJsZXRKUy5wcm90b3R5cGUubGluZVNlZ21lbnRzID0gZnVuY3Rpb24odmVydGljZXMsIHN0aWZmbmVzcykge1xuICB2YXIgaTtcblxuICB2YXIgY29tcG9zaXRlID0gbmV3IHRoaXMuQ29tcG9zaXRlKCk7XG5cbiAgZm9yIChpIGluIHZlcnRpY2VzKSB7XG4gICAgY29tcG9zaXRlLnBhcnRpY2xlcy5wdXNoKG5ldyBQYXJ0aWNsZSh2ZXJ0aWNlc1tpXSkpO1xuICAgIGlmIChpID4gMClcbiAgICAgIGNvbXBvc2l0ZS5jb25zdHJhaW50cy5wdXNoKFxuICAgICAgICBuZXcgRGlzdGFuY2VDb25zdHJhaW50KGNvbXBvc2l0ZS5wYXJ0aWNsZXNbaV0sIGNvbXBvc2l0ZS5wYXJ0aWNsZXNbaSAtIDFdLCBzdGlmZm5lc3MpXG4gICAgICApO1xuICB9XG5cbiAgdGhpcy5jb21wb3NpdGVzLnB1c2goY29tcG9zaXRlKTtcbiAgcmV0dXJuIGNvbXBvc2l0ZTtcbn07XG5cblZlcmxldEpTLnByb3RvdHlwZS5jbG90aCA9IGZ1bmN0aW9uKG9yaWdpbiwgd2lkdGgsIGhlaWdodCwgc2VnbWVudHMsIHBpbk1vZCwgc3RpZmZuZXNzKSB7XG4gIHZhciBjb21wb3NpdGUgPSBuZXcgdGhpcy5Db21wb3NpdGUoKTtcblxuICB2YXIgeFN0cmlkZSA9IHdpZHRoIC8gc2VnbWVudHM7XG4gIHZhciB5U3RyaWRlID0gaGVpZ2h0IC8gc2VnbWVudHM7XG5cbiAgdmFyIHgsIHk7XG4gIGZvciAoeSA9IDA7IHkgPCBzZWdtZW50czsgKyt5KSB7XG4gICAgZm9yICh4ID0gMDsgeCA8IHNlZ21lbnRzOyArK3gpIHtcbiAgICAgIHZhciBweCA9IG9yaWdpbi54ICsgeCAqIHhTdHJpZGUgLSB3aWR0aCAvIDIgKyB4U3RyaWRlIC8gMjtcbiAgICAgIHZhciBweSA9IG9yaWdpbi55ICsgeSAqIHlTdHJpZGUgLSBoZWlnaHQgLyAyICsgeVN0cmlkZSAvIDI7XG4gICAgICBjb21wb3NpdGUucGFydGljbGVzLnB1c2gobmV3IFBhcnRpY2xlKG5ldyBWZWMyKHB4LCBweSkpKTtcblxuICAgICAgaWYgKHggPiAwKVxuICAgICAgICBjb21wb3NpdGUuY29uc3RyYWludHMucHVzaChcbiAgICAgICAgICBuZXcgRGlzdGFuY2VDb25zdHJhaW50KFxuICAgICAgICAgICAgY29tcG9zaXRlLnBhcnRpY2xlc1t5ICogc2VnbWVudHMgKyB4XSxcbiAgICAgICAgICAgIGNvbXBvc2l0ZS5wYXJ0aWNsZXNbeSAqIHNlZ21lbnRzICsgeCAtIDFdLFxuICAgICAgICAgICAgc3RpZmZuZXNzXG4gICAgICAgICAgKVxuICAgICAgICApO1xuXG4gICAgICBpZiAoeSA+IDApXG4gICAgICAgIGNvbXBvc2l0ZS5jb25zdHJhaW50cy5wdXNoKFxuICAgICAgICAgIG5ldyBEaXN0YW5jZUNvbnN0cmFpbnQoXG4gICAgICAgICAgICBjb21wb3NpdGUucGFydGljbGVzW3kgKiBzZWdtZW50cyArIHhdLFxuICAgICAgICAgICAgY29tcG9zaXRlLnBhcnRpY2xlc1soeSAtIDEpICogc2VnbWVudHMgKyB4XSxcbiAgICAgICAgICAgIHN0aWZmbmVzc1xuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKHggPSAwOyB4IDwgc2VnbWVudHM7ICsreCkge1xuICAgIGlmICh4ICUgcGluTW9kID09IDApIGNvbXBvc2l0ZS5waW4oeCk7XG4gIH1cblxuICB0aGlzLmNvbXBvc2l0ZXMucHVzaChjb21wb3NpdGUpO1xuICByZXR1cm4gY29tcG9zaXRlO1xufTtcblxuVmVybGV0SlMucHJvdG90eXBlLnRpcmUgPSBmdW5jdGlvbihvcmlnaW4sIHJhZGl1cywgc2VnbWVudHMsIHNwb2tlU3RpZmZuZXNzLCB0cmVhZFN0aWZmbmVzcykge1xuICB2YXIgc3RyaWRlID0gMiAqIE1hdGguUEkgLyBzZWdtZW50cztcbiAgdmFyIGk7XG5cbiAgdmFyIGNvbXBvc2l0ZSA9IG5ldyB0aGlzLkNvbXBvc2l0ZSgpO1xuXG4gIC8vIHBhcnRpY2xlc1xuICBmb3IgKGkgPSAwOyBpIDwgc2VnbWVudHM7ICsraSkge1xuICAgIHZhciB0aGV0YSA9IGkgKiBzdHJpZGU7XG4gICAgY29tcG9zaXRlLnBhcnRpY2xlcy5wdXNoKFxuICAgICAgbmV3IFBhcnRpY2xlKFxuICAgICAgICBuZXcgVmVjMihvcmlnaW4ueCArIE1hdGguY29zKHRoZXRhKSAqIHJhZGl1cywgb3JpZ2luLnkgKyBNYXRoLnNpbih0aGV0YSkgKiByYWRpdXMpXG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIHZhciBjZW50ZXIgPSBuZXcgUGFydGljbGUob3JpZ2luKTtcbiAgY29tcG9zaXRlLnBhcnRpY2xlcy5wdXNoKGNlbnRlcik7XG5cbiAgLy8gY29uc3RyYWludHNcbiAgZm9yIChpID0gMDsgaSA8IHNlZ21lbnRzOyArK2kpIHtcbiAgICBjb21wb3NpdGUuY29uc3RyYWludHMucHVzaChcbiAgICAgIG5ldyBEaXN0YW5jZUNvbnN0cmFpbnQoXG4gICAgICAgIGNvbXBvc2l0ZS5wYXJ0aWNsZXNbaV0sXG4gICAgICAgIGNvbXBvc2l0ZS5wYXJ0aWNsZXNbKGkgKyAxKSAlIHNlZ21lbnRzXSxcbiAgICAgICAgdHJlYWRTdGlmZm5lc3NcbiAgICAgIClcbiAgICApO1xuICAgIGNvbXBvc2l0ZS5jb25zdHJhaW50cy5wdXNoKFxuICAgICAgbmV3IERpc3RhbmNlQ29uc3RyYWludChjb21wb3NpdGUucGFydGljbGVzW2ldLCBjZW50ZXIsIHNwb2tlU3RpZmZuZXNzKVxuICAgICk7XG4gICAgY29tcG9zaXRlLmNvbnN0cmFpbnRzLnB1c2goXG4gICAgICBuZXcgRGlzdGFuY2VDb25zdHJhaW50KFxuICAgICAgICBjb21wb3NpdGUucGFydGljbGVzW2ldLFxuICAgICAgICBjb21wb3NpdGUucGFydGljbGVzWyhpICsgNSkgJSBzZWdtZW50c10sXG4gICAgICAgIHRyZWFkU3RpZmZuZXNzXG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIHRoaXMuY29tcG9zaXRlcy5wdXNoKGNvbXBvc2l0ZSk7XG4gIHJldHVybiBjb21wb3NpdGU7XG59O1xuIiwiLypcbkNvcHlyaWdodCAyMDEzIFN1YiBQcm90b2NvbCBhbmQgb3RoZXIgY29udHJpYnV0b3JzXG5odHRwOi8vc3VicHJvdG9jb2wuY29tL1xuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmdcbmEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG53aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG5kaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cbnBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0b1xudGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsXG5FWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbk1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG5OT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFXG5MSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OXG5PRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbldJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuKi9cblxuLy8gQSBzaW1wbGUgMi1kaW1lbnNpb25hbCB2ZWN0b3IgaW1wbGVtZW50YXRpb25cblxubW9kdWxlLmV4cG9ydHMgPSBWZWMyO1xuXG5mdW5jdGlvbiBWZWMyKHgsIHkpIHtcbiAgdGhpcy54ID0geCB8fCAwO1xuICB0aGlzLnkgPSB5IHx8IDA7XG59XG5cblZlYzIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCArIHYueCwgdGhpcy55ICsgdi55KTtcbn07XG5cblZlYzIucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAtIHYueCwgdGhpcy55IC0gdi55KTtcbn07XG5cblZlYzIucHJvdG90eXBlLm11bCA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAqIHYueCwgdGhpcy55ICogdi55KTtcbn07XG5cblZlYzIucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIG5ldyBWZWMyKHRoaXMueCAvIHYueCwgdGhpcy55IC8gdi55KTtcbn07XG5cblZlYzIucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24oY29lZikge1xuICByZXR1cm4gbmV3IFZlYzIodGhpcy54ICogY29lZiwgdGhpcy55ICogY29lZik7XG59O1xuXG5WZWMyLnByb3RvdHlwZS5tdXRhYmxlU2V0ID0gZnVuY3Rpb24odikge1xuICB0aGlzLnggPSB2Lng7XG4gIHRoaXMueSA9IHYueTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMyLnByb3RvdHlwZS5tdXRhYmxlQWRkID0gZnVuY3Rpb24odikge1xuICB0aGlzLnggKz0gdi54O1xuICB0aGlzLnkgKz0gdi55O1xuICByZXR1cm4gdGhpcztcbn07XG5cblZlYzIucHJvdG90eXBlLm11dGFibGVTdWIgPSBmdW5jdGlvbih2KSB7XG4gIHRoaXMueCAtPSB2Lng7XG4gIHRoaXMueSAtPSB2Lnk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuVmVjMi5wcm90b3R5cGUubXV0YWJsZU11bCA9IGZ1bmN0aW9uKHYpIHtcbiAgdGhpcy54ICo9IHYueDtcbiAgdGhpcy55ICo9IHYueTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5WZWMyLnByb3RvdHlwZS5tdXRhYmxlRGl2ID0gZnVuY3Rpb24odikge1xuICB0aGlzLnggLz0gdi54O1xuICB0aGlzLnkgLz0gdi55O1xuICByZXR1cm4gdGhpcztcbn07XG5cblZlYzIucHJvdG90eXBlLm11dGFibGVTY2FsZSA9IGZ1bmN0aW9uKGNvZWYpIHtcbiAgdGhpcy54ICo9IGNvZWY7XG4gIHRoaXMueSAqPSBjb2VmO1xuICByZXR1cm4gdGhpcztcbn07XG5cblZlYzIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIHRoaXMueCA9PSB2LnggJiYgdGhpcy55ID09IHYueTtcbn07XG5cblZlYzIucHJvdG90eXBlLmVwc2lsb25FcXVhbHMgPSBmdW5jdGlvbih2LCBlcHNpbG9uKSB7XG4gIHJldHVybiBNYXRoLmFicyh0aGlzLnggLSB2LngpIDw9IGVwc2lsb24gJiYgTWF0aC5hYnModGhpcy55IC0gdi55KSA8PSBlcHNpbG9uO1xufTtcblxuVmVjMi5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24oLyogdiAqLykge1xuICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XG59O1xuXG5WZWMyLnByb3RvdHlwZS5sZW5ndGgyID0gZnVuY3Rpb24oLyogdiAqLykge1xuICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xufTtcblxuVmVjMi5wcm90b3R5cGUuZGlzdCA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRpc3QyKHYpKTtcbn07XG5cblZlYzIucHJvdG90eXBlLmRpc3QyID0gZnVuY3Rpb24odikge1xuICB2YXIgeCA9IHYueCAtIHRoaXMueDtcbiAgdmFyIHkgPSB2LnkgLSB0aGlzLnk7XG4gIHJldHVybiB4ICogeCArIHkgKiB5O1xufTtcblxuVmVjMi5wcm90b3R5cGUubm9ybWFsID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtID0gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSk7XG4gIHJldHVybiBuZXcgVmVjMih0aGlzLnggLyBtLCB0aGlzLnkgLyBtKTtcbn07XG5cblZlYzIucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcbn07XG5cblZlYzIucHJvdG90eXBlLmFuZ2xlID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gTWF0aC5hdGFuMih0aGlzLnggKiB2LnkgLSB0aGlzLnkgKiB2LngsIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueSk7XG59O1xuXG5WZWMyLnByb3RvdHlwZS5hbmdsZTIgPSBmdW5jdGlvbih2TGVmdCwgdlJpZ2h0KSB7XG4gIHJldHVybiB2TGVmdC5zdWIodGhpcykuYW5nbGUodlJpZ2h0LnN1Yih0aGlzKSk7XG59O1xuXG5WZWMyLnByb3RvdHlwZS5yb3RhdGUgPSBmdW5jdGlvbihvcmlnaW4sIHRoZXRhKSB7XG4gIHZhciB4ID0gdGhpcy54IC0gb3JpZ2luLng7XG4gIHZhciB5ID0gdGhpcy55IC0gb3JpZ2luLnk7XG4gIHJldHVybiBuZXcgVmVjMihcbiAgICB4ICogTWF0aC5jb3ModGhldGEpIC0geSAqIE1hdGguc2luKHRoZXRhKSArIG9yaWdpbi54LFxuICAgIHggKiBNYXRoLnNpbih0aGV0YSkgKyB5ICogTWF0aC5jb3ModGhldGEpICsgb3JpZ2luLnlcbiAgKTtcbn07XG5cblZlYzIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAnKCcgKyB0aGlzLnggKyAnLCAnICsgdGhpcy55ICsgJyknO1xufTtcblxuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbmZ1bmN0aW9uIHRlc3RfVmVjMigpIHtcbiAgdmFyIGFzc2VydCA9IGZ1bmN0aW9uKGxhYmVsLCBleHByZXNzaW9uKSB7XG4gICAgY29uc29sZS5sb2coJ1ZlYzIoJyArIGxhYmVsICsgJyk6ICcgKyAoZXhwcmVzc2lvbiA9PSB0cnVlID8gJ1BBU1MnIDogJ0ZBSUwnKSk7XG4gICAgaWYgKGV4cHJlc3Npb24gIT0gdHJ1ZSkgdGhyb3cgJ2Fzc2VydGlvbiBmYWlsZWQnO1xuICB9O1xuXG4gIGFzc2VydCgnZXF1YWxpdHknLCBuZXcgVmVjMig1LCAzKS5lcXVhbHMobmV3IFZlYzIoNSwgMykpKTtcbiAgYXNzZXJ0KCdlcHNpbG9uIGVxdWFsaXR5JywgbmV3IFZlYzIoMSwgMikuZXBzaWxvbkVxdWFscyhuZXcgVmVjMigxLjAxLCAyLjAyKSwgMC4wMykpO1xuICBhc3NlcnQoJ2Vwc2lsb24gbm9uLWVxdWFsaXR5JywgIW5ldyBWZWMyKDEsIDIpLmVwc2lsb25FcXVhbHMobmV3IFZlYzIoMS4wMSwgMi4wMiksIDAuMDEpKTtcbiAgYXNzZXJ0KCdhZGRpdGlvbicsIG5ldyBWZWMyKDEsIDEpLmFkZChuZXcgVmVjMigyLCAzKSkuZXF1YWxzKG5ldyBWZWMyKDMsIDQpKSk7XG4gIGFzc2VydCgnc3VidHJhY3Rpb24nLCBuZXcgVmVjMig0LCAzKS5zdWIobmV3IFZlYzIoMiwgMSkpLmVxdWFscyhuZXcgVmVjMigyLCAyKSkpO1xuICBhc3NlcnQoJ211bHRpcGx5JywgbmV3IFZlYzIoMiwgNCkubXVsKG5ldyBWZWMyKDIsIDEpKS5lcXVhbHMobmV3IFZlYzIoNCwgNCkpKTtcbiAgYXNzZXJ0KCdkaXZpZGUnLCBuZXcgVmVjMig0LCAyKS5kaXYobmV3IFZlYzIoMiwgMikpLmVxdWFscyhuZXcgVmVjMigyLCAxKSkpO1xuICBhc3NlcnQoJ3NjYWxlJywgbmV3IFZlYzIoNCwgMykuc2NhbGUoMikuZXF1YWxzKG5ldyBWZWMyKDgsIDYpKSk7XG4gIGFzc2VydCgnbXV0YWJsZSBzZXQnLCBuZXcgVmVjMigxLCAxKS5tdXRhYmxlU2V0KG5ldyBWZWMyKDIsIDMpKS5lcXVhbHMobmV3IFZlYzIoMiwgMykpKTtcbiAgYXNzZXJ0KCdtdXRhYmxlIGFkZGl0aW9uJywgbmV3IFZlYzIoMSwgMSkubXV0YWJsZUFkZChuZXcgVmVjMigyLCAzKSkuZXF1YWxzKG5ldyBWZWMyKDMsIDQpKSk7XG4gIGFzc2VydCgnbXV0YWJsZSBzdWJ0cmFjdGlvbicsIG5ldyBWZWMyKDQsIDMpLm11dGFibGVTdWIobmV3IFZlYzIoMiwgMSkpLmVxdWFscyhuZXcgVmVjMigyLCAyKSkpO1xuICBhc3NlcnQoJ211dGFibGUgbXVsdGlwbHknLCBuZXcgVmVjMigyLCA0KS5tdXRhYmxlTXVsKG5ldyBWZWMyKDIsIDEpKS5lcXVhbHMobmV3IFZlYzIoNCwgNCkpKTtcbiAgYXNzZXJ0KCdtdXRhYmxlIGRpdmlkZScsIG5ldyBWZWMyKDQsIDIpLm11dGFibGVEaXYobmV3IFZlYzIoMiwgMikpLmVxdWFscyhuZXcgVmVjMigyLCAxKSkpO1xuICBhc3NlcnQoJ211dGFibGUgc2NhbGUnLCBuZXcgVmVjMig0LCAzKS5tdXRhYmxlU2NhbGUoMikuZXF1YWxzKG5ldyBWZWMyKDgsIDYpKSk7XG4gIGFzc2VydCgnbGVuZ3RoJywgTWF0aC5hYnMobmV3IFZlYzIoNCwgNCkubGVuZ3RoKCkgLSA1LjY1Njg1KSA8PSAwLjAwMDAxKTtcbiAgYXNzZXJ0KCdsZW5ndGgyJywgbmV3IFZlYzIoMiwgNCkubGVuZ3RoMigpID09IDIwKTtcbiAgYXNzZXJ0KCdkaXN0JywgTWF0aC5hYnMobmV3IFZlYzIoMiwgNCkuZGlzdChuZXcgVmVjMigzLCA1KSkgLSAxLjQxNDIxMzUpIDw9IDAuMDAwMDAxKTtcbiAgYXNzZXJ0KCdkaXN0MicsIG5ldyBWZWMyKDIsIDQpLmRpc3QyKG5ldyBWZWMyKDMsIDUpKSA9PSAyKTtcblxuICB2YXIgbm9ybWFsID0gbmV3IFZlYzIoMiwgNCkubm9ybWFsKCk7XG4gIGFzc2VydChcbiAgICAnbm9ybWFsJyxcbiAgICBNYXRoLmFicyhub3JtYWwubGVuZ3RoKCkgLSAxLjApIDw9IDAuMDAwMDEgJiZcbiAgICAgIG5vcm1hbC5lcHNpbG9uRXF1YWxzKG5ldyBWZWMyKDAuNDQ3MiwgMC44OTQ0MyksIDAuMDAwMSlcbiAgKTtcbiAgYXNzZXJ0KCdkb3QnLCBuZXcgVmVjMigyLCAzKS5kb3QobmV3IFZlYzIoNCwgMSkpID09IDExKTtcbiAgYXNzZXJ0KCdhbmdsZScsIG5ldyBWZWMyKDAsIC0xKS5hbmdsZShuZXcgVmVjMigxLCAwKSkgKiAoMTgwIC8gTWF0aC5QSSkgPT0gOTApO1xuICBhc3NlcnQoJ2FuZ2xlMicsIG5ldyBWZWMyKDEsIDEpLmFuZ2xlMihuZXcgVmVjMigxLCAwKSwgbmV3IFZlYzIoMiwgMSkpICogKDE4MCAvIE1hdGguUEkpID09IDkwKTtcbiAgYXNzZXJ0KCdyb3RhdGUnLCBuZXcgVmVjMigyLCAwKS5yb3RhdGUobmV3IFZlYzIoMSwgMCksIE1hdGguUEkgLyAyKS5lcXVhbHMobmV3IFZlYzIoMSwgMSkpKTtcbiAgYXNzZXJ0KCd0b1N0cmluZycsIG5ldyBWZWMyKDIsIDQpID09ICcoMiwgNCknKTtcbn1cbi8qIGVzbGludC1lbmFibGUgbm8tdW51c2VkLXZhcnMgKi9cbiIsIi8qXG5Db3B5cmlnaHQgMjAxMyBTdWIgUHJvdG9jb2wgYW5kIG90aGVyIGNvbnRyaWJ1dG9yc1xuaHR0cDovL3N1YnByb3RvY29sLmNvbS9cblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nXG5hIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcblwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xud2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvXG5wZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG9cbnRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbmluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG5NRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORFxuTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRVxuTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTlxuT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OXG5XSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiovXG5cbndpbmRvdy5yZXF1ZXN0QW5pbUZyYW1lID1cbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7XG4gIH07XG5cbnZhciBWZWMyID0gcmVxdWlyZSgnLi92ZWMyJyk7XG52YXIgY29uc3RyYWludCA9IHJlcXVpcmUoJy4vY29uc3RyYWludCcpO1xudmFyIFBpbkNvbnN0cmFpbnQgPSBjb25zdHJhaW50LlBpbkNvbnN0cmFpbnQ7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IFZlcmxldEpTO1xuZXhwb3J0cy5QYXJ0aWNsZSA9IFBhcnRpY2xlO1xuZXhwb3J0cy5Db21wb3NpdGUgPSBDb21wb3NpdGU7XG5cbmZ1bmN0aW9uIFBhcnRpY2xlKHBvcykge1xuICB0aGlzLnBvcyA9IG5ldyBWZWMyKCkubXV0YWJsZVNldChwb3MpO1xuICB0aGlzLmxhc3RQb3MgPSBuZXcgVmVjMigpLm11dGFibGVTZXQocG9zKTtcbn1cblxuUGFydGljbGUucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbihjdHgpIHtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKHRoaXMucG9zLngsIHRoaXMucG9zLnksIDIsIDAsIDIgKiBNYXRoLlBJKTtcbiAgY3R4LmZpbGxTdHlsZSA9ICcjMmRhZDhmJztcbiAgY3R4LmZpbGwoKTtcbn07XG5cbmZ1bmN0aW9uIFZlcmxldEpTKHdpZHRoLCBoZWlnaHQsIGNhbnZhcykge1xuICB0aGlzLndpZHRoID0gd2lkdGg7XG4gIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgdGhpcy5jdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgdGhpcy5tb3VzZSA9IG5ldyBWZWMyKDAsIDApO1xuICB0aGlzLm1vdXNlRG93biA9IGZhbHNlO1xuICB0aGlzLmRyYWdnZWRFbnRpdHkgPSBudWxsO1xuICB0aGlzLnNlbGVjdGlvblJhZGl1cyA9IDIwO1xuICB0aGlzLmhpZ2hsaWdodENvbG9yID0gJyM0ZjU0NWMnO1xuXG4gIHRoaXMuYm91bmRzID0gZnVuY3Rpb24ocGFydGljbGUpIHtcbiAgICBpZiAocGFydGljbGUucG9zLnkgPiB0aGlzLmhlaWdodCAtIDEpIHBhcnRpY2xlLnBvcy55ID0gdGhpcy5oZWlnaHQgLSAxO1xuXG4gICAgaWYgKHBhcnRpY2xlLnBvcy54IDwgMCkgcGFydGljbGUucG9zLnggPSAwO1xuXG4gICAgaWYgKHBhcnRpY2xlLnBvcy54ID4gdGhpcy53aWR0aCAtIDEpIHBhcnRpY2xlLnBvcy54ID0gdGhpcy53aWR0aCAtIDE7XG4gIH07XG5cbiAgdmFyIF90aGlzID0gdGhpcztcblxuICAvLyBwcmV2ZW50IGNvbnRleHQgbWVudVxuICB0aGlzLmNhbnZhcy5vbmNvbnRleHRtZW51ID0gZnVuY3Rpb24oZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgfTtcblxuICB0aGlzLmNhbnZhcy5vbm1vdXNlZG93biA9IGZ1bmN0aW9uKC8qIGUgKi8pIHtcbiAgICBfdGhpcy5tb3VzZURvd24gPSB0cnVlO1xuICAgIHZhciBuZWFyZXN0ID0gX3RoaXMubmVhcmVzdEVudGl0eSgpO1xuICAgIGlmIChuZWFyZXN0KSB7XG4gICAgICBfdGhpcy5kcmFnZ2VkRW50aXR5ID0gbmVhcmVzdDtcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5jYW52YXMub25tb3VzZXVwID0gZnVuY3Rpb24oLyogZSAqLykge1xuICAgIF90aGlzLm1vdXNlRG93biA9IGZhbHNlO1xuICAgIF90aGlzLmRyYWdnZWRFbnRpdHkgPSBudWxsO1xuICB9O1xuXG4gIHRoaXMuY2FudmFzLm9ubW91c2Vtb3ZlID0gZnVuY3Rpb24oZSkge1xuICAgIHZhciByZWN0ID0gX3RoaXMuY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIF90aGlzLm1vdXNlLnggPSBlLmNsaWVudFggLSByZWN0LmxlZnQ7XG4gICAgX3RoaXMubW91c2UueSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuICB9O1xuXG4gIC8vIHNpbXVsYXRpb24gcGFyYW1zXG4gIHRoaXMuZ3Jhdml0eSA9IG5ldyBWZWMyKDAsIDAuMik7XG4gIHRoaXMuZnJpY3Rpb24gPSAwLjk5O1xuICB0aGlzLmdyb3VuZEZyaWN0aW9uID0gMC44O1xuXG4gIC8vIGhvbGRzIGNvbXBvc2l0ZSBlbnRpdGllc1xuICB0aGlzLmNvbXBvc2l0ZXMgPSBbXTtcbn1cblxuVmVybGV0SlMucHJvdG90eXBlLkNvbXBvc2l0ZSA9IENvbXBvc2l0ZTtcblxuZnVuY3Rpb24gQ29tcG9zaXRlKCkge1xuICB0aGlzLnBhcnRpY2xlcyA9IFtdO1xuICB0aGlzLmNvbnN0cmFpbnRzID0gW107XG5cbiAgdGhpcy5kcmF3UGFydGljbGVzID0gbnVsbDtcbiAgdGhpcy5kcmF3Q29uc3RyYWludHMgPSBudWxsO1xufVxuXG5Db21wb3NpdGUucHJvdG90eXBlLnBpbiA9IGZ1bmN0aW9uKGluZGV4LCBwb3MpIHtcbiAgcG9zID0gcG9zIHx8IHRoaXMucGFydGljbGVzW2luZGV4XS5wb3M7XG4gIHZhciBwYyA9IG5ldyBQaW5Db25zdHJhaW50KHRoaXMucGFydGljbGVzW2luZGV4XSwgcG9zKTtcbiAgdGhpcy5jb25zdHJhaW50cy5wdXNoKHBjKTtcbiAgcmV0dXJuIHBjO1xufTtcblxuVmVybGV0SlMucHJvdG90eXBlLmZyYW1lID0gZnVuY3Rpb24oc3RlcCkge1xuICB2YXIgaSwgaiwgYztcblxuICBmb3IgKGMgaW4gdGhpcy5jb21wb3NpdGVzKSB7XG4gICAgZm9yIChpIGluIHRoaXMuY29tcG9zaXRlc1tjXS5wYXJ0aWNsZXMpIHtcbiAgICAgIHZhciBwYXJ0aWNsZXMgPSB0aGlzLmNvbXBvc2l0ZXNbY10ucGFydGljbGVzO1xuXG4gICAgICAvLyBjYWxjdWxhdGUgdmVsb2NpdHlcbiAgICAgIHZhciB2ZWxvY2l0eSA9IHBhcnRpY2xlc1tpXS5wb3Muc3ViKHBhcnRpY2xlc1tpXS5sYXN0UG9zKS5zY2FsZSh0aGlzLmZyaWN0aW9uKTtcblxuICAgICAgLy8gZ3JvdW5kIGZyaWN0aW9uXG4gICAgICBpZiAocGFydGljbGVzW2ldLnBvcy55ID49IHRoaXMuaGVpZ2h0IC0gMSAmJiB2ZWxvY2l0eS5sZW5ndGgyKCkgPiAwLjAwMDAwMSkge1xuICAgICAgICB2YXIgbSA9IHZlbG9jaXR5Lmxlbmd0aCgpO1xuICAgICAgICB2ZWxvY2l0eS54IC89IG07XG4gICAgICAgIHZlbG9jaXR5LnkgLz0gbTtcbiAgICAgICAgdmVsb2NpdHkubXV0YWJsZVNjYWxlKG0gKiB0aGlzLmdyb3VuZEZyaWN0aW9uKTtcbiAgICAgIH1cblxuICAgICAgLy8gc2F2ZSBsYXN0IGdvb2Qgc3RhdGVcbiAgICAgIHBhcnRpY2xlc1tpXS5sYXN0UG9zLm11dGFibGVTZXQocGFydGljbGVzW2ldLnBvcyk7XG5cbiAgICAgIC8vIGdyYXZpdHlcbiAgICAgIHBhcnRpY2xlc1tpXS5wb3MubXV0YWJsZUFkZCh0aGlzLmdyYXZpdHkpO1xuXG4gICAgICAvLyBpbmVydGlhXG4gICAgICBwYXJ0aWNsZXNbaV0ucG9zLm11dGFibGVBZGQodmVsb2NpdHkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGhhbmRsZSBkcmFnZ2luZyBvZiBlbnRpdGllc1xuICBpZiAodGhpcy5kcmFnZ2VkRW50aXR5KSB0aGlzLmRyYWdnZWRFbnRpdHkucG9zLm11dGFibGVTZXQodGhpcy5tb3VzZSk7XG5cbiAgLy8gcmVsYXhcbiAgdmFyIHN0ZXBDb2VmID0gMSAvIHN0ZXA7XG4gIGZvciAoYyBpbiB0aGlzLmNvbXBvc2l0ZXMpIHtcbiAgICB2YXIgY29uc3RyYWludHMgPSB0aGlzLmNvbXBvc2l0ZXNbY10uY29uc3RyYWludHM7XG4gICAgZm9yIChpID0gMDsgaSA8IHN0ZXA7ICsraSkgZm9yIChqIGluIGNvbnN0cmFpbnRzKSBjb25zdHJhaW50c1tqXS5yZWxheChzdGVwQ29lZik7XG4gIH1cblxuICAvLyBib3VuZHMgY2hlY2tpbmdcbiAgZm9yIChjIGluIHRoaXMuY29tcG9zaXRlcykge1xuICAgIHBhcnRpY2xlcyA9IHRoaXMuY29tcG9zaXRlc1tjXS5wYXJ0aWNsZXM7XG4gICAgZm9yIChpIGluIHBhcnRpY2xlcykgdGhpcy5ib3VuZHMocGFydGljbGVzW2ldKTtcbiAgfVxufTtcblxuVmVybGV0SlMucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGksIGM7XG5cbiAgdGhpcy5jdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xuXG4gIGZvciAoYyBpbiB0aGlzLmNvbXBvc2l0ZXMpIHtcbiAgICAvLyBkcmF3IGNvbnN0cmFpbnRzXG4gICAgaWYgKHRoaXMuY29tcG9zaXRlc1tjXS5kcmF3Q29uc3RyYWludHMpIHtcbiAgICAgIHRoaXMuY29tcG9zaXRlc1tjXS5kcmF3Q29uc3RyYWludHModGhpcy5jdHgsIHRoaXMuY29tcG9zaXRlc1tjXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjb25zdHJhaW50cyA9IHRoaXMuY29tcG9zaXRlc1tjXS5jb25zdHJhaW50cztcbiAgICAgIGZvciAoaSBpbiBjb25zdHJhaW50cykgY29uc3RyYWludHNbaV0uZHJhdyh0aGlzLmN0eCk7XG4gICAgfVxuXG4gICAgLy8gZHJhdyBwYXJ0aWNsZXNcbiAgICBpZiAodGhpcy5jb21wb3NpdGVzW2NdLmRyYXdQYXJ0aWNsZXMpIHtcbiAgICAgIHRoaXMuY29tcG9zaXRlc1tjXS5kcmF3UGFydGljbGVzKHRoaXMuY3R4LCB0aGlzLmNvbXBvc2l0ZXNbY10pO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcGFydGljbGVzID0gdGhpcy5jb21wb3NpdGVzW2NdLnBhcnRpY2xlcztcbiAgICAgIGZvciAoaSBpbiBwYXJ0aWNsZXMpIHBhcnRpY2xlc1tpXS5kcmF3KHRoaXMuY3R4KTtcbiAgICB9XG4gIH1cblxuICAvLyBoaWdobGlnaHQgbmVhcmVzdCAvIGRyYWdnZWQgZW50aXR5XG4gIHZhciBuZWFyZXN0ID0gdGhpcy5kcmFnZ2VkRW50aXR5IHx8IHRoaXMubmVhcmVzdEVudGl0eSgpO1xuICBpZiAobmVhcmVzdCkge1xuICAgIHRoaXMuY3R4LmJlZ2luUGF0aCgpO1xuICAgIHRoaXMuY3R4LmFyYyhuZWFyZXN0LnBvcy54LCBuZWFyZXN0LnBvcy55LCA4LCAwLCAyICogTWF0aC5QSSk7XG4gICAgdGhpcy5jdHguc3Ryb2tlU3R5bGUgPSB0aGlzLmhpZ2hsaWdodENvbG9yO1xuICAgIHRoaXMuY3R4LnN0cm9rZSgpO1xuICB9XG59O1xuXG5WZXJsZXRKUy5wcm90b3R5cGUubmVhcmVzdEVudGl0eSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYywgaTtcbiAgdmFyIGQyTmVhcmVzdCA9IDA7XG4gIHZhciBlbnRpdHkgPSBudWxsO1xuICB2YXIgY29uc3RyYWludHNOZWFyZXN0ID0gbnVsbDtcblxuICAvLyBmaW5kIG5lYXJlc3QgcG9pbnRcbiAgZm9yIChjIGluIHRoaXMuY29tcG9zaXRlcykge1xuICAgIHZhciBwYXJ0aWNsZXMgPSB0aGlzLmNvbXBvc2l0ZXNbY10ucGFydGljbGVzO1xuICAgIGZvciAoaSBpbiBwYXJ0aWNsZXMpIHtcbiAgICAgIHZhciBkMiA9IHBhcnRpY2xlc1tpXS5wb3MuZGlzdDIodGhpcy5tb3VzZSk7XG4gICAgICBpZiAoZDIgPD0gdGhpcy5zZWxlY3Rpb25SYWRpdXMgKiB0aGlzLnNlbGVjdGlvblJhZGl1cyAmJiAoZW50aXR5ID09IG51bGwgfHwgZDIgPCBkMk5lYXJlc3QpKSB7XG4gICAgICAgIGVudGl0eSA9IHBhcnRpY2xlc1tpXTtcbiAgICAgICAgY29uc3RyYWludHNOZWFyZXN0ID0gdGhpcy5jb21wb3NpdGVzW2NdLmNvbnN0cmFpbnRzO1xuICAgICAgICBkMk5lYXJlc3QgPSBkMjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBzZWFyY2ggZm9yIHBpbm5lZCBjb25zdHJhaW50cyBmb3IgdGhpcyBlbnRpdHlcbiAgZm9yIChpIGluIGNvbnN0cmFpbnRzTmVhcmVzdClcbiAgICBpZiAoY29uc3RyYWludHNOZWFyZXN0W2ldIGluc3RhbmNlb2YgUGluQ29uc3RyYWludCAmJiBjb25zdHJhaW50c05lYXJlc3RbaV0uYSA9PSBlbnRpdHkpXG4gICAgICBlbnRpdHkgPSBjb25zdHJhaW50c05lYXJlc3RbaV07XG5cbiAgcmV0dXJuIGVudGl0eTtcbn07XG4iXX0=
