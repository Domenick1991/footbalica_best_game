const test = require("node:test");
const assert = require("node:assert/strict");
const game = require("./logic.js");

test("penalty is selected only for the first fifth of random values", () => {
  assert.equal(game.randomShot(() => 0.19).kind, "penalty");
  assert.equal(game.randomShot(() => 0.2).kind, "free-kick");
});

test("middle power and no spin have the smallest trajectory spread", () => {
  const accurate = game.accuracySpread(0.55, 0);
  const strong = game.accuracySpread(1, 0);
  const curved = game.accuracySpread(0.55, 1);
  const extreme = game.accuracySpread(1, 1);
  assert.ok(accurate.x < strong.x);
  assert.ok(accurate.x < curved.x);
  assert.ok(extreme.x > strong.x && extreme.x > curved.x);
  assert.ok(extreme.y > strong.y && extreme.y > curved.y);
});

test("the starting aim is the center of either type of goal", () => {
  for (const shot of [
    { kind: "penalty", distance: 11, angle: 0 },
    { kind: "free-kick", distance: 23, angle: 25 },
  ]) {
    const scene = game.sceneFor(shot);
    assert.deepEqual(game.startingAim(scene), {
      x: (scene.goal.left + scene.goal.right) / 2,
      y: (scene.goal.top + scene.goal.bottom) / 2,
    });
  }
});

test("weak shots still reach the goal plane and fly more slowly", () => {
  const shot = { kind: "free-kick", distance: 30, angle: 0 };
  const scene = game.sceneFor(shot);
  const aim = { x: scene.goal.right - 15, y: scene.goal.top + 20 };
  const weak = game.buildFlight({ shot, aim, power: 0.05, spin: 0, random: () => 0.25 });
  const strong = game.buildFlight({ shot, aim, power: 0.9, spin: 0, random: () => 0.25 });
  assert.notEqual(weak.result.kind, "short");
  assert.equal(weak.result.endT, 1);
  assert.ok(weak.duration > strong.duration);
});

test("keeper leans toward the side he moves to", () => {
  assert.ok(game.keeperDiveAngle(600, 700) < 0, "rightward dive leaned left");
  assert.ok(game.keeperDiveAngle(600, 500) > 0, "leftward dive leaned right");
});

test("score rises for a goal and the run ends at zero", () => {
  assert.deepEqual(game.applyResult(3, "goal"), { score: 4, over: false });
  assert.deepEqual(game.applyResult(1, "save"), { score: 0, over: true });
});

test("a direct kick at the wall ends at the wall", () => {
  const shot = { kind: "free-kick", distance: 20, angle: 0 };
  const scene = game.sceneFor(shot);
  const flight = game.buildFlight({
    shot,
    aim: { x: scene.goal.centerX, y: 300 },
    power: 0.55,
    spin: 0,
    random: () => 0.25,
  });
  assert.equal(flight.result.kind, "wall");
  assert.equal(flight.result.endT, scene.wall.t);
});

test("the wall can be cleared above or bypassed at the side", () => {
  const shot = { kind: "free-kick", distance: 20, angle: 0 };
  const scene = game.sceneFor(shot);
  const options = { shot, power: 0.55, spin: 0, random: () => 0.25 };
  const above = game.buildFlight({ ...options, aim: { x: scene.goal.centerX, y: scene.goal.top + 20 } });
  const around = game.buildFlight({ ...options, aim: { x: scene.goal.right - 25, y: 300 } });
  assert.notEqual(above.result.kind, "wall");
  assert.notEqual(around.result.kind, "wall");
});

test("a ball above the goalkeeper's visible reach is not called a save", () => {
  const shot = { kind: "penalty", distance: 11, angle: 0 };
  const scene = game.sceneFor(shot);
  const flight = game.buildFlight({
    shot,
    aim: { x: scene.goal.centerX, y: scene.goal.top + 18 },
    power: 0.55,
    spin: 0,
    random: () => 0.25,
  });
  assert.equal(flight.result.kind, "goal");
});

test("low shots just inside either post count as goals", () => {
  const shot = { kind: "penalty", distance: 11, angle: 0 };
  const scene = game.sceneFor(shot);
  for (const x of [scene.goal.left + 15, scene.goal.right - 15]) {
    for (const y of [scene.goal.bottom - 5, scene.goal.bottom + 5]) {
      const flight = game.buildFlight({
        shot, aim: { x, y }, power: 0.55, spin: 0, random: () => 0.25,
      });
      assert.equal(flight.result.kind, "goal", `low shot at (${x}, ${y}) missed`);
      assert.ok(game.pathPoint(flight, 1, true).y <= scene.goal.bottom);
    }
  }
});

test("shots touching the side posts still hit the frame", () => {
  const shot = { kind: "penalty", distance: 11, angle: 0 };
  const scene = game.sceneFor(shot);
  for (const x of [scene.goal.left + 5, scene.goal.right - 5]) {
    const flight = game.buildFlight({
      shot, aim: { x, y: scene.goal.bottom - 5 }, power: 0.55, spin: 0, random: () => 0.25,
    });
    assert.equal(flight.result.kind, "post");
  }
});

test("a normal aimed penalty has a reasonable chance to score", () => {
  const shot = { kind: "penalty", distance: 11, angle: 0 };
  const scene = game.sceneFor(shot);
  let seed = 12345;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  let goals = 0;
  for (let attempt = 0; attempt < 500; attempt++) {
    const flight = game.buildFlight({
      shot,
      aim: { x: scene.goal.centerX + 145, y: scene.goal.top + 35 },
      power: 0.55,
      spin: 0,
      random,
    });
    if (flight.result.kind === "goal") goals++;
  }
  assert.ok(goals >= 150, `only ${goals}/500 aimed penalties scored`);
});

test("a free kick aimed around the wall has a reasonable chance", () => {
  const shot = { kind: "free-kick", distance: 23, angle: 25 };
  const scene = game.sceneFor(shot);
  let seed = 12345;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  let goals = 0;
  for (let attempt = 0; attempt < 500; attempt++) {
    const flight = game.buildFlight({
      shot, aim: { x: scene.goal.centerX + 153, y: scene.goal.top + 27 },
      power: 0.55, spin: 0, random,
    });
    if (flight.result.kind === "goal") goals++;
  }
  assert.ok(goals >= 150, `only ${goals}/500 aimed free kicks scored`);
});

test("a save intercepts the ball before it enters the goal", () => {
  const shot = { kind: "penalty", distance: 11, angle: 0 };
  const scene = game.sceneFor(shot);
  const flight = game.buildFlight({
    shot,
    aim: { x: scene.goal.centerX, y: scene.goal.top + 80 },
    power: 0.55,
    spin: 0,
    random: () => 0.25,
  });
  assert.equal(flight.result.kind, "save");
  assert.ok(flight.result.endT > 0.94 && flight.result.endT < 1,
    "the save did not happen beside the goalkeeper");
});

test("every save touches the ball at the displayed interception point", () => {
  const shot = { kind: "penalty", distance: 11, angle: 0 };
  const scene = game.sceneFor(shot);
  let seed = 7;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  for (const power of [0.25, 0.4, 0.55, 0.75]) {
    for (let x = -180; x <= 180; x += 10) {
      for (let y = scene.goal.top + 20; y < scene.goal.bottom; y += 25) {
        const flight = game.buildFlight({
          shot, aim: { x: scene.goal.centerX + x, y }, power, spin: 0, random,
        });
        if (flight.result.kind !== "save") continue;
        const point = game.pathPoint(flight, flight.result.endT, true);
        const groundY = scene.ball.y + (scene.goal.bottom - scene.ball.y) * flight.result.endT;
        const ballHeight = 0.23 + (groundY - point.y) / 65;
        const lean = game.keeperDiveAngle(scene.goal.centerX, flight.keeper.endX);
        const bodyX = flight.keeper.endX - Math.sin(lean) * ballHeight * 50;
        assert.ok(Math.abs(point.x - bodyX) <= 18, "keeper missed the visible ball horizontally");
        assert.ok(ballHeight <= 2.4, "keeper could not reach the visible ball vertically");
      }
    }
  }
});
