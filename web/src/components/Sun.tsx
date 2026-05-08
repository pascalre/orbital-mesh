import * as THREE from 'three';
import { useMemo } from 'react';
import { Sphere } from '@react-three/drei';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare';

interface SunProps {
  direction: { x: number; y: number; z: number };
}

export function Sun({ direction }: SunProps) {
  const textures = useMemo(() => {
    const createTex = (size: number, type: 'core' | 'rays' | 'halo' | 'ghost') => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const center = size / 2;

      if (type === 'core') {
        const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.1, 'rgba(255, 252, 230, 0.9)');
        grad.addColorStop(0.3, 'rgba(255, 220, 120, 0.15)');
        grad.addColorStop(1, 'rgba(255, 120, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }
      else if (type === 'rays') {
        ctx.translate(center, center);
        ctx.filter = 'blur(3px)';

        for (let i = 0; i < 60; i++) {
          const angle = Math.random() * Math.PI * 2;
          const isLong = Math.random() > 0.7;
          const length = isLong ? center * 0.95 : center * 0.4;
          const opacity = isLong ? Math.random() * 0.1 : Math.random() * 0.25;

          ctx.rotate(angle);
          ctx.beginPath();
          const grad = ctx.createLinearGradient(0, 0, 0, length);
          grad.addColorStop(0, `rgba(255, 245, 210, ${opacity})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = isLong ? 0.8 : 1.5;
          ctx.moveTo(0, 0);
          ctx.lineTo(0, length);
          ctx.stroke();
        }
      }
      else if (type === 'halo') {
        const grad = ctx.createRadialGradient(center, center, center * 0.75, center, center, center);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.4, 'rgba(180, 200, 255, 0.04)');
        grad.addColorStop(0.6, 'rgba(255, 255, 200, 0.03)');
        grad.addColorStop(0.8, 'rgba(255, 180, 150, 0.02)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }
      else if (type === 'ghost') {
        const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    return {
      core: createTex(512, 'core'),
      rays: createTex(1024, 'rays'),
      halo: createTex(1024, 'halo'),
      ghost: createTex(256, 'ghost')
    };
  }, []);

  const lensflare = useMemo(() => {
    const lf = new Lensflare();

    lf.addElement(new LensflareElement(textures.core, 400, 0, new THREE.Color(0xffffff)));
    lf.addElement(new LensflareElement(textures.core, 630, 0, new THREE.Color(0xffcc88)));

    lf.addElement(new LensflareElement(textures.rays, 800, 0, new THREE.Color(0xfff5d0)));

    lf.addElement(new LensflareElement(textures.halo, 2200, 0, new THREE.Color(0xff0000)));
    lf.addElement(new LensflareElement(textures.halo, 2400, 0, new THREE.Color(0xffffff)));
    lf.addElement(new LensflareElement(textures.halo, 500, 1, new THREE.Color(0xffffff)));

    lf.addElement(new LensflareElement(textures.ghost, 180, 0.65, new THREE.Color(0xffaa88)));
    lf.addElement(new LensflareElement(textures.ghost, 120, 0.7, new THREE.Color(0xffeebb)));
    lf.addElement(new LensflareElement(textures.ghost, 300, 0.85, new THREE.Color(0xaaccff)));
    lf.addElement(new LensflareElement(textures.ghost, 80, 0.95, new THREE.Color(0x99aaff)));

    return lf;
  }, [textures]);

  const sunPos = useMemo(() => {
    return new THREE.Vector3(direction.x * 250, direction.y * 250, direction.z * 250);
  }, [direction]);

  return (
    <group position={sunPos}>
      <Sphere args={[4.2, 64, 64]}>
        <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
      </Sphere>

      <primitive
        object={lensflare}
        frustumCulled={false}
        onUpdate={(self: any) => { self.renderOrder = 1000; }}
      />

      <pointLight intensity={28} distance={2000} color="#fffef5" decay={0} />
    </group>
  );
}