(function (root) {
  "use strict";

  const THREE = root.THREE;
  const logic = root.FootbolicaLogic;
  const BALL_Z = 8;
  const GOAL_Z = -16;
  const GOAL_WIDTH = 7.8;
  const GOAL_HEIGHT = 2.85;

  function standard(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra });
  }

  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    return item;
  }

  function rod(a, b, radius, material) {
    const from = new THREE.Vector3(...a);
    const to = new THREE.Vector3(...b);
    const direction = to.clone().sub(from);
    const item = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
    item.position.copy(from.add(to).multiplyScalar(0.5));
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return item;
  }

  function box(width, height, depth, material, x, y, z) {
    return mesh(new THREE.BoxGeometry(width, height, depth), material, x, y, z);
  }

  function carSilhouetteGeometry(outline) {
    const shape = new THREE.Shape();
    outline.points.forEach(([x, y], index) => {
      if (index === 0) shape.moveTo(x - outline.width / 2, outline.height - y);
      else shape.lineTo(x - outline.width / 2, outline.height - y);
    });
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < position.count; i++) {
      uv.setXY(i, (position.getX(i) + outline.width / 2) / outline.width,
        position.getY(i) / outline.height);
    }
    uv.needsUpdate = true;
    return geometry;
  }

  function seededRandom() {
    let seed = 42719;
    return () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  }

  function grassTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#205f39";
    context.fillRect(0, 0, 256, 256);
    const random = seededRandom();
    for (let i = 0; i < 4500; i++) {
      const light = random() > 0.5;
      context.fillStyle = light ? "rgba(144,185,125,.13)" : "rgba(7,45,28,.2)";
      context.fillRect(random() * 256, random() * 256, 1 + random() * 2, 2 + random() * 5);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18, 22);
    texture.anisotropy = 8;
    return texture;
  }

  function crowdTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#10192a";
    context.fillRect(0, 0, 1024, 256);
    const random = seededRandom();
    const shirts = ["#355579", "#867438", "#8d3e4b", "#71817a", "#316b59", "#463c70"];
    for (let row = 0; row < 19; row++) {
      for (let col = 0; col < 115; col++) {
        const x = col * 9 + (row % 2) * 4 + random() * 3;
        const y = row * 13 + random() * 5;
        context.fillStyle = shirts[Math.floor(random() * shirts.length)];
        context.beginPath(); context.ellipse(x, y + 7, 3.5, 6, 0, 0, Math.PI * 2); context.fill();
        context.fillStyle = ["#a4715b", "#d7a882", "#6b483e"][Math.floor(random() * 3)];
        context.beginPath(); context.arc(x, y, 2.8, 0, Math.PI * 2); context.fill();
      }
    }
    context.fillStyle = "rgba(221,229,222,.38)";
    for (let row = 1; row < 5; row++) context.fillRect(0, row * 52, 1024, 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  function signTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.fillStyle = "#123e6b";
    context.fillRect(0, 0, 1024, 128);
    for (let i = 0; i < 4; i++) {
      context.fillStyle = i % 2 ? "#f0d63d" : "#d93c70";
      context.fillRect(i * 256, 0, 12, 128);
      context.fillStyle = "#fff";
      context.font = "bold 36px Impact, Arial, sans-serif";
      context.textAlign = "center";
      context.fillText("FOOTBOLICA", i * 256 + 135, 88);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = 5;
    return texture;
  }

  function numberTexture(number, color) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    context.fillStyle = "rgba(255,255,255,0)";
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = color;
    context.font = "bold 88px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(number, 64, 96);
    return new THREE.CanvasTexture(canvas);
  }

  function stripedShirtTexture(colors) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 16;
    const context = canvas.getContext("2d");
    for (let i = 0; i < 8; i++) {
      context.fillStyle = colors[i % 2];
      context.fillRect(i * 32, 0, 32, 16);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
  }

  function dollarKitTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#e4e9d6";
    context.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 225, 340, 350, 350, 0, 0, 256, 256);
      texture.needsUpdate = true;
    };
    image.src = root.FootbolicaDollarImage;
    return texture;
  }

  function beerMugTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    context.strokeStyle = "#884519";
    context.lineWidth = 10;
    context.beginPath(); context.arc(91, 67, 19, -Math.PI / 2, Math.PI / 2); context.stroke();
    context.fillStyle = "#efae38";
    context.fillRect(30, 39, 58, 67);
    context.fillStyle = "#fff9e5";
    context.beginPath(); context.ellipse(59, 38, 36, 13, 0, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#884519";
    context.lineWidth = 5;
    context.strokeRect(30, 39, 58, 67);
    return new THREE.CanvasTexture(canvas);
  }

  function shirtTextTexture(text, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.font = "bold 82px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(text, 256, 65, 480);
    return new THREE.CanvasTexture(canvas);
  }

  function player(shirtColor, skinColor, number, goalkeeper = false, shirtName = "", wallPlayer = false, details = {}) {
    const group = new THREE.Group();
    const moneyMap = details.moneyKit ? dollarKitTexture() : null;
    const shirt = moneyMap ? standard(0xffffff, { map: moneyMap }) : details.stripes
      ? standard(0xffffff, { map: stripedShirtTexture(details.stripes) }) : standard(shirtColor);
    const sleeveMaterial = details.sleeveColor ? standard(details.sleeveColor) : shirt;
    const shorts = moneyMap ? standard(0xffffff, { map: moneyMap })
      : standard(details.shortsColor ?? (goalkeeper || wallPlayer ? shirtColor : 0x168c4d));
    const skin = standard(skinColor);
    const hair = standard(details.hairColor ?? (number === "17" ? 0x4b3027 : number === "18" ? 0x191a22 : 0x282126));
    const sock = standard(details.sockColor ?? (goalkeeper || wallPlayer ? shirtColor : 0xf8f9f4));
    const boots = standard(details.bootColor ?? (goalkeeper ? 0xe0c848 : 0x20242e));
    const trim = standard(goalkeeper ? 0xffdf7e : 0xf3f4ec);
    const faceDetail = standard(0x342a2a);

    const torso = mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.72, 14), shirt, 0, 1.23, 0);
    torso.scale.z = 0.7;
    group.add(torso);
    const shoulders = mesh(new THREE.SphereGeometry(0.32, 14, 10), shirt, 0, 1.52, 0);
    shoulders.scale.set(1.12, 0.36, 0.68);
    group.add(shoulders);
    const waist = mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.28, 12), shorts, 0, 0.74, 0);
    waist.scale.z = 0.79;
    group.add(waist);
    group.add(mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.17, 10), skin, 0, 1.68, 0));
    const collar = mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 16), trim, 0, 1.6, 0);
    collar.rotation.x = Math.PI / 2;
    group.add(collar);

    const head = mesh(new THREE.SphereGeometry(0.22, 20, 14), skin, 0, 1.93, 0);
    head.scale.set(0.92, 1.11, 0.89);
    group.add(head);
    for (const side of [-1, 1]) {
      const ear = mesh(new THREE.SphereGeometry(0.052, 10, 8), skin, side * 0.197, 1.93, 0);
      ear.scale.set(0.55, 1.05, 0.74);
      group.add(ear);
      group.add(mesh(new THREE.SphereGeometry(0.019, 8, 6), faceDetail, side * 0.075, 1.97, 0.188));
      const brow = mesh(new THREE.BoxGeometry(0.055, 0.012, 0.014), hair,
        side * 0.075, 2.025, 0.188);
      brow.rotation.z = side * -0.12;
      group.add(brow);
    }
    const nose = mesh(new THREE.SphereGeometry(0.033, 9, 7), skin, 0, 1.895, 0.206);
    nose.scale.set(0.65, 0.82, 1.1);
    group.add(nose);
    group.add(mesh(new THREE.BoxGeometry(0.064, 0.012, 0.013), faceDetail, 0, 1.815, 0.182));
    const hairCap = mesh(new THREE.SphereGeometry(0.226, 20, 9, 0, Math.PI * 2, 0, Math.PI * 0.51),
      hair, 0, 2.005, 0);
    hairCap.scale.z = 0.92;
    group.add(hairCap);
    const fringe = mesh(new THREE.SphereGeometry(0.115, 12, 8), hair, -0.08, 2.075, 0.09);
    fringe.scale.set(1.05, 0.45, 0.8);
    group.add(fringe);
    if (details.ponytail) {
      const tail = mesh(new THREE.SphereGeometry(0.11, 12, 10), hair, 0.09, 1.82, -0.27);
      tail.scale.set(0.82, 1.8, 0.78);
      group.add(tail);
      group.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), standard(0xff4e91),
        0.09, 2.04, -0.25));
    }
    if (details.clownHat) {
      group.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 16), standard(0x54e7d1),
        0, 2.22, 0));
      group.add(mesh(new THREE.ConeGeometry(0.23, 0.52, 16), standard(0xff4e91),
        0, 2.5, 0));
      const stripe = mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 16), standard(0xffe33d),
        0, 2.36, 0);
      stripe.rotation.x = Math.PI / 2;
      group.add(stripe);
      group.add(mesh(new THREE.SphereGeometry(0.10, 12, 10), standard(0xffe33d),
        0, 2.79, 0));
    }

    const legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.155, 0.75, 0);
      const inCast = details.castLeg && side === 1;
      const cast = inCast ? standard(0xdce1e5) : null;
      const shortLeg = mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.27, 10), shorts, 0, -0.12, 0);
      shortLeg.scale.z = 0.84;
      leg.add(shortLeg);
      leg.add(mesh(new THREE.CylinderGeometry(0.105, 0.09, 0.24, 10), inCast ? cast : skin, 0, -0.34, 0));
      leg.add(mesh(new THREE.SphereGeometry(0.098, 10, 8), inCast ? cast : skin, 0, -0.45, 0));
      leg.add(mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.23, 10), inCast ? cast : sock, 0, -0.57, 0));
      const boot = mesh(new THREE.SphereGeometry(0.13, 12, 8), inCast ? cast : boots, 0, -0.7, 0.09);
      boot.scale.set(0.92, 0.53, 1.55);
      leg.add(boot);
      leg.add(mesh(new THREE.BoxGeometry(0.16, 0.025, 0.28), inCast ? cast : trim, 0, -0.64, 0.07));
      if (inCast) {
        const band = standard(0x9da8b2);
        for (const y of [-0.37, -0.5, -0.63]) {
          const wrap = mesh(new THREE.TorusGeometry(0.093, 0.009, 5, 12), band, 0, y, 0);
          wrap.rotation.x = Math.PI / 2;
          leg.add(wrap);
        }
      }
      group.add(leg);
      legs.push(leg);
    }
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.325, 1.5, 0);
      const sleeve = mesh(new THREE.CylinderGeometry(0.13, 0.105, 0.27, 10), sleeveMaterial,
        side * 0.025, -0.13, 0);
      arm.add(sleeve);
      arm.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10),
        details.sleeveColor ? sleeveMaterial : trim,
        side * 0.035, -0.27, 0));
      arm.add(mesh(new THREE.CylinderGeometry(0.083, 0.065, 0.25, 10), skin,
        side * 0.05, -0.4, 0.025));
      arm.add(mesh(new THREE.SphereGeometry(0.08, 9, 7), skin, side * 0.05, -0.52, 0.03));
      const hand = mesh(new THREE.SphereGeometry(0.09, 10, 8), goalkeeper ? standard(0xffd85b) : skin,
        side * 0.09, -0.61, 0.095);
      hand.scale.set(0.88, 1.23, 0.7);
      arm.add(hand);
      arm.rotation.z = side * (goalkeeper ? 0.32 : 0.11);
      group.add(arm);
      arms.push(arm);
    }
    if (details.skewers) {
      const wood = standard(0xb18b58);
      const meat = standard(0x994b25);
      for (const offset of [-0.045, 0.045]) {
        arms[1].add(rod([0.09 + offset, -0.62, 0.09],
          [0.18 + offset, -0.04, -0.38], 0.012, wood));
        for (const amount of [0.52, 0.68, 0.84]) {
          arms[1].add(mesh(new THREE.SphereGeometry(0.055, 8, 6), meat,
            0.09 + offset + amount * 0.09, -0.62 + amount * 0.58,
            0.09 - amount * 0.47));
        }
      }
    }
    if (details.baton) {
      const baton = standard(0x232936);
      const grip = standard(0x747e8a);
      arms[0].add(rod([-0.09, -0.62, 0.09], [-0.2, -0.07, -0.28], 0.033, baton));
      arms[0].add(rod([-0.09, -0.62, 0.09], [-0.12, -0.47, -0.01], 0.041, grip));
    }
    if (details.handcuffs) {
      const metal = standard(0xabb5bf, { metalness: 0.65, roughness: 0.28 });
      for (const x of [0.09, 0.3]) {
        arms[1].add(mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 20), metal,
          x, -0.75, -0.04));
      }
      arms[1].add(rod([0.18, -0.75, -0.04], [0.21, -0.75, -0.04], 0.012, metal));
    }
    if (number || details.beerMug) {
      const numberPlate = mesh(new THREE.PlaneGeometry(0.31, 0.34),
        new THREE.MeshBasicMaterial({ map: details.beerMug ? beerMugTexture() : numberTexture(number, goalkeeper ? "#fff" : "#17152c"),
          transparent: true, side: THREE.DoubleSide }),
        0, 1.22, 0.245);
      group.add(numberPlate);
      const backNumber = numberPlate.clone();
      backNumber.position.z = -0.245;
      backNumber.rotation.y = Math.PI;
      group.add(backNumber);
    }
    if (details.sandersLogo) {
      const texture = new THREE.TextureLoader().load(root.FootbolicaSandersImage);
      texture.encoding = THREE.sRGBEncoding;
      const logo = mesh(new THREE.CircleGeometry(0.18, 32),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }),
        0, 1.22, -0.25);
      logo.rotation.y = Math.PI;
      group.add(logo);
    }
    if (shirtName) {
      const namePlate = mesh(new THREE.PlaneGeometry(0.6, 0.13),
        new THREE.MeshBasicMaterial({ map: shirtTextTexture(shirtName.toUpperCase(), "#17152c"), transparent: true,
          side: THREE.DoubleSide, depthWrite: false }), 0, 1.52, -0.252);
      namePlate.rotation.y = Math.PI;
      group.add(namePlate);
      const footer = mesh(new THREE.PlaneGeometry(0.58, 0.11),
        new THREE.MeshBasicMaterial({ map: shirtTextTexture("футбилка", "#168c4d"), transparent: true,
          side: THREE.DoubleSide, depthWrite: false }), 0, 0.97, 0.215);
      group.add(footer);
      const backFooter = footer.clone();
      backFooter.position.z = -0.215;
      backFooter.rotation.y = Math.PI;
      group.add(backFooter);
    }
    if (details.longLegs) {
      const lift = 0.42;
      for (const child of group.children) child.position.y += lift;
      for (const leg of legs) leg.scale.y = (0.75 + lift) / 0.75;
    }
    return { group, legs, arms, leftFooted: !!details.leftFooted,
      kitMaterials: [shirt, shorts, sock] };
  }

  function soccerBall() {
    const ball = new THREE.Group();
    const white = standard(0xf6f7ee, { roughness: 0.46 });
    const dark = standard(0x1a2430, { roughness: 0.65 });
    ball.add(mesh(new THREE.SphereGeometry(0.225, 24, 16), white));
    const directions = [
      [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0],
    ];
    for (const direction of directions) {
      const patch = mesh(new THREE.CircleGeometry(0.075, 5), dark);
      patch.position.set(...direction.map((value) => value * 0.224));
      patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...direction));
      ball.add(patch);
    }
    return ball;
  }

  class Footbolica3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      this.renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.5));
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.78;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x8ccae1);
      this.scene.fog = new THREE.Fog(0x9fc5c9, 65, 145);
      this.camera = new THREE.PerspectiveCamera(18, 1200 / 680, 0.1, 220);
      this.raycaster = new THREE.Raycaster();
      this.goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -GOAL_Z);
      this.shotKey = "";
      this.arcKey = "";
      this.buildLights();
      this.buildEnvironment();
      this.buildMishanyaPrison();
      this.buildGoal();
      this.buildPlayers();
      this.buildArc();
    }

    resize(width, height) {
      this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    buildLights() {
      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x2d5940, 0.72));
      const sun = new THREE.DirectionalLight(0xffebcd, 1.15);
      sun.position.set(-9, 18, 11);
      sun.castShadow = true;
      const shadowSize = root.innerWidth <= 800 ? 512 : 1024;
      sun.shadow.mapSize.set(shadowSize, shadowSize);
      sun.shadow.camera.left = -25;
      sun.shadow.camera.right = 25;
      sun.shadow.camera.top = 25;
      sun.shadow.camera.bottom = -25;
      sun.shadow.camera.near = 0.5;
      sun.shadow.camera.far = 90;
      sun.shadow.bias = -0.001;
      this.scene.add(sun);
      const fill = new THREE.DirectionalLight(0xc5deee, 0.2);
      fill.position.set(10, 7, -22);
      this.scene.add(fill);
    }

    buildEnvironment() {
      const field = mesh(new THREE.PlaneGeometry(150, 140), standard(0xffffff, { map: grassTexture() }), 0, -0.04, -6);
      field.rotation.x = -Math.PI / 2;
      field.castShadow = false;
      field.receiveShadow = true;
      this.scene.add(field);
      for (let z = -27; z < 23; z += 8) {
        const stripe = box(80, 0.006, 4, standard(0xb4d994, { transparent: true, opacity: 0.12 }), 0, 0, z);
        stripe.castShadow = false;
        this.scene.add(stripe);
      }
      const white = standard(0xe4f0e3, { emissive: 0x24452b, emissiveIntensity: 0.12 });
      for (const x of [-19, 19]) this.scene.add(box(0.045, 0.01, 80, white, x, 0.015, -6));
      this.scene.add(box(38, 0.01, 0.05, white, 0, 0.015, GOAL_Z + 1.2));
      this.scene.add(box(16.5, 0.01, 0.05, white, 0, 0.015, GOAL_Z + 6.5));
      for (const x of [-8.25, 8.25]) this.scene.add(box(0.05, 0.01, 5.3, white, x, 0.015, GOAL_Z + 3.85));
      this.scene.add(box(38, 0.01, 0.05, white, 0, 0.015, GOAL_Z + 17));
      for (const x of [-19, 19]) this.scene.add(box(0.05, 0.01, 15.8, white, x, 0.015, GOAL_Z + 9.1));

      const concrete = standard(0x3e4953);
      const seating = standard(0x19243b);
      this.scene.add(box(110, 11, 7, concrete, 0, 4.5, -35));
      this.scene.add(box(110, 9, 4, seating, 0, 7.8, -37));
      const crowd = new THREE.Mesh(new THREE.PlaneGeometry(108, 10),
        new THREE.MeshBasicMaterial({ map: crowdTexture(), side: THREE.DoubleSide, toneMapped: false }));
      crowd.position.set(0, 7, -31.5);
      this.scene.add(crowd);
      this.scene.add(box(10.8, 4.84, 0.12, standard(0xffffff), 0, 4.8, -31.34));
      const leagueMaterial = new THREE.MeshBasicMaterial({ color: 0x390064,
        side: THREE.DoubleSide, toneMapped: false });
      const leagueBanner = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 4.54),
        leagueMaterial);
      leagueBanner.position.set(0, 4.8, -31.26);
      this.scene.add(leagueBanner);
      new THREE.TextureLoader().load(root.FootbolicaTFLImage, (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        leagueMaterial.map = texture;
        leagueMaterial.color.setHex(0xffffff);
        leagueMaterial.needsUpdate = true;
      });
      for (const side of [-1, 1]) {
        const sideStand = box(8, 9, 85, concrete, side * 49, 4, -5);
        this.scene.add(sideStand);
        const sideCrowd = new THREE.Mesh(new THREE.PlaneGeometry(85, 8),
          new THREE.MeshBasicMaterial({ map: crowdTexture(), side: THREE.DoubleSide, toneMapped: false }));
        sideCrowd.rotation.y = side * Math.PI / 2;
        sideCrowd.position.set(side * 44.8, 6.5, -5);
        this.scene.add(sideCrowd);
      }
      const boardMaterial = new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.55 });
      this.scene.add(box(90, 1.2, 0.22, boardMaterial, 0, 0.6, -24));
      for (const side of [-1, 1]) {
        const board = box(0.22, 1.2, 70, boardMaterial, side * 21, 0.6, -4);
        this.scene.add(board);
      }
      const rail = standard(0x96a6a6, { metalness: 0.65, roughness: 0.4 });
      this.scene.add(rod([-45, 1.6, -28], [45, 1.6, -28], 0.045, rail));
      for (const x of [-15, 0, 15]) this.scene.add(rod([x, 1.2, -28], [x, 3, -28], 0.025, rail));
      for (const x of [-24, 24]) {
        this.scene.add(rod([x, 0, -26], [x, 13, -26], 0.13, rail));
        this.scene.add(box(4.2, 0.8, 0.35, standard(0xf9f4d8, { emissive: 0xdde6ff, emissiveIntensity: 0.75 }),
          x, 13, -26));
      }
    }

    buildGoal() {
      const group = new THREE.Group();
      const front = standard(0xf8f8ed, { metalness: 0.25, roughness: 0.32 });
      const back = standard(0xd9e4e2, { metalness: 0.12, roughness: 0.48 });
      for (const x of [-GOAL_WIDTH / 2, GOAL_WIDTH / 2]) {
        group.add(rod([x, 0, 0], [x, GOAL_HEIGHT, 0], 0.085, front));
        group.add(rod([x, GOAL_HEIGHT, 0], [x * 0.9, GOAL_HEIGHT - 0.22, -2.3], 0.038, back));
        group.add(rod([x, 0, 0], [x * 0.9, 0, -2.3], 0.032, back));
      }
      group.add(rod([-GOAL_WIDTH / 2, GOAL_HEIGHT, 0], [GOAL_WIDTH / 2, GOAL_HEIGHT, 0], 0.085, front));
      group.add(rod([-GOAL_WIDTH * 0.45, GOAL_HEIGHT - 0.22, -2.3],
        [GOAL_WIDTH * 0.45, GOAL_HEIGHT - 0.22, -2.3], 0.032, back));
      const vertices = [];
      function segment(a, b) { vertices.push(...a, ...b); }
      for (let x = -3.9; x <= 3.91; x += 0.32) {
        segment([x, 0, -2.3], [x, GOAL_HEIGHT - 0.22, -2.3]);
        segment([x, GOAL_HEIGHT, 0], [x * 0.9, GOAL_HEIGHT - 0.22, -2.3]);
      }
      for (let y = 0; y <= GOAL_HEIGHT; y += 0.28) {
        segment([-3.51, y, -2.3], [3.51, y, -2.3]);
        for (const x of [-3.9, 3.9]) segment([x, y, 0], [x * 0.9, Math.max(0, y - 0.22), -2.3]);
      }
      const netGeometry = new THREE.BufferGeometry();
      netGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      const net = new THREE.LineSegments(netGeometry,
        new THREE.LineBasicMaterial({ color: 0xe9f7f2, transparent: true, opacity: 0.7 }));
      group.add(net);
      this.net = net;
      group.position.z = GOAL_Z;
      this.scene.add(group);
      this.goal = group;
    }

    buildMishanyaPrison() {
      const cell = new THREE.Group();
      const steel = standard(0x25323a, { metalness: 0.75, roughness: 0.35 });
      const bar = standard(0x55656c, { metalness: 0.72, roughness: 0.32 });
      const wall = standard(0x919b99);
      const floor = standard(0x596766);
      const wood = standard(0x795746, { roughness: 0.88 });
      const halfWidth = 2.55;
      const front = 1.2;
      const back = -1.2;
      const height = 3.15;
      cell.add(box(5.1, height, 0.09, wall, 0, height / 2, back - 0.05));
      cell.add(box(5.1, 0.12, 2.5, floor, 0, 0, 0));

      // The bench sits inside the cage, with the car's wheels on its seat.
      cell.add(box(3.65, 0.13, 0.8, wood, 0, 0.72, -0.48));
      cell.add(box(3.65, 0.7, 0.12, wood, 0, 1.21, -0.91));
      for (const x of [-1.62, 1.62]) {
        cell.add(box(0.1, 0.68, 0.1, steel, x, 0.34, -0.17));
        cell.add(box(0.1, 0.68, 0.1, steel, x, 0.34, -0.83));
      }
      const texture = new THREE.TextureLoader().load(root.FootbolicaCarImage);
      texture.encoding = THREE.sRGBEncoding;
      const car = mesh(carSilhouetteGeometry(root.FootbolicaCarOutline),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }));
      car.scale.set(0.0066, 0.0066, 1);
      car.position.set(0, 0.64, -0.24);
      car.castShadow = false;
      cell.add(car);

      for (const x of [-halfWidth, halfWidth]) {
        for (const z of [front, back]) {
          cell.add(rod([x, 0, z], [x, height, z], 0.075, steel));
        }
      }
      for (const y of [0.07, height]) {
        for (const z of [front, back]) {
          cell.add(rod([-halfWidth, y, z], [halfWidth, y, z], 0.075, steel));
        }
        for (const x of [-halfWidth, halfWidth]) {
          cell.add(rod([x, y, back], [x, y, front], 0.075, steel));
        }
      }
      for (let x = -2.2; x <= 2.21; x += 0.4) {
        cell.add(rod([x, 0.1, front], [x, height - 0.06, front], 0.034, bar));
        cell.add(rod([x, height, back], [x, height, front], 0.027, bar));
      }
      for (let z = back + 0.4; z < front; z += 0.4) {
        for (const x of [-halfWidth, halfWidth]) {
          cell.add(rod([x, 0.1, z], [x, height - 0.06, z], 0.034, bar));
        }
        cell.add(rod([-halfWidth, height, z], [halfWidth, height, z], 0.027, bar));
      }
      for (const y of [1.05, 2.1]) {
        cell.add(rod([-halfWidth, y, front], [halfWidth, y, front], 0.037, steel));
        for (const x of [-halfWidth, halfWidth]) {
          cell.add(rod([x, y, back], [x, y, front], 0.037, steel));
        }
      }
      // A framed door and lock make the front read as a prison cell.
      for (const x of [0.55, 2.45]) {
        cell.add(rod([x, 0.08, front + 0.05], [x, height - 0.06, front + 0.05], 0.065, steel));
      }
      for (const y of [0.1, height - 0.08]) {
        cell.add(rod([0.55, y, front + 0.05], [2.45, y, front + 0.05], 0.055, steel));
      }
      cell.add(box(0.33, 0.28, 0.12, steel, 0.53, 1.44, front + 0.12));
      cell.add(box(0.12, 0.07, 0.04, bar, 0.53, 1.44, front + 0.2));
      cell.position.set(-7.4, 0, -9.5);
      cell.visible = false;
      this.scene.add(cell);
      this.mishanyaPrison = cell;
    }

    buildPlayers() {
      this.kickers = [
        player(0xf8f9f4, 0xe3a275, "21", false, "Сидорьньё", false,
          { bootColor: 0x9147f5, leftFooted: true }),
        player(0xf8f9f4, 0xd7a782, "17", false, "Амальдиньё", false,
          { ponytail: true }),
        player(0xf8f9f4, 0xa8664b, "18", false, "Григариньё", false,
          { clownHat: true }),
        player(0xf8f9f4, 0xd6a078, "22", false, "Каренчик", false,
          { skewers: true }),
        player(0xd53545, 0xc78b6a, "67", false, "Озонмен", false,
          { stripes: ["#d53545", "#2454ad"], shortsColor: 0x171b27, sockColor: 0x171b27,
            bootColor: 0x3acaf5 }),
        player(0xf8f9f4, 0xe2ad83, "13", false, "Рачиньё", false,
          { castLeg: true }),
        player(0xf8f9f4, 0xd5a178, "", false, "СиньСинара", false,
          { sleeveColor: 0x225da6, shortsColor: 0x225da6, beerMug: true }),
        player(0xf8f9f4, 0xc99370, "72", false, "Некич", false,
          { longLegs: true }),
        player(0xf8f9f4, 0xd9a177, "20", false, "Косогорчик", false,
          { bootColor: 0x20242e }),
        player(0xf8f9f4, 0xd6a078, "33", false, "Мишаня", false,
          { bootColor: 0x8e949b, baton: true, handcuffs: true }),
        player(0xf8f9f4, 0xf0c6a4, "", false, "Аркундий Сандерс", false,
          { bootColor: 0xff5ca8, hairColor: 0xeee5d1, sandersLogo: true }),
        player(0xf8f9f4, 0xd7a17a, "", false, "Колян", false,
          { bootColor: 0x20242e, moneyKit: true }),
        player(0xf8f9f4, 0xd9a681, "9", false, "Пашка", false,
          { bootColor: 0x59c5f1 }),
      ];
      for (const item of this.kickers) {
        item.group.position.set(-0.55, 0, BALL_Z + 0.35);
        item.group.rotation.y = Math.PI;
        this.scene.add(item.group);
      }
      this.keeper = player(0xff4e91, 0xc98b69, "1", true);
      this.keeper.group.position.set(0, 0, GOAL_Z + 0.9);
      this.scene.add(this.keeper.group);
      this.wall = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const defender = player(0xffe33d, i % 2 ? 0xe1ab7f : 0x9d694e, String(i + 2), false, "", true);
        defender.group.position.x = (i - 1.5) * 0.78;
        this.wall.add(defender.group);
      }
      this.scene.add(this.wall);
      this.ball = soccerBall();
      this.scene.add(this.ball);
    }

    buildArc() {
      this.arc = new THREE.Group();
      this.arcSegments = [];
      const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd41 });
      for (let i = 0; i < 25; i++) {
        const dash = mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 6), dashMaterial);
        dash.castShadow = false;
        this.arc.add(dash);
        this.arcSegments.push(dash);
      }
      this.scene.add(this.arc);
      this.marker = mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0xffe25a }));
      this.marker.castShadow = false;
      this.scene.add(this.marker);
    }

    worldPoint(point, t, scene) {
      return new THREE.Vector3((point.x - 600) / 50,
        logic.ballHeight(scene, point, t), BALL_Z + (GOAL_Z - BALL_Z) * t);
    }

    updateShot(scene) {
      const key = `${scene.ball.x}:${scene.wall ? scene.wall.centerX : "penalty"}`;
      if (key === this.shotKey) return;
      this.shotKey = key;
      this.arcKey = "";
      this.goal.position.x = (scene.goal.centerX - 600) / 50;
      this.keeper.group.position.x = this.goal.position.x;
      for (const kicker of this.kickers) kicker.group.position.x = (scene.ball.x - 600) / 50 - 0.55;
      this.wall.visible = !!scene.wall;
      if (scene.wall) {
        this.wall.position.set((scene.wall.centerX - 600) / 50, 0,
          BALL_Z + (GOAL_Z - BALL_Z) * scene.wall.t);
      }
    }

    updateArc(view) {
      const show = view.state === "aiming" || view.state === "charging" || view.state === "tutorial";
      this.arc.visible = this.marker.visible = show;
      if (!show) return;
      const key = `${view.aim.x}:${view.aim.y}:${view.power}:${view.spin}:${this.shotKey}`;
      if (key === this.arcKey) return;
      this.arcKey = key;
      const preview = { scene: view.scene, aim: view.aim, power: view.power,
        spin: view.spin, scatter: { x: 0, y: 0 } };
      for (let i = 0; i < this.arcSegments.length; i++) {
        const t0 = (i * 2) / 50;
        const t1 = (i * 2 + 1) / 50;
        const p0 = this.worldPoint(logic.pathPoint(preview, t0), t0, view.scene);
        const p1 = this.worldPoint(logic.pathPoint(preview, t1), t1, view.scene);
        const direction = p1.clone().sub(p0);
        const dash = this.arcSegments[i];
        dash.position.copy(p0).add(p1).multiplyScalar(0.5);
        dash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
        dash.scale.y = direction.length();
      }
      this.marker.position.copy(this.worldPoint(logic.pathPoint(preview, 1), 1, view.scene));
      this.marker.lookAt(this.camera.position);
    }

    aimFromPointer(event, scene) {
      const rect = this.canvas.getBoundingClientRect();
      const rotated = root.matchMedia("(max-width: 800px) and (orientation: portrait)").matches;
      const x = rotated ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width;
      const y = rotated ? (rect.right - event.clientX) / rect.width : (event.clientY - rect.top) / rect.height;
      this.raycaster.setFromCamera(new THREE.Vector2(x * 2 - 1, 1 - y * 2), this.camera);
      const point = this.raycaster.ray.intersectPlane(this.goalPlane, new THREE.Vector3());
      if (!point) return logic.startingAim(scene);
      return logic.clampAim(scene,
        scene.goal.centerX + (point.x - (scene.goal.centerX - 600) / 50) * 50,
        scene.goal.bottom - (point.y - 0.23) * 65);
    }

    draw(view) {
      this.mishanyaPrison.visible = view.selectedPlayer === 9;
      this.updateShot(view.scene);
      const flight = view.flight;
      const t = flight ? Math.min(flight.result.endT,
        Math.max(0, (view.now - view.flightStartedAt) / 1000 / flight.duration)) : 0;
      const point = flight ? logic.pathPoint(flight, t, true) : view.scene.ball;
      const ballT = flight?.missedBall ? 0 : t;
      this.ball.position.copy(this.worldPoint(point, ballT, view.scene));
      this.ball.rotation.set(ballT * 8, ballT * 5 * (1 + Math.abs(view.spin)), ballT * 3);
      if (flight && flight.result.kind === "goal" && view.state !== "flying") {
        const age = Math.max(0, (view.now - view.flightStartedAt - flight.duration * 1000) / 1000);
        this.ball.position.z -= Math.min(1.25, age * 1.8);
        this.ball.position.y = Math.max(0.23, this.ball.position.y - age * 0.7);
        this.net.position.z = -Math.sin(age * 17) * 0.18 * Math.exp(-age * 3);
      } else {
        this.net.position.z = 0;
      }
      this.keeper.group.position.x = (view.keeperX - 600) / 50;
      if (this.keeperColor !== view.keeperColor) {
        for (const material of this.keeper.kitMaterials) material.color.set(view.keeperColor);
        this.keeperColor = view.keeperColor;
      }
      const dive = flight && !flight.missedBall
        ? logic.keeperDiveAngle(view.scene.goal.centerX, view.keeperX) : 0;
      this.keeper.group.rotation.z = dive;
      const armLift = flight && !flight.missedBall ? Math.min(1, t / 0.75) * 1.9 : 0;
      for (let i = 0; i < this.keeper.arms.length; i++) {
        this.keeper.arms[i].rotation.x = flight && !flight.missedBall ? -0.5 : 0;
        this.keeper.arms[i].rotation.z = (i === 0 ? -1 : 1) * (0.32 + armLift);
      }
      if (view.scene.wall) {
        const wallSeconds = flight && view.state === "flying"
          ? flight.wallTime + t * flight.duration : view.now / 1000;
        const wallX = logic.wallCenterAt(view.scene, wallSeconds);
        this.wall.position.x = (wallX - 600) / 50;
      }
      this.wall.position.y = flight && !flight.missedBall && view.state === "flying" && t > 0.32 && t < 0.67
        ? Math.max(0, Math.sin((t - 0.32) / 0.35 * Math.PI)) * 0.28 : 0;
      for (let i = 0; i < this.kickers.length; i++) {
        const kicker = this.kickers[i];
        kicker.group.visible = i === view.selectedPlayer;
        kicker.legs[0].rotation.x = 0;
        kicker.legs[1].rotation.x = 0;
        const kickingLeg = kicker.leftFooted ? 1 : 0;
        kicker.legs[kickingLeg].rotation.x = flight && view.state === "flying" && t < 0.22
          ? -Math.sin(t / 0.22 * Math.PI) : 0;
      }
      const ballX = (view.scene.ball.x - 600) / 50;
      this.camera.position.set(ballX * 0.25, 4.5 - ballT * 0.2, 28 - ballT * 2.5);
      this.camera.lookAt(0, 0.2, -9);
      this.updateArc(view);
      this.renderer.render(this.scene, this.camera);
    }
  }

  root.Footbolica3D = Footbolica3D;
})(globalThis);
