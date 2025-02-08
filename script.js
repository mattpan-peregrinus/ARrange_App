let scene, camera, renderer, controls;
let floorMesh = null;         
let furnitureToPlace = null;  
let currentDraggedModel = null;
let activeFurniture = null;
let selectedFurniture = null;

function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera (PerspectiveCamera: fov, aspect, near, far)
    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 5, 10);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Append renderer to container div
    const container = document.getElementById('canvas-container');
    container.appendChild(renderer.domElement);

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Add OrbitControls for camera
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 50;

    // Create floor for raycasting
    createFloorMesh();

    // Initialize drag-and-drop for furniture items
    initDragAndDrop();

    // Initialize selection and controls
    makeObjectsSelectable();
    handleResize();
    handleRotation();

    // Set up size slider
    const sizeSlider = document.getElementById('size-slider');
    sizeSlider.addEventListener('input', (event) => {
        if (selectedFurniture) {
            const scale = parseFloat(event.target.value);
            selectedFurniture.scale.set(scale, scale, scale);
        }
    });

    // Set up confirm placement button
    document.getElementById('confirm-placement').addEventListener('click', () => {
        selectedFurniture = null;
        document.getElementById('size-controls').style.display = 'none';
    });

    // Start animation loop
    animate();
}

function initDragAndDrop() {
    const furnitureItems = document.querySelectorAll('.furniture-item');
    const canvasContainer = document.getElementById('canvas-container');

    furnitureItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            currentDraggedModel = item.dataset.model;
        });
    });

    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (currentDraggedModel) {
            const rect = canvasContainer.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / canvasContainer.clientWidth) * 2 - 1,
                -((e.clientY - rect.top) / canvasContainer.clientHeight) * 2 + 1
            );

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(floorMesh, true);

            if (intersects.length > 0) {
                const point = intersects[0].point;
                addFurniture(currentDraggedModel, point);
            }
        }
    });
}

function makeObjectsSelectable() {
    renderer.domElement.addEventListener('click', (event) => {
        event.preventDefault();
        
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / renderer.domElement.clientWidth) * 2 - 1,
            -((event.clientY - rect.top) / renderer.domElement.clientHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const objects = scene.children.filter(obj => obj !== floorMesh);
        const intersects = raycaster.intersectObjects(objects, true);

        if (intersects.length > 0) {
            let object = intersects[0].object;
            while (object.parent && object.parent !== scene) {
                object = object.parent;
            }
            selectedFurniture = object;
            document.getElementById('size-controls').style.display = 'block';
            
            // Update size slider to match current scale
            document.getElementById('size-slider').value = object.scale.x;
        } else {
            selectedFurniture = null;
            document.getElementById('size-controls').style.display = 'none';
        }
    });
}

function handleResize() {
    renderer.domElement.addEventListener('wheel', (event) => {
        if (selectedFurniture) {
            event.preventDefault();
            const scaleFactor = event.deltaY > 0 ? 0.95 : 1.05;
            selectedFurniture.scale.multiplyScalar(scaleFactor);
            // Update size slider to match new scale
            document.getElementById('size-slider').value = selectedFurniture.scale.x;
        }
    }, { passive: false });
}

function handleRotation() {
    document.addEventListener('keydown', (event) => {
        if (selectedFurniture) {
            switch(event.key) {
                case 'r':
                case 'R':
                    selectedFurniture.rotation.y += Math.PI / 4;
                    break;
                case 'e':
                case 'E':
                    selectedFurniture.rotation.y -= Math.PI / 4;
                    break;
            }
        }
    });
}

function createFloorMesh() {
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
}

function addFurniture(modelPath, position) {
    const loader = new THREE.GLTFLoader();
    loader.load(modelPath, (gltf) => {
        const furniture = gltf.scene;
        furniture.position.copy(position);
        furniture.scale.set(0.5, 0.5, 0.5);
        scene.add(furniture);
        
        selectedFurniture = furniture;
        document.getElementById('size-controls').style.display = 'block';
        document.getElementById('size-slider').value = 0.5;
        
        console.log(`${modelPath} placed at`, position);
    }, 
    undefined, 
    (error) => {
        console.error(`Error loading model from ${modelPath}:`, error);
    });
}

function animate() {
    requestAnimationFrame(animate);

    scene.traverse((object) => {
        if (object.isMesh) {
            if (object === selectedFurniture || 
                (object.parent && (object.parent === selectedFurniture || object.parent.parent === selectedFurniture))) {
                object.material.emissive = new THREE.Color(0x333333);
            } else {
                object.material.emissive = new THREE.Color(0x000000);
            }
        }
    });
    
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('load', init);