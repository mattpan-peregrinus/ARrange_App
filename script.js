// script.js

let scene, camera, renderer, controls;

function init() {
  // 1. Create scene
  scene = new THREE.Scene();

  // 2. Create camera (PerspectiveCamera: fov, aspect, near, far)
  const fov = 60;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 2, 5); // move it backward (z=5) and slightly up (y=2)

  // 3. Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Append renderer to our container div
  const container = document.getElementById('canvas-container');
  container.appendChild(renderer.domElement);

  // 4. Add basic lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);

  // 5. Add OrbitControls for camera
  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // 6. Load a 3D model (e.g., a scanned room)
  loadRoomModel();

  // Start the animation loop
  animate();
}

function loadRoomModel() {
  const loader = new THREE.GLTFLoader();

  // Path to your scanned .glb file (inside the "models" folder)
  loader.load(
    'models/room.glb',
    function (gltf) {
      const roomScene = gltf.scene;
      // Optionally, scale/position the model
      roomScene.scale.set(1, 1, 1); 
      // Add room to scene
      scene.add(roomScene);
    },
    // onProgress callback
    function (xhr) {
      console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
    },
    // onError callback
    function (error) {
      console.error('An error occurred while loading the 3D model', error);
    }
  );
}

function animate() {
  requestAnimationFrame(animate);

  // Update camera controls
  controls.update();

  // Render the scene
  renderer.render(scene, camera);
}

// Call init when the page loads
window.addEventListener('load', init);

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
