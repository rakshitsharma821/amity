'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ApiUniverseCanvasProps {
  onNodeHover?: (endpoint: string | null, vulnType: string | null) => void;
  onScannerAlert?: (alertText: string) => void;
}

export default function ApiUniverseCanvas({ onNodeHover, onScannerAlert }: ApiUniverseCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);

  useEffect(() => {
    // Check WebGL availability
    function checkWebGL() {
      try {
        const canvas = document.createElement('canvas');
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
      } catch {
        return false;
      }
    }

    if (!checkWebGL()) {
      setWebGlSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0b, 0.016);

    const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 46);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Faint Grid Floor (Dark Grey / Charcoal)
    const gridHelper = new THREE.GridHelper(160, 40, 0x222226, 0x141416);
    gridHelper.position.y = -20;
    scene.add(gridHelper);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const shieldRimLight = new THREE.PointLight(0xa3e635, 1.8, 50);
    shieldRimLight.position.set(0, 2, 4);
    scene.add(shieldRimLight);

    const alertPointLight = new THREE.PointLight(0xff3b47, 2.0, 35);
    alertPointLight.position.set(-14, 4, 12);
    scene.add(alertPointLight);

    // 4. Central Shield Emblem (Gunmetal / Dark Chrome with Acid Green Rim)
    const shieldGroup = new THREE.Group();
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 6.5);
    shieldShape.quadraticCurveTo(5.5, 5.5, 5.5, 2);
    shieldShape.quadraticCurveTo(5.5, -3.5, 0, -7.5);
    shieldShape.quadraticCurveTo(-5.5, -3.5, -5.5, 2);
    shieldShape.quadraticCurveTo(-5.5, 5.5, 0, 6.5);

    const extrudeSettings = {
      depth: 1.0,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.35,
      bevelThickness: 0.35,
    };
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    shieldGeo.center();

    // Gunmetal / dark chrome body
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.25,
      metalness: 0.85,
      transparent: true,
      opacity: 0.9,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldGroup.add(shieldMesh);

    // Acid green rim wireframe
    const wireframeGeo = new THREE.WireframeGeometry(shieldGeo);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0xa3e635,
      transparent: true,
      opacity: 0.85,
    });
    const shieldWireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
    shieldGroup.add(shieldWireframe);

    // Rotating inner crystal core
    const coreGeo = new THREE.OctahedronGeometry(2.2, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xa3e635,
      wireframe: true,
    });
    const innerCore = new THREE.Mesh(coreGeo, coreMat);
    shieldGroup.add(innerCore);

    scene.add(shieldGroup);

    // 5. Constellation Nodes (Healthy: acid green #a3e635; Vulnerable: alert red #ff3b47 / amber #ffb020)
    const nodeCount = isMobile ? 55 : 100;
    const nodeMeshes: THREE.Mesh[] = [];

    const endpoints = [
      '/login',
      '/users/{id}',
      '/orders/{id}',
      '/me/orders',
      '/payments',
      '/oauth/token',
      '/billing/invoices',
      '/webhooks',
      '/checkout',
      '/profiles',
      '/keys/rotate',
      '/audit/logs',
      '/admin/metrics',
      '/tenants/{id}',
      '/v1/search',
    ];

    const healthyGeo = new THREE.SphereGeometry(0.65, 14, 14);
    const healthyMat = new THREE.MeshBasicMaterial({ color: 0xa3e635 });

    const vulnerableGeo = new THREE.SphereGeometry(1.05, 14, 14);
    const vulnerableMat = new THREE.MeshBasicMaterial({ color: 0xff3b47 });
    const amberMat = new THREE.MeshBasicMaterial({ color: 0xffb020 });

    for (let i = 0; i < nodeCount; i++) {
      const radius = THREE.MathUtils.randFloat(12, 38);
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = THREE.MathUtils.randFloat(-Math.PI * 0.35, Math.PI * 0.35);

      const x = radius * Math.cos(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) + THREE.MathUtils.randFloat(-3, 3);
      const z = radius * Math.cos(phi) * Math.sin(theta);

      let isVulnerable = false;
      let vulnType: string | null = null;
      let mat = healthyMat;
      let geo = healthyGeo;
      let ep = endpoints[i % endpoints.length];

      if (i === 1) {
        isVulnerable = true;
        vulnType = 'BOLA / IDOR';
        mat = vulnerableMat;
        geo = vulnerableGeo;
        ep = '/orders/{id}';
      } else if (i === 4) {
        isVulnerable = true;
        vulnType = 'Excessive Data Exposure';
        mat = vulnerableMat;
        geo = vulnerableGeo;
        ep = '/users/{id}';
      } else if (i === 7) {
        isVulnerable = true;
        vulnType = 'Missing Rate Limit';
        mat = amberMat;
        geo = vulnerableGeo;
        ep = '/login';
      }

      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(x, y, z);
      mesh.userData = {
        endpoint: ep,
        isVulnerable,
        vulnType,
        originalScale: isVulnerable ? 1.05 : 0.65,
      };

      scene.add(mesh);
      nodeMeshes.push(mesh);
    }

    // Set strategic locations for primary vulnerable nodes
    if (nodeMeshes[1]) nodeMeshes[1].position.set(-14, 4, 12);
    if (nodeMeshes[4]) nodeMeshes[4].position.set(16, -2, -6);
    if (nodeMeshes[7]) nodeMeshes[7].position.set(8, 14, -10);

    // 6. Network Edges & Packets
    const linePositions: number[] = [];
    const edgePairs: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodeMeshes[i].position.distanceTo(nodeMeshes[j].position);
        if (dist < 13) {
          linePositions.push(
            nodeMeshes[i].position.x, nodeMeshes[i].position.y, nodeMeshes[i].position.z,
            nodeMeshes[j].position.x, nodeMeshes[j].position.y, nodeMeshes[j].position.z
          );
          edgePairs.push({ a: nodeMeshes[i].position, b: nodeMeshes[j].position });
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3f6212,
      transparent: true,
      opacity: 0.35,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Data Packets (Acid green dots pulsing along lines)
    const packetCount = isMobile ? 12 : 24;
    const packetGeo = new THREE.SphereGeometry(0.22, 6, 6);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xa3e635 });
    const packets: { mesh: THREE.Mesh; start: THREE.Vector3; end: THREE.Vector3; progress: number; speed: number }[] = [];

    for (let i = 0; i < packetCount && edgePairs.length > 0; i++) {
      const edge = edgePairs[i % edgePairs.length];
      const pMesh = new THREE.Mesh(packetGeo, packetMat);
      scene.add(pMesh);
      packets.push({
        mesh: pMesh,
        start: edge.a,
        end: edge.b,
        progress: Math.random(),
        speed: THREE.MathUtils.randFloat(0.003, 0.008),
      });
    }

    // 7. Sweeping Scanner Ring (Bright White-Green #d9f99d)
    const scannerRingGeo = new THREE.RingGeometry(0.2, 1.2, 32);
    const scannerRingMat = new THREE.MeshBasicMaterial({
      color: 0xd9f99d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const scannerRing = new THREE.Mesh(scannerRingGeo, scannerRingMat);
    scannerRing.rotation.x = Math.PI / 2;
    scene.add(scannerRing);

    let scannerRadius = 0;
    const maxScannerRadius = 45;

    // Shockwave Ring
    const shockwaveGeo = new THREE.RingGeometry(0.5, 1.4, 32);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xff3b47,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const shockwaveRing = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveRing.position.set(-14, 4, 12);
    scene.add(shockwaveRing);

    let shieldAlertTime = 0;
    const normalRimColor = new THREE.Color(0xa3e635);
    const alertRimColor = new THREE.Color(0xff3b47);

    // 8. Raycasting & Mouse Parallax
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let hoveredMesh: THREE.Mesh | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Visibility Listener to pause when tab is hidden
    let isTabVisible = true;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    let shockwaveTime = 0;
    let alertIdx = 0;
    const alerts = [
      'BOLA Flaw Detected on /orders/{id}',
      'Plaintext Password Leak on /users/{id}',
      'Missing Rate Limit on /login',
    ];
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isTabVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Shield rotation
      if (!prefersReducedMotion) {
        shieldGroup.rotation.y = elapsed * 0.22;
        shieldGroup.rotation.x = Math.sin(elapsed * 0.35) * 0.07;
        innerCore.rotation.x = elapsed * 0.45;
        innerCore.rotation.y = elapsed * 0.65;
      }

      // Shield rim flash on alert
      if (elapsed - shieldAlertTime < 1.4) {
        const tAlert = (elapsed - shieldAlertTime) / 1.4;
        wireframeMat.color.lerpColors(alertRimColor, normalRimColor, tAlert);
        innerCore.material.color.lerpColors(alertRimColor, normalRimColor, tAlert);
        shieldRimLight.color.lerpColors(alertRimColor, normalRimColor, tAlert);
      } else {
        wireframeMat.color.copy(normalRimColor);
        innerCore.material.color.copy(normalRimColor);
        shieldRimLight.color.copy(normalRimColor);
      }

      // Parallax
      camera.position.x += (mouse.x * 2.5 - camera.position.x) * 0.05;
      camera.position.y += (-mouse.y * 1.5 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      // Scanner Ring Sweep
      if (!prefersReducedMotion) {
        scannerRadius += delta * 12;
        if (scannerRadius > maxScannerRadius) {
          scannerRadius = 0.5;
        }
        scannerRing.scale.set(scannerRadius, scannerRadius, 1);
        scannerRingMat.opacity = Math.max(0, 0.9 - scannerRadius / maxScannerRadius);

        // Radar intersection with BOLA node
        const distToBola = Math.abs(scannerRadius - 18);
        if (distToBola < 0.6 && elapsed - shockwaveTime > 3.2) {
          shockwaveTime = elapsed;
          shieldAlertTime = elapsed;
          shockwaveMat.opacity = 1;
          shockwaveRing.scale.set(0.5, 0.5, 0.5);

          if (onScannerAlert) {
            onScannerAlert(alerts[alertIdx % alerts.length]);
            alertIdx++;
          }
        }
      }

      // Shockwave decay
      if (shockwaveMat.opacity > 0) {
        shockwaveRing.scale.addScalar(delta * 4);
        shockwaveMat.opacity -= delta * 1.2;
      }

      // Data packets traversal
      if (!prefersReducedMotion) {
        for (let i = 0; i < packets.length; i++) {
          const p = packets[i];
          p.progress += p.speed;
          if (p.progress >= 1) p.progress = 0;
          p.mesh.position.lerpVectors(p.start, p.end, p.progress);
        }
      }

      // Vulnerable node pulses
      const pulse = 1 + Math.sin(elapsed * 4) * 0.18;
      if (nodeMeshes[1]) nodeMeshes[1].scale.setScalar(pulse * 1.15);
      if (nodeMeshes[4]) nodeMeshes[4].scale.setScalar(pulse * 1.1);
      if (nodeMeshes[7]) nodeMeshes[7].scale.setScalar(pulse * 1.1);

      // Raycaster node hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (hoveredMesh !== hit) {
          if (hoveredMesh) hoveredMesh.scale.setScalar(hoveredMesh.userData.originalScale);
          hoveredMesh = hit;
          hoveredMesh.scale.setScalar(hoveredMesh.userData.originalScale * 1.6);
          if (onNodeHover) {
            onNodeHover(hit.userData.endpoint, hit.userData.vulnType);
          }
        }
      } else {
        if (hoveredMesh) {
          hoveredMesh.scale.setScalar(hoveredMesh.userData.originalScale);
          hoveredMesh = null;
          if (onNodeHover) {
            onNodeHover(null, null);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onNodeHover, onScannerAlert]);

  if (!webGlSupported) {
    return (
      <div className="absolute inset-0 bg-radial-gradient from-acid/10 via-obsidian to-obsidian flex items-center justify-center">
        <div className="w-48 h-48 rounded-full border border-acid/30 bg-white/5 blur-xl" />
      </div>
    );
  }

  return <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto" />;
}
