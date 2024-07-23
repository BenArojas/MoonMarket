import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const Hologram = ({ text }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(700, 700);
    mountRef.current.appendChild(renderer.domElement);

    // Hologram display
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(700, 700) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          
          // Create a border effect
          float border = smoothstep(0.0, 0.05, uv.x) * smoothstep(0.0, 0.05, uv.y) * 
                         smoothstep(0.0, 0.05, 1.0 - uv.x) * smoothstep(0.0, 0.05, 1.0 - uv.y);
          
          // Create scan lines
          float scanLine = sin(uv.y * 200.0 + time * 5.0) * 0.5 + 0.5;
          scanLine = pow(scanLine, 3.0) * 0.2;
          
          // Create a flickering effect
          float flicker = sin(time * 20.0) * 0.05 + 0.95;
          
          // Combine effects
          vec3 color = vec3(0.0, 1.0, 1.0); // Cyan color
          color *= border;
          color += scanLine;
          color *= flicker;
          
          gl_FragColor = vec4(color, 0.7);
        }
      `,
      transparent: true,
    });

    const hologram = new THREE.Mesh(geometry, material);
    scene.add(hologram);

    // Text
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 700;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(0, 255, 255, 0.9)';
    context.font = 'bold 30px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 200, 40);

    const textTexture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      depthWrite: false,
    });
    const textGeometry = new THREE.PlaneGeometry(1.8, 1.8);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 0.01; // Slightly in front of the hologram
    scene.add(textMesh);

    camera.position.z = 2;

    // Animation
    const animate = (time) => {
      requestAnimationFrame(animate);
      material.uniforms.time.value = time * 0.001;
      renderer.render(scene, camera);
    };
    animate(0);

    // Cleanup
    return () => {
      mountRef.current.removeChild(renderer.domElement);
    };
  }, [text]);

  return <div ref={mountRef} style={{ width: '700px', height: '700px' }} />;
};

export default Hologram;