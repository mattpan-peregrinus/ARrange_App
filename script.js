// script.js

let scene, camera, renderer, controls;
let floorMesh = null;         // Will hold our floor mesh
let furnitureToPlace = null;  // Holds the GLTF scene awaiting placement

function init() {
  // 1. Create scene
  scene = new THREE.Scene();
  
  // 2. Create camera (PerspectiveCamera: fov, aspect, near, far)
  const fov = 60;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 5, 10); // Adjust as needed

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
  controls.minDistance = 1;   // Keep the camera from zooming in too close
  controls.maxDistance = 50;  // Limit the max zoom-out distance

  // 6. Create or load a floor for raycasting
  createFloorMesh(); 
  // or if you have a scanned room, call loadRoomModel(); then set floorMesh to that portion of the scene.

  // 7. Listen for user clicks to place furniture
  document.addEventListener('click', onDocumentClick, false);

  // 8. Start the animation loop
  animate();
}

// Example of creating a basic plane as our "floor"
function createFloorMesh() {
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2; // Lay it flat (horizontal)
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);
}

/*
// If you'd rather load a scanned room model, do something like:
function loadRoomModel() {
  const loader = new THREE.GLTFLoader();
  loader.load('models/room.glb', (gltf) => {
    const roomScene = gltf.scene;
    scene.add(roomScene);
    
    // If the floor is a separate mesh in your model, identify it here:
    // floorMesh = roomScene.getObjectByName('Floor');
  });
}
*/

// Function to load a furniture model and store it for placement
function addFurniture(modelPath) {
  const loader = new THREE.GLTFLoader();
  loader.load(modelPath, (gltf) => {
    furnitureToPlace = gltf.scene;
    
    // Example scaling or adjustments
    furnitureToPlace.scale.set(0.5, 0.5, 0.5);
    console.log('Furniture loaded, click on the floor to place it.');
    
  }, 
  undefined, 
  (error) => {
    console.error('Error loading furniture model:', error);
  });
}

// Raycasting handler for placing furniture on a click
function onDocumentClick(event) {
  // If we don't have any furniture ready to place, ignore the click
  if (!furnitureToPlace) return;

  // Convert mouse position to normalized device coordinates (-1 to +1)
  const mouse = new THREE.Vector2(
    ( event.clientX / window.innerWidth ) * 2 - 1,
    - ( event.clientY / window.innerHeight ) * 2 + 1
  );

  // Create a ray from the camera
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Intersect the ray with our floor mesh
  // (If using a scanned model as your floor, you can intersect with that mesh)
  const intersects = raycaster.intersectObject(floorMesh, true);

  if (intersects.length > 0) {
    // Get the point of intersection (where the user clicked on the floor)
    const point = intersects[0].point;

    // Clone the furniture so we can place multiple pieces (if you like)
    const newFurniture = furnitureToPlace.clone();
    newFurniture.position.copy(point);

    // Optional: adjust the Y position so it sits on top of the floor if needed
    // newFurniture.position.y += offsetHeight; // if the model sinks into floor
    
    scene.add(newFurniture);

    // If you want to place only one piece, reset furnitureToPlace
    // furnitureToPlace = null;
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
window.addEventListener('load', init);
