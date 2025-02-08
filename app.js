import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Add this new class to manage furniture data
class FurnitureItem {
  constructor(
    name,
    modelPath,
    thumbnailPath,
    defaultPosition = { x: 0, y: 0, z: 0 }
  ) {
    this.name = name;
    this.modelPath = modelPath;
    this.thumbnailPath = thumbnailPath;
    this.defaultPosition = defaultPosition;
  }
}

class ARFurnitureViewer {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.loader = new GLTFLoader();

    this.furnitureItems = [
      new FurnitureItem(
        "Modern Bookshelf",
        "./models/bookshelf.glb",
        "./thumbnails/bookshelf.png",
        { x: 0, y: 0, z: 0 }
      ),
      // this.furnitureItems = [
      //   new FurnitureItem(
      //     "Modern Sofa",
      //     "./models/sofa.glb",
      //     "./thumbnails/sofa.png",
      //     { x: 0, y: 0, z: 0 }
      //   ),
      //   new FurnitureItem(
      //     "Dining Table",
      //     "./models/table.glb",
      //     "./thumbnails/table.png",
      //     { x: 0, y: 0, z: 0 }
      //   ),
      //   new FurnitureItem(
      //     "Chair",
      //     "./models/chair.glb",
      //     "./thumbnails/chair.png",
      //     { x: 0, y: 0, z: 0 }
      //   ),
    ];

    this.selectedFurniture = null;

    this.init();
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("ar-overlay").appendChild(this.renderer.domElement);

    // Add background color to make scene visible
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(ambientLight, directionalLight);

    // Setup camera - move it back further
    this.camera.position.set(0, 2, 10);
    this.camera.lookAt(0, 0, 0);

    // Add controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Load room scan
    this.loadRoomScan();

    this.setupFurnitureGallery();

    // Start animation loop
    this.animate();
  }

  loadRoomScan() {
    // Create a ground plane instead of loading a room
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x999999,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    // Uncomment this when you have a room.glb file
    /*
    this.loader.load(
        "./models/room.glb",
        ...
    );
    */
  }

  setupFurnitureGallery() {
    const gallery = document.getElementById("furniture-gallery");

    this.furnitureItems.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "furniture-item";

      itemElement.innerHTML = `
                <img src="${item.thumbnailPath}" alt="${item.name}">
                <h3>${item.name}</h3>
            `;

      itemElement.addEventListener("click", () => {
        this.loadFurniture(item.modelPath, item.defaultPosition);
      });

      gallery.appendChild(itemElement);
    });
  }

  loadFurniture(furniturePath, position = { x: 0, y: 0, z: 0 }) {
    // Remove previously selected furniture if it exists
    if (this.selectedFurniture) {
      this.scene.remove(this.selectedFurniture);
    }

    this.loader.load(
      furniturePath,
      (gltf) => {
        const furniture = gltf.scene;
        furniture.position.set(position.x, position.y, position.z);
        this.scene.add(furniture);
        this.selectedFurniture = furniture;

        // Add click-and-drag functionality
        this.setupFurnitureDrag(furniture);
      },
      (progress) => {
        console.log(
          "Loading furniture:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading furniture:", error);
      }
    );
  }

  setupFurnitureDrag(furniture) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0)); // horizontal plane
    let intersectionPoint = new THREE.Vector3();

    const onMouseDown = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(furniture, true);

      if (intersects.length > 0) {
        isDragging = true;
        // Create a plane at the furniture's height
        dragPlane.constant = -furniture.position.y;
        document.body.style.cursor = "grabbing";
      }
    };

    const onMouseMove = (event) => {
      if (!isDragging) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
        furniture.position.x = intersectionPoint.x;
        furniture.position.z = intersectionPoint.z;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "default";
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Initialize the viewer
const viewer = new ARFurnitureViewer();

// Handle window resizing
window.addEventListener("resize", () => viewer.handleResize());
