"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function WorkshopScene({ compact = false }: { compact?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.4, compact ? 6.2 : 5.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(4, 5, 4);
    scene.add(ambient, key);

    const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x164e63, roughness: 0.45, metalness: 0.2 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35, metalness: 0.35 });
    const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4, metalness: 0.25 });
    const slateMaterial = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.2 });

    const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.7, 0.12), panelMaterial);
    board.position.set(0, 0.15, 0);
    board.rotation.set(-0.12, 0.28, 0.05);
    group.add(board);

    [-0.72, 0, 0.72].forEach((x, index) => {
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.82, 0.08), index === 1 ? accentMaterial : slateMaterial);
      card.position.set(x, 0.18 + index * 0.04, 0.18);
      card.rotation.set(0.02, 0, index === 0 ? -0.08 : index === 2 ? 0.08 : 0);
      group.add(card);
    });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.018, 12, 96),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.45 }),
    );
    ring.rotation.set(1.08, 0.15, 0.3);
    group.add(ring);

    const secondRing = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.012, 12, 96), goldMaterial);
    secondRing.rotation.set(1.18, -0.42, -0.2);
    group.add(secondRing);

    const nodes: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i += 1) {
      const node = new THREE.Mesh(new THREE.SphereGeometry(i % 3 === 0 ? 0.09 : 0.055, 18, 18), i % 3 === 0 ? goldMaterial : accentMaterial);
      const angle = (i / 9) * Math.PI * 2;
      node.position.set(Math.cos(angle) * 2.2, Math.sin(angle) * 0.62 + 0.1, Math.sin(angle) * 1.3);
      nodes.push(node);
      group.add(node);
    }

    const resize = () => {
      const width = mount.clientWidth || 600;
      const height = mount.clientHeight || (compact ? 240 : 520);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      group.rotation.y = Math.sin(t * 0.35) * 0.16;
      board.position.y = Math.sin(t * 1.1) * 0.06;
      ring.rotation.z = t * 0.32;
      secondRing.rotation.z = -t * 0.22;
      nodes.forEach((node, index) => {
        const angle = t * 0.7 + (index / nodes.length) * Math.PI * 2;
        node.position.x = Math.cos(angle) * (index % 2 ? 2.05 : 2.35);
        node.position.z = Math.sin(angle) * 1.28;
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
    };
  }, [compact]);

  return <div ref={mountRef} className={compact ? "h-64 w-full" : "h-[520px] min-h-[360px] w-full"} aria-hidden="true" />;
}