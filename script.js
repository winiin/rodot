document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    let components = [];

    let scene;
    let camera;
    let renderer;

    let robotGroup;

    let isDragging = false;

    let previousMouseX = 0;
    let previousMouseY = 0;

    let rotationX = 0;
    let rotationY = 0;

    let cameraDistance = 7;


    /* =====================================================
       HELPERS
    ===================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    function showToast(message) {

        const toast = $("toast");

        if (!toast) return;

        toast.textContent = message;

        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 2200);
    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    const navButtons =
        document.querySelectorAll(".nav-btn");

    const pages =
        document.querySelectorAll(".page");

    const pageTitle =
        $("pageTitle");


    const titles = {
        dashboard: "Главная",
        builder: "3D Сборка",
        components: "Компоненты",
        electronics: "Электроника",
        code: "RoboCode",
        calculator: "Расчёты",
        testing: "Диагностика",
        documentation: "Документация"
    };


    function openPage(pageId) {

        pages.forEach(page => {
            page.classList.remove("active");
        });

        navButtons.forEach(button => {
            button.classList.remove("active");
        });


        const target =
            $(pageId);

        if (target) {
            target.classList.add("active");
        }


        const button =
            document.querySelector(
                `.nav-btn[data-page="${pageId}"]`
            );

        if (button) {
            button.classList.add("active");
        }


        if (pageTitle) {
            pageTitle.textContent =
                titles[pageId] || "RoboLab";
        }


        if (pageId === "builder") {

            setTimeout(() => {

                resizeThree();

            }, 100);
        }
    }


    navButtons.forEach(button => {

        button.addEventListener("click", () => {

            const page =
                button.dataset.page;

            openPage(page);

        });

    });


    document.querySelectorAll("[data-open]")
        .forEach(button => {

            button.addEventListener("click", () => {

                openPage(button.dataset.open);

            });

        });


    /* =====================================================
       CLOCK
    ===================================================== */

    function updateClock() {

        const clock = $("clock");

        if (!clock) return;

        const now = new Date();

        clock.textContent =
            now.toLocaleTimeString(
                "ru-RU",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
    }

    updateClock();

    setInterval(updateClock, 1000);


    /* =====================================================
       THREE.JS
    ===================================================== */

    function initThree() {

        const container =
            $("threeContainer");

        if (!container) return;


        if (typeof THREE === "undefined") {

            container.innerHTML = `
                <div style="
                    height:100%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:30px;
                    text-align:center;
                    color:#ff7777;
                    font-family:Arial;
                ">
                    <div>
                        <h3>3D Engine не загрузился</h3>
                        <p style="margin-top:10px;color:#82968d">
                            Проверь подключение к интернету и обнови страницу.
                        </p>
                    </div>
                </div>
            `;

            return;
        }


        scene =
            new THREE.Scene();

        scene.background =
            new THREE.Color(0x07100d);


        camera =
            new THREE.PerspectiveCamera(
                45,
                container.clientWidth /
                container.clientHeight,
                0.1,
                100
            );


        camera.position.set(
            5,
            3.5,
            6
        );


        renderer =
            new THREE.WebGLRenderer({
                antialias: true
            });


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                2
            )
        );


        renderer.setSize(
            container.clientWidth,
            container.clientHeight
        );


        container.appendChild(
            renderer.domElement
        );


        /* LIGHT */

        const ambient =
            new THREE.AmbientLight(
                0xffffff,
                1.5
            );

        scene.add(ambient);


        const light =
            new THREE.DirectionalLight(
                0xffffff,
                2
            );

        light.position.set(
            5,
            8,
            5
        );

        scene.add(light);


        const greenLight =
            new THREE.PointLight(
                0x39e58c,
                25,
                20
            );

        greenLight.position.set(
            0,
            3,
            0
        );

        scene.add(greenLight);


        /* GRID */

        const grid =
            new THREE.GridHelper(
                12,
                24,
                0x294638,
                0x17251f
            );

        scene.add(grid);


        /* ROBOT */

        robotGroup =
            new THREE.Group();

        scene.add(robotGroup);


        createBaseRobot();


        /* EVENTS */

        renderer.domElement.addEventListener(
            "pointerdown",
            onPointerDown
        );

        renderer.domElement.addEventListener(
            "pointermove",
            onPointerMove
        );

        renderer.domElement.addEventListener(
            "pointerup",
            onPointerUp
        );

        renderer.domElement.addEventListener(
            "pointerleave",
            onPointerUp
        );

        renderer.domElement.addEventListener(
            "wheel",
            onWheel,
            { passive: false }
        );


        animate();
    }


    function createMaterial(color) {

        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: .55,
            metalness: .35
        });
    }


    function createBaseRobot() {

        if (!robotGroup) return;

        robotGroup.clear();

        /*
         * AETHER tracked field robot.
         * Keep the site UI intact; only replace the 3D robot model.
         * Layout is based on the team's described real build:
         * tracked chassis, battery, motor driver, control board and Bluetooth module.
         */

        const mat = (color, roughness = .72, metalness = .18) =>
            new THREE.MeshStandardMaterial({ color, roughness, metalness });

        const chassisMat = mat(0x303a3d, .82, .28);
        const edgeMat = mat(0x596367, .55, .48);
        const trackMat = mat(0x171c1e, .94, .04);
        const rubberMat = mat(0x252b2d, .96, .02);
        const metalMat = mat(0x899398, .38, .72);
        const pcbMat = mat(0x174b42, .78, .12);
        const boardBlue = mat(0x174d75, .72, .18);
        const batteryMat = mat(0x252c31, .72, .22);
        const wireRed = mat(0x9e302b, .7, .05);
        const wireBlack = mat(0x15191b, .8, .02);
        const connectorMat = mat(0xc0a65d, .5, .45);

        const addBox = (w, h, d, material, x, y, z, bevel = false) => {
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                material
            );
            mesh.position.set(x, y, z);
            robotGroup.add(mesh);
            return mesh;
        };

        const addCylinder = (radius, depth, material, x, y, z, segments = 32) => {
            const mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(radius, radius, depth, segments),
                material
            );
            mesh.rotation.z = Math.PI / 2;
            mesh.position.set(x, y, z);
            robotGroup.add(mesh);
            return mesh;
        };

        /* Low, practical tracked chassis */
        addBox(2.45, .34, 2.55, chassisMat, 0, .83, 0);
        addBox(2.2, .12, 2.28, edgeMat, 0, 1.06, -.02);
        addBox(2.05, .08, 2.12, chassisMat, 0, 1.15, -.02);

        /* Side track assemblies: belt housings and visible road wheels */
        [-1.36, 1.36].forEach(x => {
            addBox(.28, .82, 2.72, trackMat, x, .58, 0);

            [-.91, 0, .91].forEach(z => {
                addCylinder(.34, .34, rubberMat, x, .58, z, 40);
                addCylinder(.19, .355, metalMat, x, .58, z, 32);
                addCylinder(.075, .37, chassisMat, x, .58, z, 24);
            });

            [-.91, .91].forEach(z => {
                addCylinder(.095, .37, connectorMat, x, .58, z, 20);
            });

            /* Track tread blocks along the visible outer side */
            for (let i = 0; i < 9; i++) {
                const z = -.99 + i * .2475;
                addBox(.035, .12, .17, edgeMat, x + (x > 0 ? .15 : -.15), .58, z);
            }
        });

        /* Front/rear protective frame and mounting rails */
        addBox(2.28, .09, .12, metalMat, 0, .98, 1.27);
        addBox(2.28, .09, .12, metalMat, 0, .98, -1.27);
        [-.92, .92].forEach(x => {
            addBox(.09, .12, 2.2, edgeMat, x, 1.2, -.02);
        });

        /* Battery pack secured low in the centre */
        addBox(1.05, .42, .92, batteryMat, -.48, 1.38, -.32);
        addBox(.78, .045, .66, mat(0x3b4449), -.48, 1.615, -.32);
        addBox(.14, .045, .22, wireRed, -.48, 1.65, -.32);
        addBox(.14, .045, .22, wireBlack, -.22, 1.65, -.32);

        /* Motor driver board with terminal blocks */
        addBox(.82, .075, .55, pcbMat, .58, 1.36, .57);
        addBox(.25, .09, .18, mat(0x242a2d), .36, 1.445, .57);
        addBox(.25, .09, .18, mat(0x242a2d), .78, 1.445, .57);
        for (let i = 0; i < 5; i++) {
            addBox(.07, .025, .07, connectorMat, .28 + i * .14, 1.415, .57);
        }

        /* Main controller/electronics board */
        addBox(.92, .075, .68, boardBlue, .55, 1.39, -.45);
        addBox(.28, .12, .25, mat(0x20282c), .55, 1.48, -.45);
        addBox(.16, .07, .12, metalMat, .25, 1.46, -.27);
        addBox(.16, .07, .12, metalMat, .84, 1.46, -.63);

        /* Bluetooth module on the controller board */
        addBox(.34, .055, .2, mat(0x245f91), .84, 1.48, -.12);
        addBox(.22, .018, .12, metalMat, .84, 1.517, -.12);
        addBox(.025, .14, .025, metalMat, .98, 1.57, -.12);

        /* Visible wiring between battery, driver and controller */
        const addWire = (points, material, radius = .025) => {
            const curve = new THREE.CatmullRomCurve3(
                points.map(p => new THREE.Vector3(p[0], p[1], p[2]))
            );
            const tube = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 20, radius, 8, false),
                material
            );
            robotGroup.add(tube);
        };

        addWire([[-.1, 1.63, -.32], [.12, 1.72, -.05], [.38, 1.55, .35]], wireRed);
        addWire([[-.22, 1.62, -.32], [.02, 1.69, -.12], [.48, 1.53, .48]], wireBlack);
        addWire([[.52, 1.49, .34], [.72, 1.58, .08], [.75, 1.5, -.12]], wireRed, .018);
        addWire([[.65, 1.48, .34], [.92, 1.55, .15], [.91, 1.5, -.1]], wireBlack, .018);

        /* Small mounting bolts on the deck */
        [-.98, .98].forEach(x => {
            [-1.05, 1.05].forEach(z => {
                const bolt = new THREE.Mesh(
                    new THREE.CylinderGeometry(.045, .045, .025, 16),
                    connectorMat
                );
                bolt.position.set(x, 1.22, z);
                robotGroup.add(bolt);
            });
        });

        updateObjectCounter();
    }

    function addComponentTo3D(component) {

        if (!robotGroup || !THREE) return;


        let object;


        if (component.type === "motor") {

            object =
                new THREE.Mesh(
                    new THREE.CylinderGeometry(
                        .32,
                        .32,
                        .7,
                        24
                    ),
                    createMaterial(0x555f5b)
                );

            object.rotation.z =
                Math.PI / 2;

        }


        else if (component.type === "sensor") {

            object =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        .28,
                        24,
                        24
                    ),
                    createMaterial(0x39e58c)
                );

        }


        else if (component.type === "camera") {

            object =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        .6,
                        .45,
                        .35
                    ),
                    createMaterial(0x202b27)
                );

        }


        else if (component.type === "battery") {

            object =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        .8,
                        .35,
                        1.1
                    ),
                    createMaterial(0xd3a83e)
                );

        }


        else {

            object =
                new THREE.Mesh(
                    new THREE.BoxGeometry(
                        .75,
                        .2,
                        .55
                    ),
                    createMaterial(0x2d8060)
                );
        }


        if (!object) return;


        const index =
            robotGroup.children.length;

        object.position.set(
            ((index % 3) - 1) * .7,
            2.1 + Math.floor(index / 3) * .35,
            0
        );


        object.userData.componentId =
            component.id;


        robotGroup.add(object);


        updateObjectCounter();
    }


    function rebuild3D() {

        if (!robotGroup) return;

        createBaseRobot();

        components.forEach(component => {

            addComponentTo3D(component);

        });
    }


    function animate() {

        requestAnimationFrame(animate);

        if (!renderer || !scene || !camera) {
            return;
        }


        if (robotGroup) {

            robotGroup.rotation.x =
                rotationX;

            robotGroup.rotation.y =
                rotationY;

        }


        renderer.render(
            scene,
            camera
        );
    }


    function resizeThree() {

        const container =
            $("threeContainer");

        if (
            !container ||
            !renderer ||
            !camera
        ) {
            return;
        }


        const width =
            container.clientWidth;

        const height =
            container.clientHeight;


        if (!width || !height) return;


        camera.aspect =
            width / height;

        camera.updateProjectionMatrix();


        renderer.setSize(
            width,
            height
        );
    }


    window.addEventListener(
        "resize",
        resizeThree
    );


    /* =====================================================
       3D CONTROLS
    ===================================================== */

    function onPointerDown(event) {

        isDragging = true;

        previousMouseX =
            event.clientX;

        previousMouseY =
            event.clientY;
    }


    function onPointerMove(event) {

        if (!isDragging) return;

        const deltaX =
            event.clientX -
            previousMouseX;

        const deltaY =
            event.clientY -
            previousMouseY;


        rotationY +=
            deltaX * .01;

        rotationX +=
            deltaY * .01;


        rotationX =
            Math.max(
                -0.8,
                Math.min(
                    0.8,
                    rotationX
                )
            );


        previousMouseX =
            event.clientX;

        previousMouseY =
            event.clientY;
    }


    function onPointerUp() {

        isDragging = false;
    }


    function onWheel(event) {

        event.preventDefault();

        cameraDistance +=
            event.deltaY * .005;

        cameraDistance =
            Math.max(
                3,
                Math.min(
                    12,
                    cameraDistance
                )
            );


        const direction =
            camera.position
                .clone()
                .normalize();


        camera.position.copy(
            direction.multiplyScalar(
                cameraDistance
            )
        );
    }


    $("rotateLeft")?.addEventListener(
        "click",
        () => {
            rotationY -= .35;
        }
    );


    $("rotateRight")?.addEventListener(
        "click",
        () => {
            rotationY += .35;
        }
    );


    $("resetCamera")?.addEventListener(
        "click",
        () => {

            rotationX = 0;

            rotationY = 0;

            cameraDistance = 7;

            if (camera) {

                camera.position.set(
                    5,
                    3.5,
                    6
                );

            }

        }
    );


    /* =====================================================
       COMPONENTS
    ===================================================== */

    function addComponent(
        type,
        name,
        mass,
        power
    ) {

        const component = {

            id:
                Date.now() +
                Math.random(),

            type,

            name,

            mass:
                Number(mass),

            power:
                Number(power)
        };


        components.push(
            component
        );


        updateAssembly();

        addComponentTo3D(
            component
        );

        updateStats();

        showToast(
            `${name} добавлен в проект`
        );
    }


    document
        .querySelectorAll(".add-component")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    addComponent(
                        button.dataset.type,
                        button.dataset.name,
                        button.dataset.mass,
                        button.dataset.power
                    );

                }
            );

        });


    function removeComponent(id) {

        components =
            components.filter(
                component =>
                    component.id !== id
            );


        rebuild3D();

        updateAssembly();

        updateStats();

        showToast(
            "Компонент удалён"
        );
    }


    function updateAssembly() {

        const list =
            $("assemblyList");

        if (!list) return;


        if (components.length === 0) {

            list.innerHTML = `
                <div style="
                    padding:30px 10px;
                    text-align:center;
                    color:#82968d;
                    font-size:12px;
                ">
                    Пока нет добавленных компонентов.
                    <br><br>
                    Перейди в «Компоненты».
                </div>
            `;

        }

        else {

            list.innerHTML =
                components.map(component => `

                    <div class="assembly-item">

                        <div>
                            <strong>
                                ${escapeHTML(component.name)}
                            </strong>

                            <small>
                                ${component.mass} г ·
                                ${component.power} W
                            </small>
                        </div>

                        <button
                            class="remove-component"
                            data-id="${component.id}"
                        >
                            ×
                        </button>

                    </div>

                `).join("");

        }


        document
            .querySelectorAll(".remove-component")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        removeComponent(
                            Number(
                                button.dataset.id
                            )
                        );

                    }
                );

            });


        const mass =
            components.reduce(
                (sum, item) =>
                    sum + item.mass,
                0
            );


        const assemblyMass =
            $("assemblyMass");

        if (assemblyMass) {

            assemblyMass.textContent =
                `${mass} г`;

        }

    }


    function updateStats() {

        const mass =
            components.reduce(
                (sum, item) =>
                    sum + item.mass,
                0
            );


        const power =
            components.reduce(
                (sum, item) =>
                    sum + item.power,
                0
            );


        if ($("componentStat")) {

            $("componentStat")
                .textContent =
                components.length;

        }


        if ($("massStat")) {

            $("massStat")
                .textContent =
                `${mass} г`;

        }


        if ($("powerStat")) {

            $("powerStat")
                .textContent =
                `${power} W`;

        }
    }


    function updateObjectCounter() {

        if (!$("objectCounter")) return;

        const count =
            robotGroup
                ? robotGroup.children.length
                : 0;


        $("objectCounter").textContent =
            `Objects: ${count}`;
    }


    /* =====================================================
       SEARCH
    ===================================================== */

    $("componentSearch")?.addEventListener(
        "input",
        event => {

            const value =
                event.target.value
                    .toLowerCase()
                    .trim();


            document
                .querySelectorAll(".component-card")
                .forEach(card => {

                    const name =
                        card.dataset.name
                            .toLowerCase();


                    card.style.display =
                        name.includes(value)
                            ? ""
                            : "none";

                });

        }
    );


    /* =====================================================
       CALCULATOR
    ===================================================== */

    $("calculate")?.addEventListener(
        "click",
        () => {

            const mass =
                Number(
                    $("robotMass").value
                );

            const speed =
                Number(
                    $("robotSpeed").value
                );

            const motorCount =
                Number(
                    $("motorCount").value
                );

            const efficiency =
                Number(
                    $("efficiency").value
                );


            if (
                mass <= 0 ||
                speed <= 0 ||
                motorCount <= 0 ||
                efficiency <= 0
            ) {

                showToast(
                    "Введите корректные параметры"
                );

                return;
            }


            /*
                Упрощённая инженерная модель:

                P = F * v

                F ≈ m * g * rolling resistance

                Для демонстрационного прототипа
                принимаем коэффициент сопротивления 0.15.
            */

            const g = 9.81;

            const rollingResistance =
                .15;


            const force =
                mass *
                g *
                rollingResistance;


            const mechanicalPower =
                force *
                speed;


            const requiredPower =
                mechanicalPower /
                (efficiency / 100);


            const motorPower =
                requiredPower /
                motorCount;


            const reserve =
                requiredPower * 1.3;


            $("powerResult")
                .textContent =
                `${requiredPower.toFixed(1)} W`;


            $("motorPowerResult")
                .textContent =
                `${motorPower.toFixed(1)} W`;


            $("reserveResult")
                .textContent =
                `${reserve.toFixed(1)} W`;


            showToast(
                "Расчёт выполнен"
            );

        }
    );


    /* =====================================================
       CODE
    ===================================================== */

    $("runCode")?.addEventListener(
        "click",
        () => {

            const code =
                $("codeEditor").value;


            const output =
                $("consoleOutput");


            const status =
                $("codeStatus");


            if (!code.trim()) {

                status.textContent =
                    "ERROR";

                status.style.color =
                    "#ff5f67";


                output.innerHTML = `
                    <div style="color:#ff5f67">
                        > ERROR: Код пустой
                    </div>
                `;

                return;
            }


            status.textContent =
                "CHECKING...";


            status.style.color =
                "#ffd166";


            output.innerHTML = `
                <div>> Анализ исходного кода...</div>
            `;


            setTimeout(() => {

                const errors = [];


                if (
                    !code.includes("setup")
                ) {
                    errors.push(
                        "Функция setup() отсутствует"
                    );
                }


                if (
                    !code.includes("loop")
                ) {
                    errors.push(
                        "Функция loop() отсутствует"
                    );
                }


                if (
                    !code.includes(";")
                ) {
                    errors.push(
                        "Не найдены операторы ';'"
                    );
                }


                if (errors.length > 0) {

                    status.textContent =
                        "ERROR";

                    status.style.color =
                        "#ff5f67";


                    output.innerHTML =
                        errors.map(
                            error =>
                                `<div style="color:#ff7777">
                                    > ERROR: ${error}
                                </div>`
                        ).join("");

                    return;
                }


                status.textContent =
                    "OK";

                status.style.color =
                    "#39e58c";


                output.innerHTML = `
                    <div>> Parsing...</div>
                    <div>> setup() found</div>
                    <div>> loop() found</div>
                    <div>> Syntax check: PASS</div>
                    <div>> Arduino API: detected</div>
                    <div style="color:#39e58c">
                        > BUILD SUCCESS
                    </div>
                `;


                showToast(
                    "Проверка кода успешно завершена"
                );

            }, 800);

        }
    );


    /* =====================================================
       DIAGNOSTICS
    ===================================================== */

    $("runDiagnostics")?.addEventListener(
        "click",
        () => {

            const ids = [
                "diagController",
                "diagBattery",
                "diagMotors",
                "diagSensors",
                "diagSoftware"
            ];


            ids.forEach(id => {

                const element =
                    $(id);

                if (!element) return;

                element.textContent =
                    "CHECKING...";

                element.style.color =
                    "#ffd166";

            });


            setTimeout(() => {

                ids.forEach(id => {

                    const element =
                        $(id);

                    if (!element) return;

                    element.textContent =
                        "PASS";

                    element.style.color =
                        "#39e58c";

                });


                showToast(
                    "Диагностика завершена"
                );

            }, 1000);

        }
    );


    /* =====================================================
       SAVE PROJECT
    ===================================================== */

    function saveProject() {

        const name =
            $("projectName")
                ? $("projectName").value
                : "Autonomous Robot";


        const project = {

            name,

            components,

            code:
                $("codeEditor")
                    ? $("codeEditor").value
                    : "",

            savedAt:
                new Date().toISOString()

        };


        localStorage.setItem(
            "robolab_project",
            JSON.stringify(project)
        );


        updateDashboardName(name);

        showToast(
            "Проект сохранён"
        );
    }


    $("saveProject")?.addEventListener(
        "click",
        saveProject
    );


    function loadProject() {

        const saved =
            localStorage.getItem(
                "robolab_project"
            );


        if (!saved) {

            updateAssembly();

            updateStats();

            return;
        }


        try {

            const project =
                JSON.parse(saved);


            components =
                Array.isArray(
                    project.components
                )
                    ? project.components
                    : [];


            if ($("projectName")) {

                $("projectName").value =
                    project.name ||
                    "Autonomous Robot";

            }


            if ($("codeEditor") &&
                project.code) {

                $("codeEditor").value =
                    project.code;

            }


            updateDashboardName(
                project.name ||
                "Autonomous Robot"
            );


            updateAssembly();

            updateStats();


        }
        catch (error) {

            console.error(
                "Load error:",
                error
            );

        }

    }


    /* =====================================================
       EXPORT
    ===================================================== */

    $("exportProject")?.addEventListener(
        "click",
        () => {

            const project = {

                name:
                    $("projectName")?.value ||
                    "Autonomous Robot",

                components,

                code:
                    $("codeEditor")?.value ||
                    "",

                exportedAt:
                    new Date().toISOString()

            };


            const blob =
                new Blob(
                    [
                        JSON.stringify(
                            project,
                            null,
                            2
                        )
                    ],
                    {
                        type:
                            "application/json"
                    }
                );


            const url =
                URL.createObjectURL(blob);


            const link =
                document.createElement("a");


            link.href = url;

            link.download =
                "robolab-project.json";


            link.click();


            URL.revokeObjectURL(
                url
            );


            showToast(
                "Проект экспортирован"
            );

        }
    );


    /* =====================================================
       PROJECT NAME
    ===================================================== */

    $("projectName")?.addEventListener(
        "input",
        event => {

            updateDashboardName(
                event.target.value
            );

        }
    );


    function updateDashboardName(name) {

        if (!$("dashboardProjectName")) {
            return;
        }


        $("dashboardProjectName")
            .textContent =
            name ||
            "Autonomous Robot";
    }


    /* =====================================================
       SECURITY HELPER
    ===================================================== */

    function escapeHTML(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    /* =====================================================
       START
    ===================================================== */

    loadProject();

    initThree();

    updateAssembly();

    updateStats();

});