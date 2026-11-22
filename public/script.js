// Token JWT guardado na aba (sessionStorage), enviado no header Authorization.
let authToken = sessionStorage.getItem("pingcom_token");

const $ = (id) => document.getElementById(id);

function saveSession(response) {
    if (!response || typeof response.token !== "string") throw new Error("Resposta de login inválida.");
    authToken = response.token;
    sessionStorage.setItem("pingcom_token", authToken);
    const { token, ...user } = response;
    return user;
}

function clearToken() {
    authToken = null;
    sessionStorage.removeItem("pingcom_token");
}

async function api(path, options = {}) {
    let response;
    try {
        response = await fetch(path, {
            credentials: "same-origin",
            cache: "no-store",
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(authToken && { Authorization: `Bearer ${authToken}` }),
                ...options.headers
            }
        });
    } catch {
        throw new Error("Não foi possível conectar ao servidor. Execute `npm run dev` na pasta do projeto e abra http://localhost:3000.");
    }

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        // Sessão inválida: limpa o token e volta para a tela de login
        if (response.status === 401 && !path.endsWith("/auth/login")) {
            clearToken();
            if (!path.endsWith("/auth/session")) {
                $("auth-message").textContent = "Sua sessão expirou. Entre novamente.";
                $("account-logged-out").hidden = false;
                $("account-logged-in").hidden = true;
            }
        }
        throw new Error(body.error || `Erro do servidor (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
}

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
    error: "Erro de monitoramento",
    pending: "Aguardando ping"
};

const viewTitles = {
    dashboard: "Dashboard",
    devices: "Dispositivos",
    problems: "Problemas",
    history: "Histórico",
    deviceDetail: "Detalhes do dispositivo"
};

// Funções de formatação: nunca mostram undefined/NaN
const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const formatDate = (value) => {
    if (!value) return "Ainda não verificado";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
};

const formatLatency = (value) => {
    const number = toNumber(value);
    return number === null ? "—" : `${number.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ms`;
};

const formatLoss = (value) => {
    const number = toNumber(value);
    return number === null || number < 0 || number > 100
        ? "—"
        : `${number.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
};

// Aceita camelCase (padrão do back-end) e snake_case (registros antigos)
function normalizeCheck(check) {
    if (!check) return null;
    const latencyMs = toNumber(check.latencyMs ?? check.latency_ms);
    let status = check.status;
    if (!["online", "high_latency", "offline", "error"].includes(status)) status = "pending";
    // Sem medição de latência não dá para afirmar latência elevada
    if (status === "high_latency" && latencyMs === null) status = "pending";
    return {
        ...check,
        deviceName: check.deviceName ?? check.device_name ?? "Dispositivo",
        checkedAt: check.checkedAt ?? check.checked_at ?? null,
        packetLossPercent: toNumber(check.packetLossPercent ?? check.packet_loss_percent),
        latencyMs,
        status
    };
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function showMessage(target, message, isError = false) {
    target.textContent = message;
    target.classList.toggle("is-error", isError);
    target.classList.toggle("is-success", Boolean(message) && !isError);
}

function statusBadge(status) {
    const key = statusLabels[status] ? status : "pending";
    return el("span", `status-badge status-${key}`, statusLabels[key]);
}

function deviceDescription(device) {
    const check = normalizeCheck(device.lastCheck);
    if (!check) return "Aguardando primeira verificação.";
    if (check.status === "offline") return "Sem resposta aos pacotes ICMP.";
    if (check.status === "error") return check.message || "Não foi possível executar o ping.";
    const loss = check.packetLossPercent > 0 ? ` · perda ${formatLoss(check.packetLossPercent)}` : "";
    return `${formatLatency(check.latencyMs)}${loss} · ${formatDate(check.checkedAt)}`;
}

function createDeviceCard(device) {
    const card = el("button", "device-card");
    card.type = "button";
    card.dataset.deviceId = device.id;

    const top = el("span", "device-card-top");
    top.append(
        el("strong", "device-card-name", device.name),
        statusBadge(normalizeCheck(device.lastCheck)?.status)
    );
    card.append(
        top,
        el("span", "device-card-address", device.ip),
        el("span", "device-card-type", deviceTypeLabels[device.type] || "Outro"),
        el("span", "device-card-detail", deviceDescription(device))
    );
    return card;
}

function problemDescription(check) {
    const when = formatDate(check.checkedAt);
    if (check.status === "offline") {
        return `Não responde ao ping · perda ${formatLoss(check.packetLossPercent)} · ${when}`;
    }
    if (check.status === "high_latency") {
        return `Latência elevada: ${formatLatency(check.latencyMs)} · ${when}`;
    }
    return `${check.message || "Erro ao executar o comando ping."} · ${when}`;
}

function createProblemItem(device) {
    const check = normalizeCheck(device.lastCheck);
    const symbols = { offline: "!", high_latency: "↗" };

    const content = el("span", "problem-content");
    content.append(
        el("strong", "problem-name", device.name),
        el("span", "problem-description", problemDescription(check))
    );
    const open = el("button", "problem-open", "Detalhes →");
    open.type = "button";
    open.dataset.deviceId = device.id;

    const item = el("li", "problem-item");
    item.append(el("span", `problem-icon status-${check.status}`, symbols[check.status] || "⚠"), content, open);
    return item;
}

// Preenche uma lista e mostra/esconde a mensagem de "vazio"
function fillList(listId, emptyId, items, createItem) {
    $(listId).replaceChildren(...items.map(createItem));
    $(emptyId).hidden = items.length > 0;
}

function renderDashboard({ summary, devices, problems }) {
    $("online-count").textContent = summary.online;
    $("offline-count").textContent = summary.offline;
    $("latency-count").textContent = summary.highLatency;
    $("dashboard-last-check").textContent = formatDate(summary.lastCheckAt);
    $("device-count").textContent = `${devices.length} ${devices.length === 1 ? "dispositivo" : "dispositivos"}`;

    fillList("dashboard-devices", "dashboard-devices-empty", devices.slice(0, 6), createDeviceCard);
    fillList("device-list", "devices-empty", devices, createDeviceCard);
    fillList("dashboard-problems", "dashboard-problems-empty", problems, createProblemItem);
    fillList("problems-list", "problems-empty", problems, createProblemItem);
}

// No detalhe do dispositivo a tabela tem 4 colunas; no histórico geral, 6.
function renderHistory(checks, rowsId, emptyId) {
    const isDetail = rowsId === "detail-history-rows";
    const rows = checks.map(normalizeCheck).filter(Boolean).map((check) => {
        const values = [
            formatDate(check.checkedAt),
            formatLatency(check.latencyMs),
            formatLoss(check.packetLossPercent)
        ];
        if (!isDetail) values.unshift(check.deviceName, check.ip || "—");

        const row = el("tr");
        values.forEach((value, index) => row.append(el("td", !isDetail && index === 0 ? "history-device" : "", value)));
        const statusCell = el("td");
        statusCell.append(statusBadge(check.status));
        row.append(statusCell);
        return row;
    });

    $(rowsId).replaceChildren(...rows);
    $(emptyId).hidden = checks.length > 0;
    return checks.length;
}

function svgElement(svg, tag, attributes, text) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    if (text !== undefined) node.textContent = text;
    svg.append(node);
    return node;
}

function renderLatencyChart(checks) {
    const svg = $("latency-chart");
    svg.replaceChildren();

    const points = checks
        .map(normalizeCheck)
        .filter((check) => check && check.checkedAt && check.latencyMs !== null && check.latencyMs >= 0)
        .slice(0, 20)
        .reverse();

    $("latency-chart-wrap").hidden = points.length === 0;
    $("chart-empty").hidden = points.length > 0;
    if (!points.length) return;

    const width = 640, height = 220;
    const left = 42, right = 16, top = 18, bottom = 36;
    const max = Math.max(100, ...points.map((point) => point.latencyMs));
    const x = (index) => points.length === 1
        ? (left + width - right) / 2
        : left + (index * (width - left - right)) / (points.length - 1);
    const y = (value) => height - bottom - (value / max) * (height - top - bottom);

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");

    // Linha de referência em 100 ms e eixo base
    svgElement(svg, "line", { x1: left, y1: y(100), x2: width - right, y2: y(100), class: "chart-threshold" });
    svgElement(svg, "text", { x: left, y: y(100) - 6, class: "chart-label" }, "100 ms");
    svgElement(svg, "line", { x1: left, y1: height - bottom, x2: width - right, y2: height - bottom, class: "chart-axis" });

    svgElement(svg, "polyline", {
        points: points.map((point, index) => `${x(index)},${y(point.latencyMs)}`).join(" "),
        class: "chart-line"
    });

    points.forEach((point, index) => {
        const circle = svgElement(svg, "circle", {
            cx: x(index),
            cy: y(point.latencyMs),
            r: 4,
            class: point.latencyMs >= 100 ? "chart-point chart-point-high" : "chart-point"
        });
        svgElement(circle, "title", {}, `${formatDate(point.checkedAt)} — ${formatLatency(point.latencyMs)}`);
    });

    svgElement(svg, "text", { x: left, y: height - 8, class: "chart-label" }, "Mais antigo");
    svgElement(svg, "text", { x: width - right, y: height - 8, "text-anchor": "end", class: "chart-label" }, "Mais recente");
}

document.addEventListener("DOMContentLoaded", () => {
    const authMessage = $("auth-message");
    const loginForm = $("login-form");
    const registerForm = $("register-form");
    const deviceForm = $("device-form");
    const deviceFormMessage = $("device-form-message");
    const detailMessage = $("detail-message");
    const views = {
        dashboard: $("dashboard-view"),
        devices: $("devices-view"),
        problems: $("problems-view"),
        history: $("history-view"),
        deviceDetail: $("device-detail-view")
    };

    let currentUser = null;
    let currentView = "dashboard";
    let selectedDeviceId = null;
    let isRegistering = false;

    async function loadDashboard() {
        if (!currentUser) return;
        try {
            renderDashboard(await api("/api/dashboard"));
        } catch (error) {
            showMessage(authMessage, error.message, true);
        }
    }

    async function loadHistory() {
        if (!currentUser) return;
        try {
            const count = renderHistory(await api("/api/history"), "history-rows", "history-empty");
            $("history-count").textContent = `${count} ${count === 1 ? "registro" : "registros"}`;
        } catch (error) {
            showMessage(authMessage, error.message, true);
        }
    }

    async function loadDeviceDetail(deviceId) {
        if (!currentUser) return;
        try {
            const id = encodeURIComponent(deviceId);
            const [device, checks] = await Promise.all([
                api(`/api/devices/${id}`),
                api(`/api/history?deviceId=${id}`)
            ]);
            selectedDeviceId = device.id;
            const check = normalizeCheck(device.lastCheck);

            $("detail-name").textContent = device.name;
            $("detail-ip").textContent = device.ip;
            $("detail-type").textContent = deviceTypeLabels[device.type] || "Outro";
            $("detail-status").replaceChildren(statusBadge(check?.status));
            $("detail-latency").textContent = formatLatency(check?.latencyMs);
            $("detail-loss").textContent = formatLoss(check?.packetLossPercent);
            $("detail-last-check").textContent = formatDate(check?.checkedAt);
            showMessage(detailMessage, check?.status === "error" ? check.message : "");

            renderHistory(checks.slice(0, 50), "detail-history-rows", "detail-history-empty");
            renderLatencyChart(checks);
        } catch (error) {
            showMessage(detailMessage, error.message, true);
        }
    }

    function showView(name) {
        currentView = name;
        Object.entries(views).forEach(([viewName, view]) => { view.hidden = viewName !== name; });
        document.querySelectorAll(".nav-button").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.view === name);
        });
        $("page-title").textContent = viewTitles[name];
    }

    async function switchView(name) {
        showView(name);
        if (!currentUser) {
            showMessage(authMessage, "Entre na sua conta para acessar o monitoramento.", true);
            return;
        }
        if (name === "history") await loadHistory();
        else if (name === "deviceDetail" && selectedDeviceId) await loadDeviceDetail(selectedDeviceId);
        else await loadDashboard();
    }

    function renderAccount() {
        $("account-logged-out").hidden = Boolean(currentUser);
        $("account-logged-in").hidden = !currentUser;

        if (currentUser) {
            $("account-name").textContent = currentUser.name;
            $("account-email").textContent = currentUser.email;
            void loadDashboard();
            return;
        }
        // Sem usuário: volta ao dashboard vazio
        showView("dashboard");
        renderDashboard({
            summary: { online: 0, offline: 0, highLatency: 0, lastCheckAt: null },
            devices: [],
            problems: []
        });
    }

    async function authenticate(path, form, successMessage) {
        const formData = new FormData(form);
        try {
            currentUser = saveSession(await api(path, {
                method: "POST",
                body: JSON.stringify(Object.fromEntries(formData))
            }));
            form.reset();
            showMessage(authMessage, successMessage);
            renderAccount();
        } catch (error) {
            showMessage(authMessage, error.message, true);
        }
    }

    // ---- Eventos ----

    document.querySelectorAll("[data-view]").forEach((button) => {
        button.addEventListener("click", () => void switchView(button.dataset.view));
    });

    // Cards de dispositivo e botões "Detalhes" abrem a tela de detalhe
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-device-id]");
        if (!button) return;
        selectedDeviceId = button.dataset.deviceId;
        void switchView("deviceDetail");
    });

    $("auth-toggle").addEventListener("click", () => {
        isRegistering = !isRegistering;
        loginForm.hidden = isRegistering;
        registerForm.hidden = !isRegistering;
        $("auth-toggle").textContent = isRegistering ? "Já tenho uma conta" : "Criar uma conta";
        showMessage(authMessage, "");
    });

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void authenticate("/api/auth/login", loginForm, "Login realizado.");
    });

    registerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void authenticate("/api/auth/register", registerForm, "Conta criada e login realizado.");
    });

    $("logout-button").addEventListener("click", async () => {
        try {
            await api("/api/auth/logout", { method: "POST", body: "{}" });
            clearToken();
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
        const { name, ip, type } = Object.fromEntries(new FormData(deviceForm));
        try {
            await api("/api/devices", { method: "POST", body: JSON.stringify({ name, ip, type }) });
            deviceForm.reset();
            showMessage(deviceFormMessage, "Dispositivo cadastrado. A primeira verificação foi registrada.");
            await loadDashboard();
        } catch (error) {
            showMessage(deviceFormMessage, error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    $("back-to-devices").addEventListener("click", () => void switchView("devices"));

    $("check-now-button").addEventListener("click", async (event) => {
        if (!selectedDeviceId) return;
        const button = event.currentTarget;
        button.disabled = true;
        showMessage(detailMessage, "Executando ping…");
        try {
            await api(`/api/devices/${encodeURIComponent(selectedDeviceId)}/check`, { method: "POST", body: "{}" });
            await Promise.all([loadDeviceDetail(selectedDeviceId), loadDashboard()]);
            showMessage(detailMessage, "Verificação registrada.");
        } catch (error) {
            showMessage(detailMessage, error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    $("edit-device-button").addEventListener("click", async () => {
        if (!selectedDeviceId) return;
        const url = `/api/devices/${encodeURIComponent(selectedDeviceId)}`;
        try {
            const current = await api(url);
            const name = prompt("Nome do dispositivo:", current.name);
            if (name === null) return;
            const ip = prompt("Endereço IPv4 privado:", current.ip);
            if (ip === null) return;
            const type = prompt("Tipo (computador, servidor, roteador, switch, outro):", current.type);
            if (type === null) return;
            await api(url, { method: "PUT", body: JSON.stringify({ name, ip, type }) });
            await loadDeviceDetail(selectedDeviceId);
            showMessage(detailMessage, "Dispositivo atualizado.");
        } catch (error) {
            showMessage(detailMessage, error.message, true);
        }
    });

    $("delete-device-button").addEventListener("click", async () => {
        if (!selectedDeviceId || !confirm("Excluir este dispositivo? O histórico já registrado será preservado.")) return;
        try {
            await api(`/api/devices/${encodeURIComponent(selectedDeviceId)}`, { method: "DELETE" });
            selectedDeviceId = null;
            await switchView("devices");
        } catch (error) {
            showMessage(detailMessage, error.message, true);
        }
    });

    // ---- Inicialização ----

    (authToken ? api("/api/auth/session") : Promise.resolve(null))
        .then((user) => {
            currentUser = user;
            renderAccount();
        })
        .catch((error) => {
            clearToken();
            currentUser = null;
            renderAccount();
            showMessage(authMessage, error.message, true);
        });

    // Atualiza a tela atual a cada 15 s (pausa com a aba em segundo plano)
    setInterval(() => {
        if (!currentUser || document.hidden) return;
        void loadDashboard();
        if (currentView === "history") void loadHistory();
        if (currentView === "deviceDetail" && selectedDeviceId) void loadDeviceDetail(selectedDeviceId);
    }, 15_000);
});