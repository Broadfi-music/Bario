import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import diceImage from '@/assets/dice.jpeg';

const AnimatedDice = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    if (!mountRef.current || webglError) return;

    try {
      // Check WebGL support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglError(true);
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, failIfMajorPerformanceCaveat: false });
      
      renderer.setSize(500, 500);
      renderer.setClearColor(0x000000, 0);
      mountRef.current.appendChild(renderer.domElement);

      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(diceImage);

      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      camera.position.z = 4;

      let animationId: number;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationId);
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    } catch (error) {
      console.error('WebGL error in AnimatedDice:', error);
      setWebglError(true);
    }
  }, [webglError]);

  if (webglError) {
    return (
      <div className="w-[500px] h-[500px] flex items-center justify-center">
        <img src={diceImage} alt="Dice" className="w-64 h-64 object-cover rounded-lg" />
      </div>
    );
  }

  return <div ref={mountRef} className="w-[500px] h-[500px]" />;
};

export default AnimatedDice;