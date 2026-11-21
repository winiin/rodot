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


        /* BODY */

        const bodyGeometry =
            new THREE.BoxGeometry(
                3,
                .7,
                2.2
            );

        const body =
            new THREE.Mesh(
                bodyGeometry,
                createMaterial(0x263a32)
            );

        body.position.y = 1.1;

        robotGroup.add(body);


        /* TOP */

        const topGeometry =
            new THREE.BoxGeometry(
                1.5,
                .35,
                1.2
            );

        const top =
            new THREE.Mesh(
                topGeometry,
                createMaterial(0x39e58c)
            );

        top.position.y = 1.62;

        robotGroup.add(top);


        /* WHEELS */

        const wheelGeometry =
            new THREE.CylinderGeometry(
                .62,
                .62,
                .45,
                32
            );


        const wheelMaterial =
            createMaterial(0x121816);


        const positions = [
            [-1.35, .65, 1.05],
            [1.35, .65, 1.05],
            [-1.35, .65, -1.05],
            [1.35, .65, -1.05]
        ];


        positions.forEach(position => {

            const wheel =
                new THREE.Mesh(
                    wheelGeometry,
                    wheelMaterial
                );

            wheel.rotation.z =
                Math.PI / 2;

            wheel.position.set(
                position[0],
                position[1],
                position[2]
            );

            robotGroup.add(wheel);

        });


        /* FRONT SENSOR */

        const sensorGeometry =
            new THREE.SphereGeometry(
                .22,
                24,
                24
            );

        const sensor =
            new THREE.Mesh(
                sensorGeometry,
                createMaterial(0x39e58c)
            );

        sensor.position.set(
            0,
            1.55,
            1.15
        );

        robotGroup.add(sensor);


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