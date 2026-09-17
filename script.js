```javascript
/* =========================================================
   ROBOLAB ENGINEERING PLATFORM
   Main JavaScript
========================================================= */


/* =========================================================
   NAVIGATION
========================================================= */

const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

const pageTitles = {
    dashboard: "Центр робототехнического проекта",
    builder: "3D Конструктор робота",
    components: "Каталог компонентов",
    electronics: "Электрическая система",
    code: "RoboCode — программирование",
    calculator: "Инженерные расчёты",
    testing: "Система диагностики",
    documentation: "Инженерная документация"
};

const sectionNames = {
    dashboard: "Главная",
    builder: "3D Сборка",
    components: "Компоненты",
    electronics: "Электросхема",
    code: "RoboCode",
    calculator: "Расчёты",
    testing: "Тестирование",
    documentation: "Документация"
};


function openPage(pageId) {

    pages.forEach(page => {
        page.classList.remove("active");
    });

    navItems.forEach(item => {
        item.classList.remove("active");
    });

    const target = document.getElementById(pageId);

    if (target) {
        target.classList.add("active");
    }

    const nav = document.querySelector(
        `.nav-item[data-page="${pageId}"]`
    );

    if (nav) {
        nav.classList.add("active");
    }

    document.getElementById("pageTitle").textContent =
        pageTitles[pageId];

    document.getElementById("currentSection").textContent =
        sectionNames[pageId];

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (pageId === "builder") {
        setTimeout(() => {
            resizeThree();
        }, 100);
    }
}


navItems.forEach(item => {

    item.addEventListener("click", () => {

        const page = item.dataset.page;

        openPage(page);

    });

});


document.querySelectorAll("[data-open]").forEach(button => {

    button.addEventListener("click", () => {

        openPage(button.dataset.open);

    });

});


/* =========================================================
   TOAST
========================================================= */

const toast = document.getElementById("toast");

function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);

}


/* =========================================================
   THREE.JS 3D ROBOT
========================================================= */

let scene;
let camera;
let renderer;

let robot;
let robotBody;
let robotHead;

let grid;

let autoRotate = false;
let isDragging = false;

let previousMouse = {
    x: 0,
    y: 0
};

let rotation = {
    x: 0,
    y: 0
};


function initThree() {

    const container = document.getElementById("threeContainer");

    if (!container || !window.THREE) {
        return;
    }

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x080c11);


    /* CAMERA */

    camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );

    camera.position.set(
        4.2,
        3.2,
        6
    );


    /* RENDERER */

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );

    renderer.shadowMap.enabled = true;

    container.appendChild(renderer.domElement);


    /* LIGHTS */

    const ambient = new THREE.AmbientLight(
        0xffffff,
        0.55
    );

    scene.add(ambient);


    const light = new THREE.DirectionalLight(
        0xffffff,
        1.2
    );

    light.position.set(
        5,
        8,
        5
    );

    light.castShadow = true;

    scene.add(light);


    const greenLight = new THREE.PointLight(
        0x43e6a5,
        2,
        10
    );

    greenLight.position.set(
        0,
        2,
        2
    );

    scene.add(greenLight);


    /* GRID */

    grid = new THREE.GridHelper(
        12,
        24,
        0x243241,
        0x151e29
    );

    grid.position.y = -1.15;

    scene.add(grid);


    /* ROBOT */

    robot = new THREE.Group();

    scene.add(robot);


    createRobot();


    /* EVENTS */

    renderer.domElement.addEventListener(
        "mousedown",
        startDrag
    );

    renderer.domElement.addEventListener(
        "mousemove",
        drag
    );

    renderer.domElement.addEventListener(
        "mouseup",
        stopDrag
    );

    renderer.domElement.addEventListener(
        "mouseleave",
        stopDrag
    );

    renderer.domElement.addEventListener(
        "wheel",
        zoomCamera
    );


    animate();

}


function material(color, metalness = 0.2) {

    return new THREE.MeshStandardMaterial({
        color,
        metalness,
        roughness: 0.35
    });

}


function createBox(
    width,
    height,
    depth,
    color,
    x,
    y,
    z
) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            depth
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material(color)
        );

    mesh.position.set(
        x,
        y,
        z
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    robot.add(mesh);

    return mesh;

}


function createCylinder(
    radius,
    height,
    color,
    x,
    y,
    z,
    rotationZ = 0
) {

    const geometry =
        new THREE.CylinderGeometry(
            radius,
            radius,
            height,
            32
        );

    const mesh =
        new THREE.Mesh(
            geometry,
            material(color)
        );

    mesh.position.set(
        x,
        y,
        z
    );

    mesh.rotation.z = rotationZ;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    robot.add(mesh);

    return mesh;

}


function createWheel(x) {

    const geometry =
        new THREE.CylinderGeometry(
            0.62,
            0.62,
            0.35,
            32
        );

    const wheel =
        new THREE.Mesh(
            geometry,
            material(0x151b23, 0.7)
        );

    wheel.rotation.z =
        Math.PI / 2;

    wheel.position.set(
        x,
        -0.65,
        0
    );

    wheel.castShadow = true;

    robot.add(wheel);


    const hubGeometry =
        new THREE.CylinderGeometry(
            0.19,
            0.19,
            0.38,
            20
        );

    const hub =
        new THREE.Mesh(
            hubGeometry,
            material(0x43e6a5, 0.4)
        );

    hub.rotation.z =
        Math.PI / 2;

    hub.position.set(
        x,
        -0.65,
        0
    );

    robot.add(hub);

}


function createRobot() {

    /* Main chassis */

    robotBody = createBox(
        2.5,
        0.55,
        1.65,
        0x273544,
        0,
        0,
        0
    );


    /* Top plate */

    createBox(
        1.7,
        0.15,
        1.25,
        0x364657,
        0,
        0.37,
        0
    );


    /* Front bumper */

    createBox(
        2.35,
        0.25,
        0.15,
        0x43e6a5,
        0,
        -0.05,
        -0.83
    );


    /* Head / sensor housing */

    robotHead = createBox(
        0.85,
        0.48,
        0.65,
        0x1c2734,
        0,
        0.82,
        0.35
    );


    /* Camera lens */

    const lensGeometry =
        new THREE.CylinderGeometry(
            0.18,
            0.18,
            0.12,
            24
        );

    const lens =
        new THREE.Mesh(
            lensGeometry,
            material(0x43e6a5, 0.7)
        );

    lens.rotation.x =
        Math.PI / 2;

    lens.position.set(
        0,
        0.82,
        0.69
    );

    robot.add(lens);


    /* Wheels */

    createWheel(1.28);
    createWheel(-1.28);


    /* Back wheels */

    createWheel(1.28);
    createWheel(-1.28);


    /* Antenna */

    const antenna =
        createCylinder(
            0.045,
            0.65,
            0x687789,
            0.3,
            1.45,
            0.35
        );

    antenna.rotation.z = 0;


    const antennaTip =
        new THREE.Mesh(
            new THREE.SphereGeometry(
                0.09,
                16,
                16
            ),
            material(0x43e6a5)
        );

    antennaTip.position.set(
        0.3,
        1.79,
        0.35
    );

    robot.add(antennaTip);


    /* Side motors */

    createCylinder(
        0.34,
        0.35,
        0x566577,
        1.28,
        0,
        0,
        Math.PI / 2
    );

    createCylinder(
        0.34,
        0.35,
        0x566577,
        -1.28,
        0,
        0,
        Math.PI / 2
    );


    robot.rotation.y = -0.45;

}


function startDrag(event) {

    isDragging = true;

    previousMouse.x = event.clientX;
    previousMouse.y = event.clientY;

}


function drag(event) {

    if (!isDragging || !robot) {
        return;
    }

    const deltaX =
        event.clientX -
        previousMouse.x;

    const deltaY =
        event.clientY -
        previousMouse.y;

    robot.rotation.y +=
        deltaX * 0.008;

    robot.rotation.x +=
        deltaY * 0.005;

    robot.rotation.x =
        Math.max(
            -0.8,
            Math.min(
                0.8,
                robot.rotation.x
            )
        );

    previousMouse.x = event.clientX;
    previousMouse.y = event.clientY;

}


function stopDrag() {

    isDragging = false;

}


function zoomCamera(event) {

    if (!camera) {
        return;
    }

    camera.position.z +=
        event.deltaY * 0.004;

    camera.position.z =
        Math.max(
            3,
            Math.min(
                10,
                camera.position.z
            )
        );

}


function animate() {

    requestAnimationFrame(animate);

    if (autoRotate && robot) {

        robot.rotation.y += 0.006;

    }

    if (renderer && scene && camera) {

        renderer.render(
            scene,
            camera
        );

    }

}


function resizeThree() {

    const container =
        document.getElementById(
            "threeContainer"
        );

    if (!container || !renderer || !camera) {
        return;
    }

    camera.aspect =
        container.clientWidth /
        container.clientHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );

}


window.addEventListener(
    "resize",
    resizeThree
);


/* RESET CAMERA */

document
    .getElementById("resetCamera")
    .addEventListener("click", () => {

        camera.position.set(
            4.2,
            3.2,
            6
        );

        robot.rotation.set(
            0,
            -0.45,
            0
        );

    });


/* AUTO ROTATION */

document
    .getElementById("rotateRobot")
    .addEventListener("click", () => {

        autoRotate = !autoRotate;

        showToast(
            autoRotate
                ? "Автовращение включено"
                : "Автовращение выключено"
        );

    });


/* GRID */

document
    .getElementById("toggleGrid")
    .addEventListener("click", () => {

        grid.visible =
            !grid.visible;

    });


/* R KEY */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key.toLowerCase() === "r" &&
            camera &&
            robot
        ) {

            camera.position.set(
                4.2,
                3.2,
                6
            );

            robot.rotation.set(
                0,
                -0.45,
                0
            );

        }

    }
);


/* =========================================================
   COMPONENT SEARCH
========================================================= */

const componentSearch =
    document.getElementById(
        "componentSearch"
    );

if (componentSearch) {

    componentSearch.addEventListener(
        "input",
        () => {

            const query =
                componentSearch.value
                    .toLowerCase()
                    .trim();

            document
                .querySelectorAll(".component-card")
                .forEach(card => {

                    const name =
                        card.dataset.name;

                    card.style.display =
                        name.includes(query)
                            ? "block"
                            : "none";

                });

        }
    );

}


/* =========================================================
   ADD COMPONENT
========================================================= */

let componentCount = 6;

document
    .querySelectorAll(".add-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const component =
                    button.dataset.component;

                componentCount++;

                document
                    .getElementById(
                        "componentCount"
                    )
                    .textContent =
                    componentCount;

                showToast(
                    `${component} добавлен в проект`
                );

            }
        );

    });


document
    .getElementById("addComponent")
    .addEventListener(
        "click",
        () => {

            openPage("components");

            showToast(
                "Выберите компонент из каталога"
            );

        }
    );


/* =========================================================
   ENGINEERING CALCULATOR
========================================================= */

document
    .getElementById("calculate")
    .addEventListener(
        "click",
        calculateSystem
    );


function calculateSystem() {

    const mass =
        Number(
            document.getElementById(
                "robotMass"
            ).value
        );

    const motorPower =
        Number(
            document.getElementById(
                "motorPower"
            ).value
        );

    const capacity =
        Number(
            document.getElementById(
                "batteryCapacity"
            ).value
        );

    const voltage =
        Number(
            document.getElementById(
                "batteryVoltage"
            ).value
        );


    /* Two motors */

    const totalPower =
        motorPower * 2;


    /* Battery energy */

    const energy =
        capacity * voltage;


    /* Runtime */

    const runtime =
        totalPower > 0
            ? energy / totalPower
            : 0;


    /* Weight force */

    const load =
        mass * 9.81;


    document.getElementById(
        "totalPower"
    ).textContent =
        `${totalPower.toFixed(0)} W`;


    document.getElementById(
        "energy"
    ).textContent =
        `${energy.toFixed(1)} Wh`;


    document.getElementById(
        "runtime"
    ).textContent =
        `${runtime.toFixed(2)} h`;


    document.getElementById(
        "load"
    ).textContent =
        `${load.toFixed(1)} N`;


    document.getElementById(
        "massStat"
    ).textContent =
        `${mass.toFixed(2)} кг`;


    document.getElementById(
        "powerStat"
    ).textContent =
        `${totalPower.toFixed(0)} W`;


    showToast(
        "Расчёты обновлены"
    );

}


/* =========================================================
   CODE EDITOR
========================================================= */

const codeEditor =
    document.getElementById(
        "codeEditor"
    );


document
    .querySelectorAll(".code-snippet")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const code =
                    button.dataset.code;

                const start =
                    codeEditor.selectionStart;

                const end =
                    codeEditor.selectionEnd;

                const oldValue =
                    codeEditor.value;

                codeEditor.value =
                    oldValue.substring(
                        0,
                        start
                    ) +
                    code +
                    oldValue.substring(
                        end
                    );

                codeEditor.focus();

            }
        );

    });


/* RUN CODE */

document
    .getElementById("runCode")
    .addEventListener(
        "click",
        () => {

            const terminal =
                document.getElementById(
                    "terminal"
                );

            terminal.innerHTML = `
                <div>> RoboLab terminal</div>
                <div>> Compiling robot_control.ino...</div>
                <div>> Checking syntax...</div>
                <div>> GPIO configuration: OK</div>
                <div>> Sensor configuration: OK</div>
                <div>> Motors configuration: OK</div>
                <div>> Build completed successfully.</div>
                <div>> Ready for ESP32 upload.</div>
            `;

            showToast(
                "Код успешно проверен"
            );

        }
    );


/* =========================================================
   DIAGNOSTICS
========================================================= */

document
    .getElementById("runDiagnostics")
    .addEventListener(
        "click",
        () => {

            const status =
                document.getElementById(
                    "diagnosticStatus"
                );

            status.textContent =
                "RUNNING...";

            const rows =
                document.querySelectorAll(
                    ".diagnostic-row"
                );

            rows.forEach(
                (row, index) => {

                    setTimeout(
                        () => {

                            row.style.background =
                                "rgba(67,230,165,.035)";

                        },
                        index * 300
                    );

                }
            );


            setTimeout(
                () => {

                    status.textContent =
                        "DIAGNOSTICS COMPLETE";

                    showToast(
                        "Диагностика завершена"
                    );

                },
                1800
            );

        }
    );


/* =========================================================
   SAVE PROJECT
========================================================= */

document
    .getElementById("saveProject")
    .addEventListener(
        "click",
        saveProject
    );


function saveProject() {

    const project = {

        name:
            document.getElementById(
                "projectName"
            ).textContent,

        components:
            componentCount,

        code:
            codeEditor.value,

        robotMass:
            document.getElementById(
                "robotMass"
            ).value,

        motorPower:
            document.getElementById(
                "motorPower"
            ).value,

        batteryCapacity:
            document.getElementById(
                "batteryCapacity"
            ).value,

        batteryVoltage:
            document.getElementById(
                "batteryVoltage"
            ).value,

        savedAt:
            new Date().toISOString()

    };


    localStorage.setItem(
        "robolabProject",
        JSON.stringify(project)
    );


    showToast(
        "✓ Проект сохранён в браузере"
    );

}


/* =========================================================
   LOAD PROJECT
========================================================= */

function loadProject() {

    const saved =
        localStorage.getItem(
            "robolabProject"
        );

    if (!saved) {
        return;
    }

    try {

        const project =
            JSON.parse(saved);


        componentCount =
            project.components || 6;


        document.getElementById(
            "componentCount"
        ).textContent =
            componentCount;


        if (project.code) {

            codeEditor.value =
                project.code;

        }


        if (project.robotMass) {

            document.getElementById(
                "robotMass"
            ).value =
                project.robotMass;

        }


        if (project.motorPower) {

            document.getElementById(
                "motorPower"
            ).value =
                project.motorPower;

        }


        if (project.batteryCapacity) {

            document.getElementById(
                "batteryCapacity"
            ).value =
                project.batteryCapacity;

        }


        if (project.batteryVoltage) {

            document.getElementById(
                "batteryVoltage"
            ).value =
                project.batteryVoltage;

        }

    } catch (error) {

        console.error(
            "Project loading error:",
            error
        );

    }

}


/* =========================================================
   START APPLICATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initThree();

        loadProject();

        calculateSystem();

    }
);
```
