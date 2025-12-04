import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import cdImage from '@/assets/holographic-cd.jpeg';

const AnimatedCD = () => {
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
      const texture = textureLoader.load(cdImage);

      const geometry = new THREE.PlaneGeometry(3, 3);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(geometry, material);
      scene.add(plane);

      camera.position.z = 3;

      let animationId: number;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        plane.rotation.z += 0.005;
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
      console.error('WebGL error in AnimatedCD:', error);
      setWebglError(true);
    }
  }, [webglError]);

  if (webglError) {
    return (
      <div className="w-[500px] h-[500px] flex items-center justify-center">
        <img src={cdImage} alt="CD" className="w-64 h-64 object-cover rounded-full animate-spin" style={{ animationDuration: '10s' }} />
      </div>
    );
  }

  return <div ref={mountRef} className="w-[500px] h-[500px]" />;
};

export default AnimatedCD;