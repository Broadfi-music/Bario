import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreeTextAnimationProps {
  text: string;
}

const textVariations = [
  'remix any song you can imagine',
  'remix any song to amapiano',
  'remix any song to trap',
  'remix any song to country music',
];

export const ThreeTextAnimation = ({ text }: ThreeTextAnimationProps) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState(textVariations[0]);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    particles?: THREE.Points;
    animationId?: number;
  }>({});

  // Cycle through text variations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % textVariations.length);
    }, 3000); // Change text every 3 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setDisplayText(textVariations[currentTextIndex]);
  }, [currentTextIndex]);

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
      const letterIndex = Math.floor(Math.random() * displayText.length);
      const x = (letterIndex - displayText.length / 2) * 0.8 + (Math.random() - 0.5) * 0.5;
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
          const letterIndex = Math.floor(Math.random() * displayText.length);
          positions[i3] = (letterIndex - displayText.length / 2) * 0.8;
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
  }, [displayText]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <div 
        ref={containerRef} 
        className="absolute inset-0"
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h2 className="text-4xl md:text-6xl font-bold text-foreground/40 tracking-wider animate-pulse">
          {displayText}
        </h2>
      </div>
    </div>
  );
};
