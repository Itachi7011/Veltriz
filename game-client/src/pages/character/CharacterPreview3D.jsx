import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildCharacter, animateCharacter } from '../game/engine/CharacterModel';

/**
 * Small self-contained Three.js viewport that renders the exact same
 * rig used in-game, so what you customize here is what you'll actually
 * look like walking around Veltriz — not a flat CSS circle standing in
 * for it.
 */
const CharacterPreview3D = ({ appearance }) => {
  const mountRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 20);
    camera.position.set(0, 1.05, 3.1);
    camera.lookAt(0, 0.95, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight('#e8f1ff', '#1a1d2b', 1.0);
    scene.add(hemi);
    const key = new THREE.DirectionalLight('#fff6e0', 1.3);
    key.position.set(2, 3, 2);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#8fd8ff', 0.6);
    rim.position.set(-2, 1, -2);
    scene.add(rim);

    const floorGeo = new THREE.CircleGeometry(1.4, 32);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#20243a', roughness: 0.9, transparent: true, opacity: 0.5 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    let raf;
    let disposed = false;
    const clock = new THREE.Clock();
    let rig = null;

    const rebuild = (appearanceNow) => {
      if (rig) scene.remove(rig.group);
      rig = buildCharacter(appearanceNow);
      scene.add(rig.group);
    };

    stateRef.current.rebuild = rebuild;
    rebuild(appearance);

    const animate = () => {
      if (disposed) return;
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (rig) {
        rig.group.rotation.y = Math.sin(t * 0.35) * 0.55;
        animateCharacter(rig.bones, { time: t, speedFactor: 0 });
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the rig whenever appearance changes, without tearing down the
  // whole renderer/scene/lights.
  useEffect(() => {
    stateRef.current.rebuild?.(appearance);
  }, [appearance]);

  return <div ref={mountRef} className="veltriz-charcreate-preview-3d" />;
};

export default CharacterPreview3D;
