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
  const GOAL_HALF_WIDTH = 195;
  const SPIN_CURVE = 120;
  const POST_OFFSET_METERS = 4;
  const DEFAULT_WALL_MOTION = { amplitude: 32, angularSpeed: 5, phase: 0 };

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function randomShot(random = Math.random) {
    const spot = random();
    if (spot < 0.25) return { kind: "penalty", distance: 11, offsetMeters: 0 };

    const shift = random();
    const distance = 18 + random() * 12;
    const offsetMeters = spot < 0.5 ? -2 + shift * 4
      : spot < 0.75 ? 2 + shift * 2 : -4 + shift * 2;
    return {
      kind: "free-kick", distance, offsetMeters,
      wallMotion: {
        amplitude: 24 + random() * 18,
        angularSpeed: 3.8 + random() * 1.8,
        phase: random() * Math.PI * 2,
      },
    };
  }

  function sceneFor(shot) {
    const centerX = WIDTH / 2;
    const goal = { left: centerX - GOAL_HALF_WIDTH, right: centerX + GOAL_HALF_WIDTH,
      top: 194, bottom: 364, centerX };
    const ball = { x: centerX + shot.offsetMeters * GOAL_HALF_WIDTH / POST_OFFSET_METERS, y: 510 };
    const wallT = 0.53;
    const wall = shot.kind === "free-kick" ? {
      centerX: ball.x + (centerX - ball.x) * wallT,
      bottom: ball.y + (goal.bottom - ball.y) * wallT + 20,
      width: 154,
      height: 105,
      t: wallT,
      motion: shot.wallMotion || DEFAULT_WALL_MOTION,
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

  function aimFromDrag(scene, startAim, deltaX, deltaY, width, height, rotated) {
    const x = rotated ? deltaY / height * WIDTH : deltaX / width * WIDTH;
    const y = rotated ? -deltaX / width * HEIGHT : deltaY / height * HEIGHT;
    return clampAim(scene, startAim.x + x, startAim.y + y);
  }

  function accuracySpread(power, spin) {
    const deviation = Math.abs(power - 0.55) / 0.55;
    const curve = Math.abs(spin);
    const combination = Math.max(0, power - 0.55) * curve;
    return {
      x: 18 + 65 * deviation ** 1.4 + 48 * curve ** 1.3 + 120 * combination,
      y: 15 + 35 * deviation ** 1.4 + 28 * curve ** 1.3 + 65 * combination,
    };
  }

  function normal(random) {
    return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-8))) * Math.cos(2 * Math.PI * random());
  }

  function curvedCoordinate(start, middle, end, middleT, t) {
    const linear = start + (end - start) * t;
    const bend = middle - (start + (end - start) * middleT);
    return linear + bend * t * (1 - t) / (middleT * (1 - middleT));
  }

  function pathPoint(flight, t, actual = false) {
    if (flight.missedBall) return flight.scene.ball;
    if (flight.curvePath) {
      const { ball } = flight.scene;
      const { middleT, middleX, middleY, endX, endY } = flight.curvePath;
      return {
        x: curvedCoordinate(ball.x, middleX, endX, middleT, t),
        y: curvedCoordinate(ball.y, middleY, endY, middleT, t),
      };
    }
    const { scene, aim, power, spin } = flight;
    const loft = Math.max(0, 12 + (scene.goal.bottom - aim.y) * 0.2 + Math.max(0, power - 0.55) * 24)
      + (flight.guaranteedGoal ? 42 : 0);
    const highPowerRise = Math.max(0, (power - 0.72) / 0.28) * 26;
    const drift = actual ? t ** 1.6 : 0;
    const groundY = scene.ball.y + (scene.goal.bottom - scene.ball.y) * t;
    const y = scene.ball.y + (aim.y - scene.ball.y) * t - loft * 4 * t * (1 - t)
      - highPowerRise * t * t + flight.scatter.y * drift;

    return {
      x: scene.ball.x + (aim.x - scene.ball.x) * t + spin * SPIN_CURVE * t * t + flight.scatter.x * drift,
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

  function wallCenterAt(scene, timeSeconds) {
    if (!scene.wall) return null;
    const { amplitude, angularSpeed, phase } = scene.wall.motion;
    return scene.wall.centerX + amplitude * Math.sin(phase + angularSpeed * timeSeconds);
  }

  function flightDuration(shot, power) {
    return 1.72 - power * 0.72 + (shot.distance - 11) * 0.012;
  }

  function aimedSide(scene, aim, spin) {
    return Math.sign(aim.x - scene.goal.centerX) || Math.sign(spin);
  }

  function curlPreviewPath(scene, aim, power, spin) {
    const middleT = scene.wall?.t ?? 0.53;
    const endX = aim.x === scene.goal.centerX ? aim.x + spin * SPIN_CURVE : aim.x;
    const endY = aim.y - Math.max(0, (power - 0.72) / 0.28) * 26;
    const linearMiddleY = scene.ball.y + (endY - scene.ball.y) * middleT;
    const wall = scene.wall;
    return {
      middleT,
      middleX: wall
        ? wall.centerX - Math.sign(spin) * (wall.width / 2 + wall.motion.amplitude + 25)
        : scene.ball.x - Math.sign(spin) * 95,
      middleY: wall
        ? clamp(linearMiddleY, wall.bottom - wall.height + 6, wall.bottom - 42)
        : linearMiddleY - 18,
      endX, endY,
    };
  }

  function buildGuaranteedGoalFlight({ shot, aim, power, spin, wallTime }) {
    const scene = sceneFor(shot);
    const side = aim.x < scene.goal.centerX ? -1 : 1;
    return {
      shot, scene, power, spin, wallTime, guaranteedGoal: true,
      aim: { x: scene.goal.centerX + side * (GOAL_HALF_WIDTH - 30) - spin * SPIN_CURVE,
        y: scene.goal.top + 48 },
      scatter: { x: 0, y: 0 },
      duration: flightDuration(shot, power),
      keeper: { reactionDelay: 1, guessX: scene.goal.centerX, speed: 0, endX: scene.goal.centerX },
      result: { kind: "goal", endT: 1 },
    };
  }

  function buildCurledGoalFlight({ shot, aim, power, spin, wallTime }) {
    const scene = sceneFor(shot);
    const duration = flightDuration(shot, power);
    const middleT = scene.wall?.t ?? 0.53;
    const endX = scene.goal.centerX + aimedSide(scene, aim, spin) * (GOAL_HALF_WIDTH - 24);
    const endY = clamp(aim.y, scene.goal.top + 24, scene.goal.bottom - 14);
    const linearMiddleY = scene.ball.y + (endY - scene.ball.y) * middleT;
    const wall = scene.wall;
    const middleX = wall
      ? wallCenterAt(scene, wallTime + duration * middleT) - Math.sign(spin) * (wall.width / 2 + 30)
      : scene.ball.x - Math.sign(spin) * 95;
    const middleY = wall
      ? clamp(linearMiddleY, wall.bottom - wall.height + 6, wall.bottom - 42)
      : linearMiddleY - 18;
    return {
      shot, scene, aim: clampAim(scene, aim.x, aim.y), power, spin, wallTime,
      curvePath: { middleT, middleX, middleY, endX, endY },
      scatter: { x: 0, y: 0 }, duration,
      keeper: { reactionDelay: 1, guessX: scene.goal.centerX, speed: 0, endX: scene.goal.centerX },
      result: { kind: "goal", endT: 1 },
    };
  }

  function buildMissedBallFlight({ shot, power, spin, wallTime = 0 }) {
    const scene = sceneFor(shot);
    return {
      shot, scene, aim: startingAim(scene), power, spin, wallTime,
      scatter: { x: 0, y: 0 }, duration: 0.65, missedBall: true,
      keeper: { reactionDelay: 1, guessX: scene.goal.centerX, speed: 0, endX: scene.goal.centerX },
      result: { kind: "air", endT: 1 },
    };
  }

  function buildFlight({ shot, aim, power, spin, wallTime = 0, random = Math.random,
    guaranteedGoal = false, guaranteedCurl = false }) {
    if (guaranteedCurl && Math.abs(spin) === 1) {
      return buildCurledGoalFlight({ shot, aim, power, spin, wallTime });
    }
    if (guaranteedGoal) return buildGuaranteedGoalFlight({ shot, aim, power, spin, wallTime });
    const scene = sceneFor(shot);
    const spread = accuracySpread(power, spin);
    const flight = {
      shot, scene, aim: clampAim(scene, aim.x, aim.y), power, spin, wallTime,
      scatter: { x: normal(random) * spread.x, y: normal(random) * spread.y },
      duration: flightDuration(shot, power),
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
      const impactTime = wallTime + flight.duration * scene.wall.t;
      if (Math.abs(atWall.x - wallCenterAt(scene, impactTime)) <= scene.wall.width / 2 + 7
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

  return { WIDTH, HEIGHT, START_SCORE, randomShot, sceneFor, clampAim, startingAim, aimFromDrag, accuracySpread,
    pathPoint, ballHeight, wallCenterAt, curlPreviewPath, keeperDiveAngle, buildFlight, buildMissedBallFlight,
    applyResult };
});
