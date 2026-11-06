(function (root, factory) {
  const logic = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = logic;
  root.FootbolicaLogic = logic;
})(globalThis, function () {
  "use strict";

  const WIDTH = 1200;
  const HEIGHT = 680;
  const START_SCORE = 3;
  const SAVE_T = 0.96;

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function randomShot(random = Math.random) {
    if (random() < 0.2) return { kind: "penalty", distance: 11, angle: 0 };

    const distance = 18 + random() * 12;
    const side = random() < 0.5 ? -1 : 1;
    return { kind: "free-kick", distance, angle: side * (10 + random() * 28) };
  }

  function sceneFor(shot) {
    const centerX = WIDTH / 2 - shot.angle * 5.2;
    const goal = { left: centerX - 195, right: centerX + 195, top: 194, bottom: 364, centerX };
    const ball = { x: WIDTH / 2, y: 510 };
    const wallT = 0.53;
    const wall = shot.kind === "free-kick" ? {
      centerX: ball.x + (centerX - ball.x) * wallT,
      bottom: ball.y + (goal.bottom - ball.y) * wallT + 20,
      width: 154,
      height: 105,
      t: wallT,
    } : null;
    return { goal, ball, wall };
  }

  function clampAim(scene, x, y) {
    return {
      x: clamp(x, scene.goal.left - 110, scene.goal.right + 110),
      y: clamp(y, scene.goal.top - 90, scene.goal.bottom + 85),
    };
  }

  function startingAim(scene) {
    return { x: scene.goal.centerX, y: (scene.goal.top + scene.goal.bottom) / 2 };
  }

  function accuracySpread(power, spin) {
    const deviation = Math.abs(power - 0.55) / 0.55;
    const curve = Math.abs(spin);
    const combination = Math.max(0, power - 0.55) * curve;
    return {
      x: 4 + 35 * deviation ** 1.4 + 48 * curve ** 1.3 + 120 * combination,
      y: 3 + 18 * deviation ** 1.4 + 28 * curve ** 1.3 + 65 * combination,
    };
  }

  function normal(random) {
    return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-8))) * Math.cos(2 * Math.PI * random());
  }

  function pathPoint(flight, t, actual = false) {
    const { scene, aim, power, spin } = flight;
    const loft = Math.max(0, 12 + (scene.goal.bottom - aim.y) * 0.2 + Math.max(0, power - 0.55) * 24);
    const highPowerRise = Math.max(0, (power - 0.72) / 0.28) * 90;
    const drift = actual ? t ** 1.6 : 0;
    const groundY = scene.ball.y + (scene.goal.bottom - scene.ball.y) * t;
    const y = scene.ball.y + (aim.y - scene.ball.y) * t - loft * 4 * t * (1 - t)
      - highPowerRise * t * t + flight.scatter.y * drift;

    return {
      x: scene.ball.x + (aim.x - scene.ball.x) * t + spin * 120 * t * t + flight.scatter.x * drift,
      y: Math.min(y, groundY),
    };
  }

  function keeperDiveAngle(goalCenterX, keeperX) {
    return clamp(((goalCenterX - keeperX) / 50) * 0.18, -0.5, 0.5);
  }

  function ballHeight(scene, point, t) {
    const groundY = scene.ball.y + (scene.goal.bottom - scene.ball.y) * t;
    return Math.max(0.23, 0.23 + (groundY - point.y) / 65);
  }

  function buildFlight({ shot, aim, power, spin, random = Math.random }) {
    const scene = sceneFor(shot);
    const spread = accuracySpread(power, spin);
    const flight = {
      shot, scene, aim: clampAim(scene, aim.x, aim.y), power, spin,
      scatter: { x: normal(random) * spread.x, y: normal(random) * spread.y },
      duration: 1.72 - power * 0.72 + (shot.distance - 11) * 0.012,
    };

    const end = pathPoint(flight, 1, true);
    const interception = pathPoint(flight, SAVE_T, true);
    const reactionDelay = 0.23 + (random() - 0.5) * 0.12;
    const keeperGuess = interception.x + normal(random) * 16;
    const keeperReach = 125 * Math.max(0, flight.duration * SAVE_T - reactionDelay);
    flight.keeper = {
      reactionDelay,
      guessX: keeperGuess,
      speed: 125,
      endX: scene.goal.centerX + clamp(keeperGuess - scene.goal.centerX, -keeperReach, keeperReach),
    };

    if (scene.wall) {
      const atWall = pathPoint(flight, scene.wall.t, true);
      const wallTop = scene.wall.bottom - scene.wall.height - 18;
      const wallBottom = scene.wall.bottom - 18;
      if (Math.abs(atWall.x - scene.wall.centerX) <= scene.wall.width / 2 + 7
        && atWall.y >= wallTop - 7 && atWall.y <= wallBottom + 7) {
        flight.result = { kind: "wall", endT: scene.wall.t };
        return flight;
      }
    }

    const { goal } = scene;
    if (end.x < goal.left - 10 || end.x > goal.right + 10 || end.y < goal.top - 10) {
      flight.result = { kind: "wide", endT: 1 };
      return flight;
    }

    if (end.x < goal.left + 10 || end.x > goal.right - 10 || end.y < goal.top + 10) {
      flight.result = { kind: "post", endT: 1 };
      return flight;
    }

    const interceptionHeight = ballHeight(scene, interception, SAVE_T);
    const keeperBodyX = flight.keeper.endX
      - Math.sin(keeperDiveAngle(goal.centerX, flight.keeper.endX)) * interceptionHeight * 50;
    if (interceptionHeight <= 2.15
      && Math.abs(interception.x - keeperBodyX) <= 18) {
      flight.result = { kind: "save", endT: SAVE_T };
      return flight;
    }

    flight.result = { kind: "goal", endT: 1 };
    return flight;
  }

  function applyResult(score, kind) {
    const nextScore = score + (kind === "goal" ? 1 : -1);
    return { score: nextScore, over: nextScore === 0 };
  }

  return { WIDTH, HEIGHT, START_SCORE, randomShot, sceneFor, clampAim, startingAim, accuracySpread,
    pathPoint, ballHeight, keeperDiveAngle, buildFlight, applyResult };
});
