import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';

interface CityPin {
  name: string;
  lat: number;
  lng: number;
  temp: string;
  risk: string;
  riskColor: string;
}

const CITIES: CityPin[] = [
  { name: 'Kolkata', lat: 22.57, lng: 88.36, temp: '32.2°C', risk: 'High Heat', riskColor: '#f43f5e' },
  { name: 'Singapore', lat: 1.28, lng: 103.85, temp: '29.8°C', risk: 'Coastal', riskColor: '#00f2fe' },
  { name: 'Rotterdam', lat: 51.92, lng: 4.47, temp: '19.4°C', risk: 'Protected', riskColor: '#1ed760' },
  { name: 'Tokyo', lat: 35.67, lng: 139.65, temp: '24.1°C', risk: 'Monitored', riskColor: '#1ed760' },
  { name: 'Mumbai', lat: 19.08, lng: 72.88, temp: '31.4°C', risk: 'Monsoon', riskColor: '#f59e0b' },
  { name: 'London', lat: 51.50, lng: -0.12, temp: '18.2°C', risk: 'Optimal', riskColor: '#1ed760' },
  { name: 'New York', lat: 40.71, lng: -74.0, temp: '21.5°C', risk: 'Flood Vector', riskColor: '#f59e0b' },
];

interface TelemetryArcData {
  from: [number, number]; // [lat, lng]
  to: [number, number];
  color: string;
}

const TELEMETRY_ARCS: TelemetryArcData[] = [
  { from: [22.57, 88.36], to: [1.28, 103.85], color: '#1ed760' }, // Kolkata -> Singapore
  { from: [1.28, 103.85], to: [35.67, 139.65], color: '#00f2fe' }, // Singapore -> Tokyo
  { from: [35.67, 139.65], to: [51.92, 4.47], color: '#10b981' }, // Tokyo -> Rotterdam
  { from: [51.92, 4.47], to: [51.50, -0.12], color: '#38bdf8' }, // Rotterdam -> London
  { from: [51.50, -0.12], to: [40.71, -74.0], color: '#00f2fe' }, // London -> New York
  { from: [19.08, 72.88], to: [51.50, -0.12], color: '#1ed760' }, // Mumbai -> London
];

// Helper: Converts Latitude and Longitude to a Three.js 3D Vector matching standard equirectangular texture UVs
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

interface DigitalTwinGlobe3DProps {
  onSelectCity?: (cityName: string) => void;
  selectedCityName?: string;
}

export const DigitalTwinGlobe3D: React.FC<DigitalTwinGlobe3DProps> = ({
  onSelectCity,
  selectedCityName = 'Kolkata',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'clouds' | 'arcs' | 'orbits'>('all');
  const [cityBadges, setCityBadges] = useState<
    Array<{
      city: CityPin;
      screenX: number;
      screenY: number;
      visible: boolean;
      isSelected: boolean;
    }>
  >([]);

  // Smooth rotation states
  const rotYRef = useRef<number>(0.8);
  const rotXRef = useRef<number>(0.25);
  const targetRotY = useRef<number>(0.8);
  const targetRotX = useRef<number>(0.25);

  const isDragging = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // References to dynamic Three.js objects for layer toggling
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  const satelliteGroupRef = useRef<THREE.Group | null>(null);

  // Focus and rotate to selected city smoothly
  useEffect(() => {
    const city = CITIES.find((c) => c.name.toLowerCase() === selectedCityName.toLowerCase());
    if (city) {
      // Calculate target Y & X rotation so the selected city faces the camera directly
      const pt = latLngToVector3(city.lat, city.lng, 1);
      targetRotY.current = -Math.atan2(pt.x, pt.z);
      targetRotX.current = ((city.lat * Math.PI) / 180) * 0.45;
    }
  }, [selectedCityName]);

  // Update layer visibility
  useEffect(() => {
    if (cloudsMeshRef.current) {
      cloudsMeshRef.current.visible = activeLayer === 'all' || activeLayer === 'clouds';
    }
    if (arcsGroupRef.current) {
      arcsGroupRef.current.visible = activeLayer === 'all' || activeLayer === 'arcs';
    }
    if (satelliteGroupRef.current) {
      satelliteGroupRef.current.visible = activeLayer === 'all' || activeLayer === 'orbits';
    }
  }, [activeLayer]);

  // Main Three.js Scene Setup & Animation Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 600;
    let height = container.clientHeight || 400;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 225);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Root Earth Group (Rotates dynamically around world center)
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    // 2. High-Resolution NASA Blue Marble Earth Sphere
    const EARTH_RADIUS = 64;
    const sphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/textures/earth_atmos_2048.jpg');
    const specularTexture = textureLoader.load('/textures/earth_specular_2048.jpg');
    const cloudsTexture = textureLoader.load('/textures/earth_clouds_1024.png');

    earthTexture.colorSpace = THREE.SRGBColorSpace;

    // Ocean Specular & Surface Material
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specularMap: specularTexture,
      specular: new THREE.Color(0x38bdf8), // Electric cyan/azure specular ocean glint
      shininess: 24,
    });

    const earthMesh = new THREE.Mesh(sphereGeometry, earthMaterial);
    earthGroup.add(earthMesh);

    // 3. Volumetric 3D Parallax Cloud Layer
    const cloudsGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.016, 64, 64);
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.88,
      blending: THREE.NormalBlending,
      roughness: 0.9,
    });

    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    earthGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;



    // 5. Cinematic Lighting (Sunlight + Deep Twilight Ambient)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    sunLight.position.set(-150, 90, 100);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0a2238, 0.7); // Twilight navy ambient for realistic dark side
    scene.add(ambientLight);

    // 6. Sub-Orbital Digital Twin Telemetry Arcs
    const arcsGroup = new THREE.Group();
    earthGroup.add(arcsGroup);
    arcsGroupRef.current = arcsGroup;

    interface ArcRunner {
      curve: THREE.CatmullRomCurve3;
      pulseMesh: THREE.Mesh;
      offset: number;
      speed: number;
    }

    const arcRunners: ArcRunner[] = [];

    TELEMETRY_ARCS.forEach((arc) => {
      const vFrom = latLngToVector3(arc.from[0], arc.from[1], EARTH_RADIUS);
      const vTo = latLngToVector3(arc.to[0], arc.to[1], EARTH_RADIUS);

      // Midpoint projected outward to form an elevated 3D sub-orbital parabola
      const vMid = vFrom.clone().add(vTo).multiplyScalar(0.5);
      const dist = vFrom.distanceTo(vTo);
      const arcAltitude = EARTH_RADIUS + Math.min(22, dist * 0.22);
      vMid.normalize().multiplyScalar(arcAltitude);

      const curve = new THREE.CatmullRomCurve3([vFrom, vMid, vTo]);
      const points = curve.getPoints(36);
      const arcGeometry = new THREE.BufferGeometry().setFromPoints(points);

      const arcMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(arc.color),
        transparent: true,
        opacity: 0.6,
        linewidth: 1.5,
      });

      const arcLine = new THREE.Line(arcGeometry, arcMaterial);
      arcsGroup.add(arcLine);

      // Animated energy photon packet traveling along arc
      const pulseGeo = new THREE.SphereGeometry(1.2, 8, 8);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      arcsGroup.add(pulseMesh);

      arcRunners.push({
        curve,
        pulseMesh,
        offset: Math.random(),
        speed: 0.006 + Math.random() * 0.004,
      });
    });

    // 7. City 3D Pin Nodes & Altitude Beacons
    interface CityBeaconRef {
      city: CityPin;
      stemLine: THREE.Line;
      beaconMesh: THREE.Mesh;
      pulseRingMesh: THREE.Mesh;
      nodeWorldPos: THREE.Vector3;
    }

    const cityBeacons: CityBeaconRef[] = [];

    CITIES.forEach((city) => {
      const groundPos = latLngToVector3(city.lat, city.lng, EARTH_RADIUS);
      const beaconPos = latLngToVector3(city.lat, city.lng, EARTH_RADIUS + 9);

      // Altitude stem line
      const stemGeo = new THREE.BufferGeometry().setFromPoints([groundPos, beaconPos]);
      const stemMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(city.name.toLowerCase() === selectedCityName.toLowerCase() ? '#1ed760' : '#ffffff'),
        transparent: true,
        opacity: 0.7,
      });
      const stemLine = new THREE.Line(stemGeo, stemMat);
      earthGroup.add(stemLine);

      // Beacon head sphere
      const isSelected = city.name.toLowerCase() === selectedCityName.toLowerCase();
      const beaconGeo = new THREE.SphereGeometry(isSelected ? 1.8 : 1.2, 12, 12);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(isSelected ? '#1ed760' : city.riskColor),
      });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.copy(beaconPos);
      earthGroup.add(beaconMesh);

      // Ground locator pulse ring
      const ringGeo = new THREE.RingGeometry(1.2, 2.2, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(city.name.toLowerCase() === selectedCityName.toLowerCase() ? '#1ed760' : '#00f2fe'),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const pulseRingMesh = new THREE.Mesh(ringGeo, ringMat);
      pulseRingMesh.position.copy(groundPos);
      pulseRingMesh.lookAt(0, 0, 0);
      earthGroup.add(pulseRingMesh);

      cityBeacons.push({
        city,
        stemLine,
        beaconMesh,
        pulseRingMesh,
        nodeWorldPos: beaconPos,
      });
    });

    // 8. Orbiting Sentinel-2A Satellite
    const satelliteGroup = new THREE.Group();
    scene.add(satelliteGroup);
    satelliteGroupRef.current = satelliteGroup;

    // Inclined Orbit Ring
    const ORBIT_RADIUS = EARTH_RADIUS * 1.34;
    const orbitPoints: THREE.Vector3[] = [];
    for (let a = 0; a <= 64; a++) {
      const angle = (a / 64) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(Math.sin(angle) * ORBIT_RADIUS, Math.cos(angle) * ORBIT_RADIUS * 0.35, Math.cos(angle) * ORBIT_RADIUS));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineDashedMaterial({
      color: 0x00f2fe,
      dashSize: 3,
      gapSize: 4,
      transparent: true,
      opacity: 0.4,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    satelliteGroup.add(orbitLine);

    // Satellite Body with Solar Arrays
    const satBody = new THREE.Group();
    const satCube = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 3.5), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
    const panelL = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 1.8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    panelL.position.x = -3.8;
    const panelR = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 1.8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    panelR.position.x = 3.8;
    satBody.add(satCube, panelL, panelR);
    satelliteGroup.add(satBody);

    // Active Earth scanning laser beam from satellite
    const scanBeamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -25)]);
    const scanBeamMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.35 });
    const scanBeamLine = new THREE.Line(scanBeamGeo, scanBeamMat);
    satBody.add(scanBeamLine);

    let satAngle = 0;
    let pulseTime = 0;
    let animId: number;

    // 9. Render & Animation Loop
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Continuous planetary rotation when not dragging
      if (!isDragging.current) {
        targetRotY.current += 0.0018;
      }
      rotYRef.current += (targetRotY.current - rotYRef.current) * 0.07;
      rotXRef.current += (targetRotX.current - rotXRef.current) * 0.07;

      earthGroup.rotation.y = rotYRef.current;
      earthGroup.rotation.x = rotXRef.current;

      // Realistic differential cloud swirl (independent parallax drift)
      cloudsMesh.rotation.y += 0.0007;

      // Satellite orbital movement
      satAngle += 0.01;
      const satPos = new THREE.Vector3(
        Math.sin(satAngle) * ORBIT_RADIUS,
        Math.cos(satAngle) * ORBIT_RADIUS * 0.35,
        Math.cos(satAngle) * ORBIT_RADIUS
      );
      satBody.position.copy(satPos);
      satBody.lookAt(0, 0, 0);

      // Update Sub-Orbital Telemetry Photons
      arcRunners.forEach((runner) => {
        runner.offset = (runner.offset + runner.speed) % 1;
        const pt = runner.curve.getPointAt(runner.offset);
        runner.pulseMesh.position.copy(pt);
      });

      // City radar pulse animation & 2D Screen Space Projection
      pulseTime += 0.05;
      const currentBadges: typeof cityBadges = [];

      cityBeacons.forEach((b) => {
        const isSelected = b.city.name.toLowerCase() === selectedCityName.toLowerCase();

        // Animate radar ring
        if (isSelected) {
          const ringScale = 1 + (pulseTime % 1.5) * 1.8;
          b.pulseRingMesh.scale.set(ringScale, ringScale, 1);
        }

        // Project 3D Beacon Node to 2D Screen Space
        const worldPos = new THREE.Vector3();
        b.beaconMesh.getWorldPosition(worldPos);

        // Vector pointing from camera to beacon
        const camToPos = worldPos.clone().sub(camera.position).normalize();
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const isFacingCamera = camToPos.dot(camForward) > 0.15;

        // Project to normalized device coordinates (-1 to 1)
        const screenPos = worldPos.clone().project(camera);
        const screenX = ((screenPos.x + 1) * width) / 2;
        const screenY = ((-screenPos.y + 1) * height) / 2;

        currentBadges.push({
          city: b.city,
          screenX,
          screenY,
          visible: isFacingCamera && screenPos.z < 1,
          isSelected,
        });
      });

      setCityBadges(currentBadges);

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 600;
      height = container.clientHeight || 400;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      sphereGeometry.dispose();
      earthMaterial.dispose();
      cloudsGeometry.dispose();
      cloudsMaterial.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [selectedCityName]);

  // Mouse & Touch Orbit Controls (Smooth Drag with Momentum)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    targetRotY.current += dx * 0.007;
    targetRotX.current = Math.max(-0.65, Math.min(0.65, targetRotX.current + dy * 0.007));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePos.current.x;
    const dy = e.touches[0].clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    targetRotY.current += dx * 0.008;
    targetRotX.current = Math.max(-0.65, Math.min(0.65, targetRotX.current + dy * 0.008));
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  return (
    <div className="w-full rounded-xl bg-[#02070c] border border-white/10 overflow-hidden flex flex-col select-none shadow-2xl">
      {/* Top HUD Telemetry Info Strip (Placed above canvas - 0% Earth occlusion) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#030910] border-b border-white/10 z-20">
        <div className="flex items-center gap-2 text-xs font-mono text-white/90 bg-[#06121d] px-3 py-1 rounded-full border border-white/10">
          <span className="w-2 h-2 rounded-full bg-[#1ed760] animate-ping" />
          <span className="font-bold text-[#1ed760]">NASA BLUE MARBLE</span>
          <span className="text-[#64748b]">•</span>
          <span className="text-[#00f2fe]">100% GEOGRAPHIC TWIN</span>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center gap-1 bg-[#06121d] p-1 rounded-full border border-white/10">
          <button
            type="button"
            onClick={() => setActiveLayer('all')}
            className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
              activeLayer === 'all'
                ? 'bg-[#1ed760] text-black shadow-[0_0_10px_rgba(30,215,96,0.4)]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            ALL VECTORS
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('clouds')}
            className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
              activeLayer === 'clouds'
                ? 'bg-[#00f2fe] text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            CLOUDS
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('arcs')}
            className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
              activeLayer === 'arcs'
                ? 'bg-[#10b981] text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            TELEMETRY ARCS
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('orbits')}
            className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
              activeLayer === 'orbits'
                ? 'bg-[#38bdf8] text-black shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            ORBITS
          </button>
        </div>
      </div>

      {/* 3D Earth Interactive Viewport (100% Fully Visible & Completely Unobstructed) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-[330px] sm:h-[360px] relative overflow-hidden bg-radial from-[#04111d] to-[#010408] cursor-grab active:cursor-grabbing"
        aria-label="Photorealistic 3D Digital Twin Earth Globe with NASA Blue Marble Satellite Map"
      >
        {/* Screen-Space Projected 3D City HUD Badges */}
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          {cityBadges.map(({ city, screenX, screenY, visible, isSelected }) => {
            if (!visible) return null;

            return (
              <div
                key={city.name}
                style={{
                  transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
                }}
                className="absolute left-0 top-0 -translate-x-1/2 -translate-y-full mb-1 transition-transform duration-75 pointer-events-none"
              >
                <div
                  className={`px-2.5 py-1 rounded-lg backdrop-blur-md transition-all shadow-lg flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#061019]/95 border border-[#1ed760] shadow-[0_0_15px_rgba(30,215,96,0.35)]'
                      : 'bg-[#040e17]/85 border border-white/15'
                  }`}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#1ed760' : city.riskColor }}
                  />
                  <span className="text-[11px] font-bold text-white tracking-wide">{city.name}</span>
                  <span
                    className="text-[10px] font-mono font-extrabold"
                    style={{ color: isSelected ? '#1ed760' : city.riskColor }}
                  >
                    {city.temp}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Telemetry & Navigation Controls Bar (Placed below canvas - 0% Earth occlusion) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#030910] border-t border-white/10 z-20">
        {/* 3D Drag Tip Badge */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#94a3b8]">
          <RotateCcw size={12} className="text-[#00f2fe] animate-spin" style={{ animationDuration: '6s' }} />
          <span>DRAG TO ROTATE 3D TWIN</span>
        </div>

        {/* Quick City Navigation Hotspots */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CITIES.slice(0, 5).map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelectCity && onSelectCity(c.name)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-full transition-all cursor-pointer shrink-0 ${
                selectedCityName.toLowerCase() === c.name.toLowerCase()
                  ? 'bg-[#1ed760] text-black font-bold shadow-[0_0_10px_rgba(30,215,96,0.5)]'
                  : 'text-[#94a3b8] hover:text-white bg-white/5 border border-white/10'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
