import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeTextAnimationProps {
  text: string;
}

export const ThreeTextAnimation = ({ text }: ThreeTextAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    particles?: THREE.Points;
    animationId?: number;
  }>({});

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });

    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Create particles for text effect
    const particlesCount = 3000;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);

    // Create text-like particle distribution
    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3;
      
      // Create letter-shaped clusters
      const letterIndex = Math.floor(Math.random() * text.length);
      const x = (letterIndex - text.length / 2) * 0.8 + (Math.random() - 0.5) * 0.5;
      const y = (Math.random() - 0.5) * 2;
      const z = (Math.random() - 0.5) * 0.5;
      
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Color gradient from coral to pink
      const color = new THREE.Color();
      color.setHSL(
        (10 + Math.random() * 30) / 360,
        0.9,
        0.5 + Math.random() * 0.2
      );
      
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 5;

    // Store references
    sceneRef.current = { scene, camera, renderer, particles };

    // Animation
    let time = 0;
    const animate = () => {
      time += 0.001;
      
      const positions = particles.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        const y = positions[i3 + 1];
        
        // Wave animation
        positions[i3] += Math.sin(time * 2 + y) * 0.001;
        positions[i3 + 1] += Math.cos(time * 2 + positions[i3]) * 0.001;
        
        // Reset particles that drift too far
        if (Math.abs(positions[i3]) > 10) {
          const letterIndex = Math.floor(Math.random() * text.length);
          positions[i3] = (letterIndex - text.length / 2) * 0.8;
        }
        if (Math.abs(positions[i3 + 1]) > 5) {
          positions[i3 + 1] = (Math.random() - 0.5) * 2;
        }
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      
      // Rotate slowly
      particles.rotation.y = time * 0.1;
      particles.rotation.x = Math.sin(time * 0.5) * 0.1;

      renderer.render(scene, camera);
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
};
