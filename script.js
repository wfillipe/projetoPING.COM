const api = async (path, options = {}) => {
    let response;
    try {
        response = await fetch(path, {
            credentials: "same-origin",
            cache: "no-store",
            ...options,
            headers: {
                ...(options.body instanceof Uint8Array ? {} : { "Content-Type": "application/json" }),
                ...options.headers
            }
        });
    } catch {
        throw new Error("Não foi possível conectar ao servidor. Execute `npm start` na pasta do projeto e abra http://localhost:3000.");
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Erro do servidor (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
};

const deviceTypeLabels = {
    computador: "Computador",
    servidor: "Servidor",
    roteador: "Roteador",
    switch: "Switch",
    outro: "Outro"
};

const statusLabels = {
    online: "Online",
    high_latency: "Latência elevada",
    offline: "Offline",
    error: "Erro de monitoramento"
};

const formatDate = (value) => value
    ? new Date(value).toLocaleString("pt-BR")
    : "Ainda não verificado";

const formatLatency = (value) => value === null || value === undefined
    ? "—"
    : `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ms`;

document.addEventListener("DOMContentLoaded", () => {
    const authMessage = document.getElementById("auth-message");
    const accountLoggedOut = document.getElementById("account-logged-out");
    const accountLoggedIn = document.getElementById("account-logged-in");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const authToggle = document.getElementById("auth-toggle");
    const deviceForm = document.getElementById("device-form");
    const deviceFormMessage = document.getElementById("device-form-message");
    const viewElements = {
        dashboard: document.getElementById("dashboard-view"),
        devices: document.getElementById("devices-view"),
        problems: document.getElementById("problems-view"),
        history: document.getElementById("history-view"),
        deviceDetail: document.getElementById("device-detail-view")
    };

    let currentUser = null;
    let isRegistering = false;
    let currentView = "dashboard";
    let selectedDeviceId = null;

    function showMessage(element, message, isError = false) {
        element.textContent = message;
        element.classList.toggle("is-error", isError);
        element.classList.toggle("is-success", Boolean(message) && !isError);
    }

    function element(tagName, className, text) {
        const node = document.createElement(tagName);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function statusBadge(status) {
        return element("span", `status-badge status-${status || "pending"}`, statusLabels[status] || "Aguardando ping");
    }

    function deviceDescription(device) {
        const check = device.lastCheck;
        if (!check) return "Aguardando primeira verificação.";
        if (check.status === "offline") return "Sem resposta aos pacotes ICMP.";
        if (check.status === "error") return check.message || "Não foi possível executar o ping.";
        const loss = check.packetLossPercent > 0 ? ` · perda ${check.packetLossPercent}%` : "";
        return `${formatLatency(check.latencyMs)}${loss} · ${formatDate(check.checkedAt)}`;
    }

    function createDeviceCard(device) {
        const card = element("button", "device-card");
        card.type = "button";
        card.dataset.deviceId = device.id;
        const top = element("span", "device-card-top");
        const title = element("strong", "device-card-name", device.name);
        top.append(title, statusBadge(device.lastCheck?.status));
        const address = element("span", "device-card-address", device.ip);
        const kind = element("span", "device-card-type", deviceTypeLabels[device.type] || "Outro");
        const detail = element("span", "device-card-detail", deviceDescription(device));
        card.append(top, address, kind, detail);
        return card;
    }

    function createProblemItem(device) {
        const check = device.lastCheck;
        const item = element("li", "problem-item");
        const icon = element("span", `problem-icon status-${check.status}`, check.status === "offline" ? "!" : check.status === "high_latency" ? "↗" : "⚠");
        const content = element("span", "problem-content");
        const name = element("strong", "problem-name", device.name);
        const description = check.status === "offline"
            ? `Não responde ao ping · perda ${check.packetLossPercent}% · ${formatDate(check.checkedAt)}`
            : check.status === "high_latency"
                ? `Latência elevada: ${formatLatency(check.latencyMs)} · ${formatDate(check.checkedAt)}`
                : `${check.message || "Erro ao executar o comando ping."} · ${formatDate(check.checkedAt)}`;
        content.append(name, element("span", "problem-description", description));
        const open = element("button", "problem-open", "Detalhes →");
        open.type = "button";
        open.dataset.deviceId = device.id;
        item.append(icon, content, open);
        return item;
    }

    function renderDeviceCards(devices, targetId, emptyId) {
        const target = document.getElementById(targetId);
        target.replaceChildren(...devices.map(createDeviceCard));
        document.getElementById(emptyId).hidden = devices.length > 0;
    }

    function renderProblems(problems, listId, emptyId) {
        const target = document.getElementById(listId);
        target.replaceChildren(...problems.map(createProblemItem));
        document.getElementById(emptyId).hidden = problems.length > 0;
    }

    function renderDashboard(data) {
        const { summary, devices, problems } = data;
        document.getElementById("online-count").textContent = summary.online;
        document.getElementById("offline-count").textContent = summary.offline;
        document.getElementById("latency-count").textContent = summary.highLatency;
        document.getElementById("dashboard-last-check").textContent = formatDate(summary.lastCheckAt);
        renderDeviceCards(devices.slice(0, 6), "dashboard-devices", "dashboard-devices-empty");
        renderDeviceCards(devices, "device-list", "devices-empty");
        renderProblems(problems, "dashboard-problems", "dashboard-problems-empty");
        renderProblems(problems, "problems-list", "problems-empty");
        document.getElementById("device-count").textContent =
            `${devices.length} ${devices.length === 1 ? "dispositivo" : "dispositivos"}`;
    }

    function renderHistory(checks, rowsId, emptyId) {
        const rows = document.getElementById(rowsId);
        rows.replaceChildren();
        checks.forEach((check) => {
            const row = document.createElement("tr");
            const values = [
                check.deviceName,
                check.ip,
                formatDate(check.checkedAt),
                formatLatency(check.latencyMs),
                check.packetLossPercent === null ? "—" : `${check.packetLossPercent}%`
            ];
            values.forEach((value, index) => {
                const cell = element("td", index === 0 ? "history-device" : "", value);
                row.append(cell);
            });
            const statusCell = element("td");
            statusCell.append(statusBadge(check.status));
            row.append(statusCell);
            rows.append(row);
        });
        document.getElementById(emptyId).hidden = checks.length > 0;
        return checks.length;
    }

    async function loadDashboard() {
        if (!currentUser) return;
        try {
            const data = await api("/api/dashboard");
            renderDashboard(data);
        } catch (error) {
            showMessage(authMessage, error.message, true);
        }
    }

    async function loadHistory() {
        if (!currentUser) return;
        try {
            const checks = await api("/api/history");
            const count = renderHistory(checks, "history-rows", "history-empty");
            document.getElementById("history-count").textContent =
                `${count} ${count === 1 ? "registro" : "registros"}`;
        } catch (error) {
            showMessage(authMessage, error.message, true);
        }
    }

    function addSvgElement(svg, tagName, attributes, text) {
        const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
        Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
        if (text !== undefined) node.textContent = text;
        svg.append(node);
        return node;
    }

    function renderLatencyChart(checks) {
        const svg = document.getElementById("latency-chart");
        svg.replaceChildren();
        const points = checks
            .filter((check) => Number.isFinite(check.latencyMs))
            .slice(0, 20)
            .reverse();
        const hasPoints = points.length > 0;
        document.getElementById("latency-chart-wrap").hidden = !hasPoints;
        document.getElementById("chart-empty").hidden = hasPoints;
        if (!hasPoints) return;

        const width = 640;
        const height = 220;
        const left = 42;
        const right = 16;
        const top = 18;
        const bottom = 36;
        const max = Math.max(100, ...points.map((point) => point.latencyMs));
        const x = (index) => points.length === 1
            ? (left + width - right) / 2
            : left + (index * (width - left - right)) / (points.length - 1);
        const y = (value) => height - bottom - (value / max) * (height - top - bottom);

        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("preserveAspectRatio", "none");
        addSvgElement(svg, "line", { x1: left, y1: y(100), x2: width - right, y2: y(100), class: "chart-threshold" });
        addSvgElement(svg, "text", { x: left, y: y(100) - 6, class: "chart-label" }, "100 ms");
        addSvgElement(svg, "line", { x1: left, y1: height - bottom, x2: width - right, y2: height - bottom, class: "chart-axis" });
        const polylinePoints = points.map((point, index) => `${x(index)},${y(point.latencyMs)}`).join(" ");
        addSvgElement(svg, "polyline", { points: polylinePoints, class: "chart-line" });
        points.forEach((point, index) => {
            const circle = addSvgElement(svg, "circle", {
                cx: x(index),
                cy: y(point.latencyMs),
                r: 4,
                class: point.latencyMs >= 100 ? "chart-point chart-point-high" : "chart-point"
            });
            circle.append(
                document.createElementNS("http://www.w3.org/2000/svg", "title")
            );
            circle.lastChild.textContent = `${formatDate(point.checkedAt)} — ${formatLatency(point.latencyMs)}`;
        });
        addSvgElement(svg, "text", { x: left, y: height - 8, class: "chart-label" }, "Mais antigo");
        addSvgElement(svg, "text", { x: width - right, y: height - 8, "text-anchor": "end", class: "chart-label" }, "Mais recente");
    }

    async function loadDeviceDetail(deviceId) {
        if (!currentUser) return;
        try {
            const [device, checks] = await Promise.all([
                api(`/api/devices/${encodeURIComponent(deviceId)}`),
                api(`/api/history?deviceId=${encodeURIComponent(deviceId)}`)
            ]);
            selectedDeviceId = device.id;
            document.getElementById("detail-name").textContent = device.name;
            document.getElementById("detail-ip").textContent = device.ip;
            document.getElementById("detail-type").textContent = deviceTypeLabels[device.type] || "Outro";
            const check = device.lastCheck;
            const statusTarget = document.getElementById("detail-status");
            statusTarget.replaceChildren(statusBadge(check?.status));
            document.getElementById("detail-latency").textContent = formatLatency(check?.latencyMs);
            document.getElementById("detail-loss").textContent = check?.packetLossPercent === null || check?.packetLossPercent === undefined
                ? "—"
                : `${check.packetLossPercent}%`;
            document.getElementById("detail-last-check").textContent = formatDate(check?.checkedAt);
            showMessage(
                document.getElementById("detail-message"),
                check?.status === "error" ? check.message : ""
            );
            const count = renderHistory(checks.slice(0, 50), "detail-history-rows", "detail-history-empty");
            renderLatencyChart(checks);
            if (!count) document.getElementById("detail-history-empty").hidden = false;
        } catch (error) {
            showMessage(document.getElementById("detail-message"), error.message, true);
        }
    }

    async function switchView(name) {
        currentView = name;
        Object.entries(viewElements).forEach(([viewName, view]) => {
            view.hidden = viewName !== name;
        });
        document.querySelectorAll(".nav-button").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.view === name);
        });
        const titles = {
            dashboard: "Dashboard",
            devices: "Dispositivos",
            problems: "Problemas",
            history: "Histórico",
            deviceDetail: "Detalhes do dispositivo"
        };
        document.getElementById("page-title").textContent = titles[name];
        if (!currentUser) {
            showMessage(authMessage, "Entre na sua conta para acessar o monitoramento.", true);
            return;
        }
        if (name === "history") await loadHistory();
        else if (name === "deviceDetail" && selectedDeviceId) await loadDeviceDetail(selectedDeviceId);
        else await loadDashboard();
    }

    async function openDevice(deviceId) {
        selectedDeviceId = deviceId;
        await switchView("deviceDetail");
    }

    function renderAccount() {
        accountLoggedOut.hidden = Boolean(currentUser);
        accountLoggedIn.hidden = !currentUser;
        if (currentUser) {
            document.getElementById("account-name").textContent = currentUser.name;
            document.getElementById("account-email").textContent = currentUser.email;
            void loadDashboard();
        } else {
            currentView = "dashboard";
            Object.entries(viewElements).forEach(([viewName, view]) => {
                view.hidden = viewName !== "dashboard";
            });
            document.querySelectorAll(".nav-button").forEach((button) => {
                button.classList.toggle("is-active", button.dataset.view === "dashboard");
            });
            document.getElementById("page-title").textContent = "Dashboard";
            document.getElementById("online-count").textContent = "0";
            document.getElementById("offline-count").textContent = "0";
            document.getElementById("latency-count").textContent = "0";
            document.getElementById("dashboard-last-check").textContent = "Aguardando dados";
            renderDashboard({
                summary: { online: 0, offline: 0, highLatency: 0, lastCheckAt: null },
                devices: [],
                problems: []
            });
        }
    }

    document.querySelectorAll(".nav-button, [data-view]").forEach((button) => {
        button.addEventListener("click", () => {
            if (button.dataset.view) void switchView(button.dataset.view);
        });
    });

    authToggle.addEventListener("click", () => {
        isRegistering = !isRegistering;
        loginForm.hidden = isRegistering;
        registerForm.hidden = !isRegistering;
        authToggle.textContent = isRegistering ? "Já tenho uma conta" : "Criar uma conta";
        showMessage(authMessage, "");
    });

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        try {
            currentUser = await api("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: formData.get("email"),
                    password: formData.get("password")
                })
            });
            loginForm.reset();
            showMessage(authMessage, "Login realizado.");
            renderAccount();
        } catch (error) {
            showMessage(authMessage, error.message, true);
        }
    });

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(registerForm);
        try {
            currentUser = await api("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    name: formData.get("name"),
                    email: formData.get("email"),
                    password: formData.get("password")
                })
            });
            registerForm.reset();
            showMessage(authMessage, "Conta criada e login realizado.");
            renderAccount();
        } catch (error) {
            showMessage(authMessage, error.message, true);
        }
    });

    document.getElementById("logout-button").addEventListener("click", async () => {
        try {
            await api("/api/auth/logout", { method: "POST", body: "{}" });
            currentUser = null;
            selectedDeviceId = null;
            showMessage(authMessage, "Você saiu da conta.");
            renderAccount();
        } catch (error) {
            showMessage(authMessage, error.message, true);
        }
    });

    deviceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentUser) {
            showMessage(deviceFormMessage, "Entre na sua conta para cadastrar dispositivos.", true);
            return;
        }
        const button = deviceForm.querySelector("button[type=submit]");
        button.disabled = true;
        showMessage(deviceFormMessage, "Cadastrando e executando o primeiro ping…");
        const formData = new FormData(deviceForm);
        try {
            await api("/api/devices", {
                method: "POST",
                body: JSON.stringify({
                    name: formData.get("name"),
                    ip: formData.get("ip"),
                    type: formData.get("type")
                })
            });
            deviceForm.reset();
            showMessage(deviceFormMessage, "Dispositivo cadastrado. A primeira verificação foi registrada.");
            await loadDashboard();
        } catch (error) {
            showMessage(deviceFormMessage, error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    document.addEventListener("click", (event) => {
        const deviceButton = event.target.closest("[data-device-id]");
        if (!deviceButton) return;
        void openDevice(deviceButton.dataset.deviceId);
    });

    document.getElementById("back-to-devices").addEventListener("click", () => {
        void switchView("devices");
    });

    document.getElementById("check-now-button").addEventListener("click", async (event) => {
        if (!selectedDeviceId) return;
        const button = event.currentTarget;
        button.disabled = true;
        showMessage(document.getElementById("detail-message"), "Executando ping…");
        try {
            await api(`/api/devices/${encodeURIComponent(selectedDeviceId)}/check`, {
                method: "POST",
                body: "{}"
            });
            await Promise.all([loadDeviceDetail(selectedDeviceId), loadDashboard()]);
            showMessage(document.getElementById("detail-message"), "Verificação registrada.");
        } catch (error) {
            showMessage(document.getElementById("detail-message"), error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById("delete-device-button").addEventListener("click", async () => {
        if (!selectedDeviceId || !confirm("Excluir este dispositivo? O histórico já registrado será preservado.")) return;
        try {
            await api(`/api/devices/${encodeURIComponent(selectedDeviceId)}`, { method: "DELETE" });
            selectedDeviceId = null;
            await switchView("devices");
        } catch (error) {
            showMessage(document.getElementById("detail-message"), error.message, true);
        }
    });

    api("/api/auth/session")
        .then((user) => {
            currentUser = user;
            renderAccount();
        })
        .catch((error) => showMessage(authMessage, error.message, true));

    setInterval(() => {
        if (!currentUser) return;
        void loadDashboard();
        if (currentView === "history") void loadHistory();
        if (currentView === "deviceDetail" && selectedDeviceId) void loadDeviceDetail(selectedDeviceId);
    }, 15_000);
});
