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
      new FurnitureItem(
        "Modern Sofa",
        "./models/sofa.glb",
        "./thumbnails/sofa.png",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Dining Table",
        "./models/table.glb",
        "./thumbnails/table.png",
        { x: 0, y: 0, z: 0 }
      ),
      new FurnitureItem(
        "Chair",
        "./models/chair.glb",
        "./thumbnails/chair.png",
        { x: 0, y: 0, z: 0 }
      ),
    ];

    this.selectedFurniture = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));

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

    // Add drag and drop event listeners
    this.setupDragAndDrop();

    // Start animation loop
    this.animate();
  }

  loadRoomScan() {
    // Remove the ground plane code and load the room model instead
    this.loader.load(
      "./models/room.glb",
      (gltf) => {
        const room = gltf.scene;
        this.scene.add(room);
        console.log("Room loaded successfully");

        // Update the drag plane to match the room's floor
        // Assuming the room model's floor is at y=0
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      },
      (progress) => {
        console.log(
          "Loading room:",
          (progress.loaded / progress.total) * 100 + "%"
        );
      },
      (error) => {
        console.error("Error loading room:", error);
        console.error("Error details:", {
          message: error.message,
          type: error.type,
          url: "./models/room.glb",
        });

        // Fallback to a ground plane if room loading fails
        console.log("Creating fallback ground plane...");
        const groundGeometry = new THREE.PlaneGeometry(10, 10);
        const groundMaterial = new THREE.MeshPhongMaterial({
          color: 0x999999,
          side: THREE.DoubleSide,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
      }
    );
  }

  setupDragAndDrop() {
    const overlay = document.getElementById("ar-overlay");

    overlay.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    overlay.addEventListener("drop", (event) => {
      event.preventDefault();
      const modelPath = event.dataTransfer.getData("model");

      // Calculate drop position in 3D space
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectionPoint = new THREE.Vector3();

      if (
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectionPoint)
      ) {
        this.loadFurniture(modelPath, {
          x: intersectionPoint.x,
          y: 0,
          z: intersectionPoint.z,
        });
      }
    });
  }

  setupFurnitureGallery() {
    const gallery = document.getElementById("furniture-gallery");

    this.furnitureItems.forEach((item) => {
      const itemElement = document.createElement("div");
      itemElement.className = "furniture-item";
      itemElement.draggable = true;

      itemElement.innerHTML = `
        <img src="${item.thumbnailPath}" alt="${item.name}">
        <h3>${item.name}</h3>
      `;

      // Add drag start event
      itemElement.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("model", item.modelPath);
        event.dataTransfer.effectAllowed = "move";
        itemElement.classList.add("dragging");
      });

      // Add drag end event
      itemElement.addEventListener("dragend", () => {
        itemElement.classList.remove("dragging");
      });

      // Keep the click event for backward compatibility
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
