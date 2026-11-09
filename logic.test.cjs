const test = require("node:test");
const assert = require("node:assert/strict");
const game = require("./logic.js");

test("the four shot types each occupy one quarter of the random range", () => {
  const at = (bucket) => {
    const values = [bucket, 0.5, 0.5];
    return game.randomShot(() => values.shift() ?? 0.5);
  };
  for (const bucket of [0, 0.249]) assert.equal(at(bucket).kind, "penalty");
  for (const bucket of [0.25, 0.499]) assert.equal(at(bucket).offsetMeters, 0);
  for (const bucket of [0.5, 0.749]) assert.equal(at(bucket).offsetMeters, 3);
  for (const bucket of [0.75, 0.999]) assert.equal(at(bucket).offsetMeters, -3);
});

test("free kick offsets stay within the agreed center and flank ranges", () => {
  const at = (bucket, offsetDraw) => {
    const values = [bucket, offsetDraw, 0.5];
    return game.randomShot(() => values.shift() ?? 0.5).offsetMeters;
  };
  assert.equal(at(0.25, 0), -2);
  assert.ok(at(0.25, 0.999) < 2);
  assert.equal(at(0.5, 0), 2);
  assert.ok(at(0.5, 0.999) < 4);
  assert.equal(at(0.75, 0), -4);
  assert.ok(at(0.75, 0.999) < -2);
  const left = game.sceneFor({ kind: "free-kick", distance: 23, offsetMeters: -4 });
  const center = game.sceneFor({ kind: "free-kick", distance: 23, offsetMeters: 0 });
  const right = game.sceneFor({ kind: "free-kick", distance: 23, offsetMeters: 4 });
  assert.equal(left.goal.centerX, 600);
  assert.equal(center.goal.centerX, 600);
  assert.equal(right.goal.centerX, 600);
  assert.ok(left.ball.x < center.ball.x && center.ball.x < right.ball.x);
  assert.equal(center.ball.x, 600);
  assert.equal(left.ball.x, left.goal.left);
  assert.equal(right.ball.x, right.goal.right);
  for (const scene of [left, center, right]) {
    assert.equal(scene.wall.centerX,
      scene.ball.x + (scene.goal.centerX - scene.ball.x) * scene.wall.t);
  }
});

test("a well-aimed free kick can score from either side", () => {
  for (const offsetMeters of [-4, 4]) {
    const shot = { kind: "free-kick", distance: 23, offsetMeters };
    const scene = game.sceneFor(shot);
    const flight = game.buildFlight({
      shot, aim: { x: scene.goal.centerX - Math.sign(offsetMeters) * 150, y: scene.goal.top + 35 },
      power: 0.55, spin: 0, random: () => 0.25,
    });
    assert.equal(flight.result.kind, "goal", `free kick at offset ${offsetMeters} could not score`);
  }
});

test("dragging moves the aim in the same direction on landscape and rotated portrait screens", () => {
  const scene = game.sceneFor({ kind: "penalty", distance: 11, offsetMeters: 0 });
  const start = game.startingAim(scene);
  const expected = { x: start.x + 90, y: start.y - 40 };
  assert.deepEqual(game.aimFromDrag(scene, start, 45, -20, 600, 340, false), expected);
  assert.deepEqual(game.aimFromDrag(scene, start, 20, 45, 340, 600, true), expected);
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
    { kind: "penalty", distance: 11, offsetMeters: 0 },
    { kind: "free-kick", distance: 23, offsetMeters: 3 },
  ]) {
    const scene = game.sceneFor(shot);
    assert.deepEqual(game.startingAim(scene), {
      x: (scene.goal.left + scene.goal.right) / 2,
      y: (scene.goal.top + scene.goal.bottom) / 2,
    });
  }
});

test("weak shots still reach the goal plane and fly more slowly", () => {
  const shot = { kind: "free-kick", distance: 30, offsetMeters: 0 };
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
  const shot = { kind: "free-kick", distance: 20, offsetMeters: 0 };
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

test("the wall moves before the kick and its impact position decides the result", () => {
  const shot = { kind: "free-kick", distance: 20, offsetMeters: 0,
    wallMotion: { amplitude: 32, angularSpeed: 5, phase: 0 } };
  const scene = game.sceneFor(shot);
  const kickAt = (wallTime) => game.buildFlight({
    shot, aim: { x: scene.goal.centerX + 150, y: 300 }, power: 0.55, spin: 0,
    wallTime, random: () => 0.25,
  });
  const movingLeft = kickAt(0);
  const movingRight = kickAt(0.6);
  assert.equal(game.wallCenterAt(scene, 0), scene.wall.centerX);
  assert.notEqual(game.wallCenterAt(scene, 0.2), scene.wall.centerX);
  assert.ok(game.wallCenterAt(scene, movingLeft.duration * scene.wall.t) < scene.wall.centerX);
  assert.ok(game.wallCenterAt(scene, 0.6 + movingRight.duration * scene.wall.t) > scene.wall.centerX);
  assert.notEqual(movingLeft.result.kind, "wall");
  assert.equal(movingRight.result.kind, "wall");
  const impact = game.pathPoint(movingRight, scene.wall.t, true);
  const wallX = game.wallCenterAt(scene, movingRight.wallTime + movingRight.duration * scene.wall.t);
  assert.ok(Math.abs(impact.x - wallX) <= scene.wall.width / 2 + 7);
});

test("middle power scores most often, while weak and strong kicks can still score", () => {
  const shot = { kind: "penalty", distance: 11, offsetMeters: 0 };
  const scene = game.sceneFor(shot);
  const powers = [0.1, 0.3, 0.55, 0.75, 0.95];
  const goals = powers.map((power) => {
    let seed = 12345;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
    let count = 0;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const flight = game.buildFlight({
        shot, aim: { x: scene.goal.centerX + 145, y: scene.goal.top + 35 },
        power, spin: 0, random,
      });
      if (flight.result.kind === "goal") count++;
    }
    return count;
  });
  assert.ok(goals[0] > 0 && goals[4] > 0, `extreme powers never scored: ${goals}`);
  assert.ok(goals[2] < 1000, `perfect power never missed: ${goals}`);
  assert.ok(goals[0] < goals[1] && goals[1] < goals[2], `weak-side chances did not rise: ${goals}`);
  assert.ok(goals[2] > goals[3] && goals[3] > goals[4], `strong-side chances did not fall: ${goals}`);
});

test("maximum power guarantees a visible goal from every shot position and spin", () => {
  const shots = [
    { kind: "penalty", distance: 11, offsetMeters: 0 },
    ...[-4, 0, 4].map((offsetMeters) => ({ kind: "free-kick", distance: 23, offsetMeters })),
  ];
  for (const shot of shots) {
    const scene = game.sceneFor(shot);
    for (const side of [-1, 1]) {
      for (const spin of [-1, 0, 1]) {
        const flight = game.buildFlight({ shot, aim: { x: scene.goal.centerX + side * 100, y: 400 },
          power: 1, spin, guaranteedGoal: true });
        const end = game.pathPoint(flight, 1, true);
        assert.equal(flight.result.kind, "goal");
        assert.ok(end.x > scene.goal.left + 20 && end.x < scene.goal.right - 20);
        assert.ok(end.y > scene.goal.top + 10 && end.y < scene.goal.bottom);
        assert.ok(Math.abs(end.x - flight.keeper.endX) > 125);
        if (scene.wall) {
          const atWall = game.pathPoint(flight, scene.wall.t, true);
          assert.ok(atWall.y < scene.wall.bottom - scene.wall.height - 7,
            `wall obscures the guaranteed goal from ${shot.offsetMeters} m with spin ${spin}`);
          assert.ok(game.ballHeight(scene, atWall, scene.wall.t) > 2.45);
        }
      }
    }
  }
});

test("maximum spin curls around the moving wall and into the aimed height by a post", () => {
  const shots = [
    { kind: "penalty", distance: 11, offsetMeters: 0 },
    ...[-4, 0, 4].map((offsetMeters) => ({ kind: "free-kick", distance: 23, offsetMeters })),
  ];
  for (const shot of shots) {
    const scene = game.sceneFor(shot);
    for (const spin of [-1, 1]) {
      for (const power of [0.1, 0.55, 1]) {
        for (const aimY of [scene.goal.top - 40, 250, 310, scene.goal.bottom + 40]) {
          const flight = game.buildFlight({
            shot, aim: { x: scene.goal.centerX, y: aimY }, power, spin,
            wallTime: 0.6, guaranteedCurl: true,
          });
          const end = game.pathPoint(flight, 1, true);
          const expectedY = Math.max(scene.goal.top + 24, Math.min(scene.goal.bottom - 14, aimY));
          assert.equal(flight.result.kind, "goal");
          assert.equal(end.y, expectedY);
          assert.equal(end.x, scene.goal.centerX + spin * 171);
          assert.ok(game.ballHeight(scene, end, 1) > 0.4);
          assert.ok(game.ballHeight(scene, end, 1) < 2.65);
          if (scene.wall) {
            const atWall = game.pathPoint(flight, scene.wall.t, true);
            const wallX = game.wallCenterAt(scene, flight.wallTime + flight.duration * scene.wall.t);
            assert.ok(Math.abs(atWall.x - wallX) > scene.wall.width / 2 + 20);
            assert.ok(atWall.y > scene.wall.bottom - scene.wall.height - 18);
            assert.ok(atWall.y < scene.wall.bottom - 18);
          }
        }
      }
    }
  }
  const ordinary = game.buildFlight({
    shot: shots[0], aim: game.startingAim(game.sceneFor(shots[0])), power: 0.55,
    spin: 0.99, guaranteedCurl: true, random: () => 0.25,
  });
  assert.equal(ordinary.curvePath, undefined);
});

test("maximum spin preview suggests the bend without revealing the guaranteed goal", () => {
  const shot = { kind: "free-kick", distance: 23, offsetMeters: 0 };
  const scene = game.sceneFor(shot);
  const aim = game.startingAim(scene);
  const preview = { scene, aim, power: 0.55, spin: 1, scatter: { x: 0, y: 0 },
    curvePath: game.curlPreviewPath(scene, aim, 0.55, 1) };
  const flight = game.buildFlight({ shot, aim, power: 0.55, spin: 1, guaranteedCurl: true });
  const atWall = game.pathPoint(preview, scene.wall.t);
  assert.ok(atWall.x < scene.wall.centerX - scene.wall.width / 2 - scene.wall.motion.amplitude);
  assert.notEqual(game.pathPoint(preview, 1).x, game.pathPoint(flight, 1, true).x);
});

test("maximum spin follows the aimed side even when spin points the other way", () => {
  const shots = [
    { kind: "penalty", distance: 11, offsetMeters: 0 },
    ...[-4, 0, 4].map((offsetMeters) => ({ kind: "free-kick", distance: 23, offsetMeters })),
  ];
  for (const shot of shots) {
    const scene = game.sceneFor(shot);
    for (const side of [-1, 1]) {
      for (const spin of [-1, 1]) {
        const aim = { x: scene.goal.centerX + side * 70, y: 280 };
        const flight = game.buildFlight({ shot, aim, power: 0.55, spin, guaranteedCurl: true });
        const preview = { scene, aim, power: 0.55, spin, scatter: { x: 0, y: 0 },
          curvePath: game.curlPreviewPath(scene, aim, 0.55, spin) };
        const end = game.pathPoint(flight, 1, true);
        assert.equal(end.x, side < 0 ? scene.goal.left + 24 : scene.goal.right - 24);
        assert.equal(game.pathPoint(preview, 1).x, aim.x);
        if (scene.wall) {
          const atWall = game.pathPoint(flight, scene.wall.t, true);
          const wallX = game.wallCenterAt(scene, flight.wallTime + flight.duration * scene.wall.t);
          assert.ok(Math.abs(atWall.x - wallX) > scene.wall.width / 2 + 20);
        }
      }
    }
  }
});

test("missing the ball leaves it in place and costs a point", () => {
  const shot = { kind: "free-kick", distance: 23, offsetMeters: 4 };
  const flight = game.buildMissedBallFlight({ shot, power: 0.55, spin: 1 });
  assert.equal(flight.result.kind, "air");
  for (const t of [0, 0.5, 1]) {
    assert.deepEqual(game.pathPoint(flight, t, true), flight.scene.ball);
  }
  assert.deepEqual(game.applyResult(3, flight.result.kind), { score: 2, over: false });
});

test("the wall can be cleared above or bypassed at the side", () => {
  const shot = { kind: "free-kick", distance: 20, offsetMeters: 0 };
  const scene = game.sceneFor(shot);
  const options = { shot, power: 0.55, spin: 0, random: () => 0.25 };
  const above = game.buildFlight({ ...options, aim: { x: scene.goal.centerX, y: scene.goal.top + 20 } });
  const around = game.buildFlight({ ...options, aim: { x: scene.goal.right - 25, y: 300 } });
  assert.notEqual(above.result.kind, "wall");
  assert.notEqual(around.result.kind, "wall");
});

test("a ball above the goalkeeper's visible reach is not called a save", () => {
  const shot = { kind: "penalty", distance: 11, offsetMeters: 0 };
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
  const shot = { kind: "penalty", distance: 11, offsetMeters: 0 };
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
  const shot = { kind: "penalty", distance: 11, offsetMeters: 0 };
  const scene = game.sceneFor(shot);
  for (const x of [scene.goal.left + 5, scene.goal.right - 5]) {
    const flight = game.buildFlight({
      shot, aim: { x, y: scene.goal.bottom - 5 }, power: 0.55, spin: 0, random: () => 0.25,
    });
    assert.equal(flight.result.kind, "post");
  }
});

test("ideal power gives a well-aimed penalty a reliable chance to score", () => {
  const shot = { kind: "penalty", distance: 11, offsetMeters: 0 };
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
  assert.ok(goals >= 425, `only ${goals}/500 ideal-power penalties scored`);
});

test("ideal power gives a well-aimed free kick a reliable chance to score", () => {
  const shot = { kind: "free-kick", distance: 23, offsetMeters: 3 };
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
  assert.ok(goals >= 400, `only ${goals}/500 ideal-power free kicks scored`);
});

test("a save intercepts the ball before it enters the goal", () => {
  const shot = { kind: "penalty", distance: 11, offsetMeters: 0 };
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
  const shot = { kind: "penalty", distance: 11, offsetMeters: 0 };
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
