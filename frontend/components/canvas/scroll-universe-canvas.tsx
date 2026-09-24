'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ApiNode {
  name: string;
  path: string;
  position: [number, number, number];
  isVulnerable?: boolean;
  vulnType?: string;
  severity?: 'critical' | 'high' | 'medium';
}

const NODES_DATA: ApiNode[] = [
  { name: 'Auth Login', path: '/api/v1/auth/login', position: [-6, 3, 2], isVulnerable: true, vulnType: 'No Rate Limit', severity: 'medium' },
  { name: 'Users Profile', path: '/api/v1/users/{id}', position: [-3, 5, -2], isVulnerable: true, vulnType: 'Data Exposure (PAN)', severity: 'high' },
  { name: 'Orders Detail', path: '/api/v1/orders/{id}', position: [5, 2, 4], isVulnerable: true, vulnType: 'BOLA / IDOR Flaw', severity: 'critical' },
  { name: 'Payments Tokenize', path: '/api/v1/payments/charge', position: [7, -3, -1], isVulnerable: false },
  { name: 'Admin Metrics', path: '/api/v1/admin/metrics', position: [3, 6, -5], isVulnerable: false },
  { name: 'OAuth Callback', path: '/api/v1/auth/callback', position: [-7, -2, -3], isVulnerable: false },
  { name: 'Webhook Events', path: '/api/v1/webhooks', position: [-2, -4, 3], isVulnerable: false },
  { name: 'Products Catalog', path: '/api/v1/products', position: [2, -5, 2], isVulnerable: false },
  { name: 'Inventory Sync', path: '/api/v1/inventory', position: [6, -1, -6], isVulnerable: false },
];

export default function ScrollUniverseCanvas({
  onLogAlert,
}: {
  onLogAlert?: (log: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<ApiNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0b');
    scene.fog = new THREE.FogExp2('#0a0a0b', 0.035);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 6, 22);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Lighting (Terminal Green & Pure White)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const greenPointLight = new THREE.PointLight(0x39ff14, 3.0, 35);
    greenPointLight.position.set(0, 2, 0);
    scene.add(greenPointLight);

    // 3. Grid Floor
    const grid = new THREE.GridHelper(60, 60, 0x27272a, 0x141416);
    grid.position.y = -7;
    scene.add(grid);

    // 4. Background Dim Hex Rain Stream
    const codeCount = 120;
    const codePos = new Float32Array(codeCount * 3);
    const codeSpeed: number[] = [];
    for (let i = 0; i < codeCount; i++) {
      codePos[i * 3] = (Math.random() - 0.5) * 50;
      codePos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      codePos[i * 3 + 2] = -12 + (Math.random() - 0.5) * 10;
      codeSpeed.push(0.04 + Math.random() * 0.06);
    }
    const codeGeom = new THREE.BufferGeometry();
    codeGeom.setAttribute('position', new THREE.BufferAttribute(codePos, 3));
    const codeMat = new THREE.PointsMaterial({
      color: 0x39ff14,
      size: 0.18,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const codePoints = new THREE.Points(codeGeom, codeMat);
    scene.add(codePoints);

    // 5. CatmullRomCurve3 Camera Path (6 Scenes)
    const cameraCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 6, 22),       // [00 / HERO] Wide view
        new THREE.Vector3(4, 2.5, 9),      // [01 / PROBLEM] Dive into BOLA red node
        new THREE.Vector3(-3, 0.5, 8),     // [02 / THREATS] Mini-scenes cluster
        new THREE.Vector3(1, -2, 6),       // [03 / HOW IT WORKS] 4 stations
        new THREE.Vector3(0, 1.5, 14),     // [04 / FINDINGS] Advisory view
        new THREE.Vector3(0, 4, 19),       // [05 / SECURE] Pull back, shield locked
      ],
      false,
      'catmullrom',
      0.5
    );

    const lookAtCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(5, 2, 4),
        new THREE.Vector3(-2, 0, 0),
        new THREE.Vector3(0, -2, -2),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.5, 0),
      ],
      false,
      'catmullrom',
      0.5
    );

    // 6. Central Shield Emblem (Procedural geometry)
    const shieldGroup = new THREE.Group();
    const shieldGeom = new THREE.OctahedronGeometry(1.4, 0);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.92,
      roughness: 0.22,
    });
    const shieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
    shieldGroup.add(shieldMesh);

    const shieldWireGeom = new THREE.OctahedronGeometry(1.48, 0);
    const shieldWireMat = new THREE.MeshBasicMaterial({
      color: 0x39ff14,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const shieldWireMesh = new THREE.Mesh(shieldWireGeom, shieldWireMat);
    shieldGroup.add(shieldWireMesh);
    scene.add(shieldGroup);

    // 7. Radar Sweep & Scanner Ring
    const ringGeom = new THREE.TorusGeometry(11, 0.08, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd9f99d,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const scannerRing = new THREE.Mesh(ringGeom, ringMat);
    scannerRing.rotation.x = Math.PI / 2;
    scene.add(scannerRing);

    // Flaw shockwave
    const shockwaveGeom = new THREE.RingGeometry(0.8, 1.3, 32);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xff3b47,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const shockwave = new THREE.Mesh(shockwaveGeom, shockwaveMat);
    shockwave.position.set(5, 2, 4);
    shockwave.rotation.x = Math.PI / 2;
    scene.add(shockwave);

    // External Attacker Line
    const attackLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(14, 8, 8),
      new THREE.Vector3(5, 2, 4),
    ]);
    const attackLineMat = new THREE.LineDashedMaterial({
      color: 0xff3b47,
      dashSize: 0.4,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.45,
    });
    const attackLine = new THREE.Line(attackLineGeom, attackLineMat);
    attackLine.computeLineDistances();
    scene.add(attackLine);

    // 8. Interactive API Endpoint Nodes
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeMaterials: THREE.MeshStandardMaterial[] = [];
    const nodeGlowMaterials: THREE.MeshBasicMaterial[] = [];

    NODES_DATA.forEach((node) => {
      const group = new THREE.Group();
      group.position.set(...node.position);

      const sphereGeom = new THREE.SphereGeometry(0.42, 24, 24);
      const isRed = !!node.isVulnerable;
      const sphereMat = new THREE.MeshStandardMaterial({
        color: isRed ? 0xff3b47 : 0x39ff14,
        emissive: isRed ? 0xff3b47 : 0x39ff14,
        emissiveIntensity: isRed ? 1.2 : 0.8,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(sphereGeom, sphereMat);
      mesh.userData = node;
      group.add(mesh);
      nodeMeshes.push(mesh);
      nodeMaterials.push(sphereMat);

      const glowGeom = new THREE.RingGeometry(0.55, 0.75, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: isRed ? 0xff3b47 : 0x39ff14,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const glowMesh = new THREE.Mesh(glowGeom, glowMat);
      group.add(glowMesh);
      nodeGlowMaterials.push(glowMat);

      scene.add(group);
    });

    // 9. Network Edges & Packets
    const edgeLines: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < NODES_DATA.length; i++) {
      for (let j = i + 1; j < NODES_DATA.length; j++) {
        const p1 = new THREE.Vector3(...NODES_DATA[i].position);
        const p2 = new THREE.Vector3(...NODES_DATA[j].position);
        if (p1.distanceTo(p2) < 11) {
          edgeLines.push([p1, p2]);
          const lineGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const lineMat = new THREE.LineBasicMaterial({
            color: 0x39ff14,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
          });
          const line = new THREE.Line(lineGeom, lineMat);
          scene.add(line);
        }
      }
    }

    const packetCount = 55;
    const packetPosArray = new Float32Array(packetCount * 3);
    const packetMeta: { p1: THREE.Vector3; p2: THREE.Vector3; progress: number; speed: number }[] = [];
    for (let i = 0; i < packetCount; i++) {
      const edge = edgeLines[i % edgeLines.length];
      packetMeta.push({
        p1: edge[0],
        p2: edge[1],
        progress: Math.random(),
        speed: 0.15 + Math.random() * 0.25,
      });
    }

    const packetGeom = new THREE.BufferGeometry();
    packetGeom.setAttribute('position', new THREE.BufferAttribute(packetPosArray, 3));
    const packetMat = new THREE.PointsMaterial({
      color: 0xd9f99d,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const packetPoints = new THREE.Points(packetGeom, packetMat);
    scene.add(packetPoints);

    // 10. Mini-Scene 2: Problem Identity Lanes (Alice & Bob)
    const problemGroup = new THREE.Group();
    problemGroup.position.set(5, 2, 4);

    const aliceSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x39ff14 })
    );
    aliceSphere.position.set(-2.5, 0, 0);
    problemGroup.add(aliceSphere);

    const pipeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4, 16),
      new THREE.MeshBasicMaterial({ color: 0xff3b47, transparent: true, opacity: 0.4 })
    );
    pipeMesh.rotation.z = Math.PI / 2;
    problemGroup.add(pipeMesh);

    const bobSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff3b47 })
    );
    bobSphere.position.set(2.5, 0, 0);
    problemGroup.add(bobSphere);
    scene.add(problemGroup);

    // 11. Mini-Scene 3: 3 Threat Models (BOLA Cubes, Leaking Card, Rate Gate)
    const threatsGroup = new THREE.Group();
    threatsGroup.position.set(-2, 0, 0);

    const bolaBox1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x39ff14, wireframe: true }));
    bolaBox1.position.set(-4.2, 0, 0);
    threatsGroup.add(bolaBox1);
    const bolaBox2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffb020, wireframe: true }));
    bolaBox2.position.set(-2.8, 0, 0);
    threatsGroup.add(bolaBox2);
    const bolaBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), new THREE.MeshBasicMaterial({ color: 0xff3b47 }));
    bolaBeam.position.set(-3.5, 0, 0);
    bolaBeam.rotation.z = Math.PI / 4;
    threatsGroup.add(bolaBeam);

    const cardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x1f1f23, metalness: 0.8, roughness: 0.3 })
    );
    cardMesh.rotation.set(0.2, 0.4, 0);
    threatsGroup.add(cardMesh);

    const leakCount = 20;
    const leakPos = new Float32Array(leakCount * 3);
    for (let i = 0; i < leakCount * 3; i += 3) {
      leakPos[i] = (Math.random() - 0.5) * 0.8;
      leakPos[i + 1] = -Math.random() * 1.2;
      leakPos[i + 2] = (Math.random() - 0.5) * 0.8;
    }
    const leakGeom = new THREE.BufferGeometry();
    leakGeom.setAttribute('position', new THREE.BufferAttribute(leakPos, 3));
    const leakPoints = new THREE.Points(leakGeom, new THREE.PointsMaterial({ color: 0xff3b47, size: 0.12, transparent: true, opacity: 0.7 }));
    threatsGroup.add(leakPoints);

    const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 1.2), new THREE.MeshBasicMaterial({ color: 0xffb020, wireframe: true }));
    gateMesh.position.set(3.5, 0, 0);
    threatsGroup.add(gateMesh);
    [-0.6, -0.9, -1.2].forEach((x, i) => {
      const packet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff3b47 }));
      packet.position.set(3.5 + x, (i % 2) * 0.4 - 0.2, (i - 1) * 0.3);
      threatsGroup.add(packet);
    });

    scene.add(threatsGroup);

    // 12. Pipeline Stations
    const stationPositions = [-4.5, -1.5, 1.5, 4.5];
    const stationMeshes: THREE.Mesh[] = [];
    stationPositions.forEach((x) => {
      const station = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.08, 24),
        new THREE.MeshBasicMaterial({ color: 0x3f3f46, wireframe: true, transparent: true, opacity: 0.4 })
      );
      station.position.set(x, -2, -2);
      scene.add(station);
      stationMeshes.push(station);
    });

    // 13. Native Scroll Tracking with REFS (Zero React Re-renders!)
    const scrollRef = { current: 0 };
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total > 0) {
        scrollRef.current = Math.min(Math.max(window.scrollY / total, 0), 1);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // 14. Mouse Parallax & Raycasting
    const mouse = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouseNorm = new THREE.Vector2(-999, -999);

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      mouseNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNorm.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouseNorm, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object.userData as ApiNode;
        setHoveredNode(hit);
        setTooltipPos({ x: e.clientX, y: e.clientY });
      } else {
        setHoveredNode(null);
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    let isTabVisible = !document.hidden;
    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 15. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let hasAlerted = false;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isTabVisible) return;

      const elapsed = clock.getElapsedTime();
      const currentScroll = scrollRef.current;

      // Hex rain
      const cPos = codePoints.geometry.attributes.position;
      for (let i = 0; i < codeCount; i++) {
        let y = cPos.getY(i) - codeSpeed[i];
        if (y < -20) y = 20;
        cPos.setY(i, y);
      }
      cPos.needsUpdate = true;

      // Camera flight along CatmullRom curve
      const targetPos = cameraCurve.getPoint(currentScroll);
      const targetLook = lookAtCurve.getPoint(currentScroll);

      const px = mouse.x * 0.7;
      const py = mouse.y * 0.4;

      camera.position.x += (targetPos.x + px - camera.position.x) * 0.08;
      camera.position.y += (targetPos.y + py - camera.position.y) * 0.08;
      camera.position.z += (targetPos.z - camera.position.z) * 0.08;

      const currentDir = new THREE.Vector3();
      camera.getWorldDirection(currentDir);
      const interpolatedLook = new THREE.Vector3().lerpVectors(
        camera.position.clone().add(currentDir),
        targetLook,
        0.08
      );
      camera.lookAt(interpolatedLook);

      // Central shield rotation & latching
      if (currentScroll > 0.92) {
        shieldGroup.rotation.y = THREE.MathUtils.lerp(shieldGroup.rotation.y, 0, 0.1);
        shieldGroup.rotation.x = THREE.MathUtils.lerp(shieldGroup.rotation.x, 0, 0.1);
        shieldWireMat.color.setHex(0x39ff14);
        shieldWireMat.opacity = 0.8;
      } else {
        shieldGroup.rotation.y = elapsed * 0.25;
        shieldGroup.rotation.x = Math.sin(elapsed * 0.5) * 0.08;
      }

      // Scanner radar sweep
      const zPos = ((elapsed * 3) % 24) - 12;
      scannerRing.position.z = zPos;
      scannerRing.rotation.z = elapsed * 0.4;

      // Flaw pulse trigger
      if (Math.abs(zPos - 4) < 1.0) {
        shockwave.scale.setScalar(1 + (1.0 - Math.abs(zPos - 4)) * 3);
        (shockwave.material as THREE.MeshBasicMaterial).opacity = (1.0 - Math.abs(zPos - 4)) * 0.6;
        if (!hasAlerted && onLogAlert) {
          hasAlerted = true;
          onLogAlert('[!] BOLA detected: GET /orders/{id} [User A token -> User B record]');
          setTimeout(() => {
            if (onLogAlert) onLogAlert(null);
          }, 3500);
        }
      } else {
        (shockwave.material as THREE.MeshBasicMaterial).opacity = 0;
        if (Math.abs(zPos - 4) > 3.0) {
          hasAlerted = false;
        }
      }

      // Turn all nodes green in secure scene
      const isSecureScene = currentScroll > 0.90;
      nodeMaterials.forEach((mat, idx) => {
        const originalNode = NODES_DATA[idx];
        if (isSecureScene) {
          mat.color.setHex(0x39ff14);
          mat.emissive.setHex(0x39ff14);
          nodeGlowMaterials[idx].color.setHex(0x39ff14);
        } else {
          const isRed = !!originalNode.isVulnerable;
          mat.color.setHex(isRed ? 0xff3b47 : 0x39ff14);
          mat.emissive.setHex(isRed ? 0xff3b47 : 0x39ff14);
          nodeGlowMaterials[idx].color.setHex(isRed ? 0xff3b47 : 0x39ff14);
        }
      });

      // Move data packets
      const posAttr = packetPoints.geometry.attributes.position;
      for (let i = 0; i < packetCount; i++) {
        const p = packetMeta[i];
        p.progress = (p.progress + p.speed * 0.016) % 1;
        const cur = new THREE.Vector3().lerpVectors(p.p1, p.p2, p.progress);
        posAttr.setXYZ(i, cur.x, cur.y, cur.z);
      }
      posAttr.needsUpdate = true;

      // Pipeline stations illumination
      stationMeshes.forEach((mesh, idx) => {
        const active = currentScroll > 0.5 + idx * 0.08;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(active ? 0x39ff14 : 0x3f3f46);
        mat.wireframe = !active;
        mat.opacity = active ? 0.9 : 0.4;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onLogAlert]);

  return (
    <div className="w-full h-full pointer-events-none overflow-hidden cursor-reticle">
      <div ref={containerRef} className="w-full h-full pointer-events-auto" />

      {/* Monospace Tooltip */}
      {hoveredNode && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-lg bg-[#111114]/95 border border-white/20 shadow-2xl backdrop-blur-md transition-opacity font-mono hud-frame"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${
                hoveredNode.isVulnerable ? 'bg-alert-red animate-ping' : 'bg-terminal'
              }`}
            />
            <span className="text-xs font-bold text-muted-heading">
              {hoveredNode.name}
            </span>
            <span className="text-[9px] text-muted-dim uppercase border border-white/10 px-1 rounded">
              SIMULATION
            </span>
          </div>
          <div className="text-[11px] text-muted-body">
            {hoveredNode.path}
          </div>
          {hoveredNode.isVulnerable && (
            <div className="mt-1 text-[10px] uppercase text-alert-red font-bold">
              [!] Detected: {hoveredNode.vulnType}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
