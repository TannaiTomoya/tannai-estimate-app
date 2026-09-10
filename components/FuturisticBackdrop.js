"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import styles from "./FuturisticBackdrop.module.css";

export default function FuturisticBackdrop() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x7fd4ff, 0.35);
    scene.add(ambient);
    const point = new THREE.PointLight(0x3dffb5, 1.2, 40);
    point.position.set(4, 3, 5);
    scene.add(point);

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x3dffb5,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.05, 8, 64),
      wireMat,
    );
    scene.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.03, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0x4aa8ff,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
      }),
    );
    ring2.rotation.x = Math.PI / 2.4;
    scene.add(ring2);

    const grid = new THREE.GridHelper(18, 28, 0x1a4a5c, 0x123040);
    grid.position.y = -2.2;
    scene.add(grid);

    const count = 120;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      pointsGeo,
      new THREE.PointsMaterial({
        color: 0x8ef0ff,
        size: 0.035,
        transparent: true,
        opacity: 0.75,
      }),
    );
    scene.add(points);

    let frameId = 0;
    let t = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!reduceMotion) {
        t += 0.004;
        ring.rotation.x = t * 0.35;
        ring.rotation.y = t * 0.55;
        ring2.rotation.z = -t * 0.4;
        points.rotation.y = t * 0.08;
        grid.position.z = ((t * 0.4) % 1) - 0.5;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      scene.clear();
      pointsGeo.dispose();
      ring.geometry.dispose();
      ring2.geometry.dispose();
      wireMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={styles.root} aria-hidden="true" data-backdrop="">
      <div className={styles.gradient} />
      <div className={styles.scan} />
      <div ref={mountRef} className={styles.canvas} />
    </div>
  );
}
