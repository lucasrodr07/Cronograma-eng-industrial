const firebaseConfig = {
    apiKey: "AIzaSyBLiPTJryr3DC12q0iE_HtZ01vP1Sdy0Fk",
    authDomain: "cronograma-motherson-c4480.firebaseapp.com",
    projectId: "cronograma-motherson-c4480",
    storageBucket: "cronograma-motherson-c4480.firebasestorage.app",
    messagingSenderId: "549777934050",
    appId: "1:549777934050:web:a6ef86447b46fb9f7200bb"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.enablePersistence().catch(() => {});

let projetosGlobal = {};
let projetosDoAno = [];
let areasLocais = {};
let tarefas = [];
let subtarefasEditando = [];
let configCarregada = false;
let tarefasCarregadas = false;
let inicializacaoCompleta = false;
let isResizing = false;
let statusAtivos = { informativo: true, suporte: true, milestone: true, operacional: true };

const i18n = {
    'pt-br': {
        title: "Cronograma Engenharia Industrial", connecting: "Conectando ao banco de dados...",
        kpi1: "Ações Concluídas", kpi1desc: "Progresso global do projeto",
        kpi2: "Atrasos Críticos", kpi2desc: "Tarefas fora do prazo",
        kpi3: "Marcos de Entrega", kpi3desc: "Eventos e Milestones",
        search: "🔍 Buscar ação...", phResp: "Engenheiro / Técnico", phDesc: "Ex: Tryout Máquina 04...",
        phSub: "Nova subtarefa...", phNewProj: "Nome do projeto...", phNewSec: "Novo setor...",
        zoomDay: "Zoom Diário", zoomWeek: "Zoom Semanal", zoomMonth: "Zoom Mensal",
        btnTheme: "🌙 Tema", btnSetup: "⚙️ Setup", btnToday: "🎯 Hoje", btnAdd: "+ Ação", btnExcel: "📊 Excel", btnPrint: "🖨️ Imprimir",
        legInfo: "Informativo", legSup: "Suporte / Atenção", legMile: "Milestones Cliente",
        modalTitle: "Nova Ação", modalTitleEdit: "Editar Ação", lblProj: "Projeto", lblArea: "Área / Setor", lblStart: "Início", lblEnd: "Fim Previsto",
        lblResp: "Responsável", lblClass: "Classificação", lblDesc: "Descrição Detalhada", lblCheck: "📋 Checklist de Subtarefas",
        optInfo: "Informativo (Azul)", optSup: "Suporte / Atenção (Amarelo)", optMile: "Milestones Cliente (Laranja)",
        btnDelete: "🗑️ Excluir", btnCancel: "Cancelar (Esc)", btnSave: "Salvar Nuvem",
        setupTitle: "⚙️ Configurações do Banco", setupProj: "Projetos Ativos", setupSec: "Setores por Projeto", setupBackup: "Segurança e Backup",
        btnExport: "📥 Exportar Dados", btnImport: "📤 Importar Backup", btnClose: "Fechar (Esc)",
        printTitle: "🖨️ Imprimir Cronograma", btnGen: "Gerar",
        strAllProj: "Todos os Projetos", strAllArea: "Todas as Áreas", strAllResp: "Todos os Responsáveis", strNoSector: "Sem Setor", strNoData: "Nenhum dado.",
        ttResp: "Responsável", ttStatus: "Status", ttEvol: "Evolução", ttPer: "Período", ttCheck: "Checklist",
        thProj: "PROJETO", thSetor: "SETOR", alertPend: "Atenção: {n} item(ns) pendente(s) perto do prazo!", alertCrit: "Atenção: Prazo crítico!",
        printDetails: "Detalhamento Operacional das Ações", printAction: "Ação Técnica"
    },
    'en': {
        title: "Industrial Engineering Timeline", connecting: "Connecting to database...",
        kpi1: "Completed Actions", kpi1desc: "Overall project progress",
        kpi2: "Critical Delays", kpi2desc: "Overdue tasks",
        kpi3: "Milestones", kpi3desc: "Project events and milestones",
        search: "🔍 Search task...", phResp: "Engineer / Tech", phDesc: "E.g.: Machine 04 Tryout...",
        phSub: "New subtask...", phNewProj: "Project name...", phNewSec: "New sector...",
        zoomDay: "Daily Zoom", zoomWeek: "Weekly Zoom", zoomMonth: "Monthly Zoom",
        btnTheme: "🌙 Theme", btnSetup: "⚙️ Setup", btnToday: "🎯 Today", btnAdd: "+ Task", btnExcel: "📊 Excel", btnPrint: "🖨️ Print",
        legInfo: "Informative", legSup: "Support / Attention", legMile: "Customer Milestones",
        modalTitle: "New Task", modalTitleEdit: "Edit Task", lblProj: "Project", lblArea: "Area / Sector", lblStart: "Start Date", lblEnd: "End Date",
        lblResp: "Assignee", lblClass: "Classification", lblDesc: "Detailed Description", lblCheck: "📋 Subtask Checklist",
        optInfo: "Informative (Blue)", optSup: "Support / Attention (Yellow)", optMile: "Customer Milestones (Orange)",
        btnDelete: "🗑️ Delete", btnCancel: "Cancel (Esc)", btnSave: "Save to Cloud",
        setupTitle: "⚙️ Database Settings", setupProj: "Active Projects", setupSec: "Sectors by Project", setupBackup: "Security & Backup",
        btnExport: "📥 Export Data", btnImport: "📤 Import Backup", btnClose: "Close (Esc)",
        printTitle: "🖨️ Print Timeline", btnGen: "Generate",
        strAllProj: "All Projects", strAllArea: "All Areas", strAllResp: "All Assignees", strNoSector: "No Sector", strNoData: "No data available.",
        ttResp: "Assignee", ttStatus: "Status", ttEvol: "Progress", ttPer: "Period", ttCheck: "Checklist",
        thProj: "PROJECT", thSetor: "SECTOR", alertPend: "Warning: {n} pending item(s) near deadline!", alertCrit: "Warning: Critical deadline!",
        printDetails: "Detailed Action Report", printAction: "Technical Action"
    },
    'de': {
        title: "Zeitplan für Wirtschaftsingenieurwesen", connecting: "Verbindung zur Datenbank...",
        kpi1: "Abgeschlossene Aktionen", kpi1desc: "Gesamtprojektfortschritt",
        kpi2: "Kritische Verzögerungen", kpi2desc: "Überfällige Aufgaben",
        kpi3: "Meilensteine", kpi3desc: "Projektereignisse",
        search: "🔍 Aufgabe suchen...", phResp: "Ingenieur / Tech", phDesc: "Bsp.: Maschinen 04 Tryout...",
        phSub: "Neue Unteraufgabe...", phNewProj: "Projektname...", phNewSec: "Neuer Sektor...",
        zoomDay: "Tagesansicht", zoomWeek: "Wochenansicht", zoomMonth: "Monatsansicht",
        btnTheme: "🌙 Thema", btnSetup: "⚙️ Setup", btnToday: "🎯 Heute", btnAdd: "+ Aufgabe", btnExcel: "📊 Excel", btnPrint: "🖨️ Drucken",
        legInfo: "Informativ", legSup: "Support / Achtung", legMile: "Kundenmeilensteine",
        modalTitle: "Neue Aufgabe", modalTitleEdit: "Aufgabe bearbeiten", lblProj: "Projekt", lblArea: "Bereich / Sektor", lblStart: "Startdatum", lblEnd: "Enddatum",
        lblResp: "Zuständig", lblClass: "Klassifizierung", lblDesc: "Detaillierte Beschreibung", lblCheck: "📋 Unteraufgaben-Checkliste",
        optInfo: "Informativ (Blau)", optSup: "Support / Achtung (Gelb)", optMile: "Kundenmeilensteine (Orange)",
        btnDelete: "🗑️ Löschen", btnCancel: "Abbrechen (Esc)", btnSave: "In Cloud speichern",
        setupTitle: "⚙️ Datenbank-Einstellungen", setupProj: "Aktive Projekte", setupSec: "Sektoren nach Projekt", setupBackup: "Sicherheit & Backup",
        btnExport: "📥 Daten exportieren", btnImport: "📤 Backup importieren", btnClose: "Schließen (Esc)",
        printTitle: "🖨️ Zeitplan drucken", btnGen: "Generieren",
        strAllProj: "Alle Projekte", strAllArea: "Alle Bereiche", strAllResp: "Alle Zuständigen", strNoSector: "Kein Sektor", strNoData: "Keine Daten verfügbar.",
        ttResp: "Zuständig", ttStatus: "Status", ttEvol: "Fortschritt", ttPer: "Zeitraum", ttCheck: "Checkliste",
        thProj: "PROJEKT", thSetor: "SEKTOR", alertPend: "Achtung: {n} ausstehende(s) Element(e) kurz vor Frist!", alertCrit: "Achtung: Kritische Frist!",
        printDetails: "Detaillierter Aufgabenbericht", printAction: "Technische Aktion"
    },
    'es': {
        title: "Cronograma de Ingeniería Industrial", connecting: "Conectando a la base de datos...",
        kpi1: "Acciones Completadas", kpi1desc: "Progreso general del proyecto",
        kpi2: "Retrasos Críticos", kpi2desc: "Tareas atrasadas",
        kpi3: "Hitos (Milestones)", kpi3desc: "Eventos del proyecto",
        search: "🔍 Buscar tarea...", phResp: "Ingeniero / Técnico", phDesc: "Ej: Tryout Máquina 04...",
        phSub: "Nueva subtarea...", phNewProj: "Nombre del proyecto...", phNewSec: "Nuevo sector...",
        zoomDay: "Zoom Diario", zoomWeek: "Zoom Semanal", zoomMonth: "Zoom Mensual",
        btnTheme: "🌙 Tema", btnSetup: "⚙️ Config", btnToday: "🎯 Hoy", btnAdd: "+ Tarea", btnExcel: "📊 Excel", btnPrint: "🖨️ Imprimir",
        legInfo: "Informativo", legSup: "Soporte / Atención", legMile: "Hitos del Cliente",
        modalTitle: "Nueva Tarea", modalTitleEdit: "Editar Tarea", lblProj: "Proyecto", lblArea: "Área / Sector", lblStart: "Inicio", lblEnd: "Fin Previsto",
        lblResp: "Responsable", lblClass: "Clasificación", lblDesc: "Descripción Detallada", lblCheck: "📋 Lista de Subtareas",
        optInfo: "Informativo (Azul)", optSup: "Soporte / Atención (Amarillo)", optMile: "Hitos del Cliente (Naranja)",
        btnDelete: "🗑️ Eliminar", btnCancel: "Cancelar (Esc)", btnSave: "Guardar en Nube",
        setupTitle: "⚙️ Configuración de Base de Datos", setupProj: "Proyectos Activos", setupSec: "Sectores por Proyecto", setupBackup: "Seguridad y Respaldo",
        btnExport: "📥 Exportar Datos", btnImport: "📤 Importar Respaldo", btnClose: "Cerrar (Esc)",
        printTitle: "🖨️ Imprimir Cronograma", btnGen: "Generar",
        strAllProj: "Todos los Proyectos", strAllArea: "Todas las Áreas", strAllResp: "Todos los Responsables", strNoSector: "Sin Sector", strNoData: "Sin datos.",
        ttResp: "Responsable", ttStatus: "Estado", ttEvol: "Evolución", ttPer: "Período", ttCheck: "Checklist",
        thProj: "PROYECTO", thSetor: "SECTOR", alertPend: "Atención: ¡{n} elemento(s) pendiente(s) cerca de la fecha límite!", alertCrit: "Atención: ¡Plazo crítico!",
        printDetails: "Informe Detallado de Tareas", printAction: "Acción Técnica"
    }
};

let currentLang = 'pt-br';

function aplicarTraducoes() {
    const dict = i18n[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(dict[key]) el.innerText = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if(dict[key]) el.placeholder = dict[key];
    });
    dayjs.locale(currentLang);
}

function mudarIdioma() {
    currentLang = document.getElementById('filtro-idioma').value;
    localStorage.setItem('motherson_lang', currentLang);
    aplicarTraducoes();
    atualizarSelects();
    gerarMatriz();
}

function initLang() {
    const savedLang = localStorage.getItem('motherson_lang');
    if (savedLang && i18n[savedLang]) {
        currentLang = savedLang;
        let sel = document.getElementById('filtro-idioma');
        if(sel) sel.value = currentLang;
    }
    aplicarTraducoes();
}

function initTheme() {
    const saved = localStorage.getItem('motherson_theme');
    const isDark = saved === 'dark';
    document.body.classList.toggle('dark-theme', isDark);
    const btn = document.getElementById('btn-tema');
    if(btn) btn.innerText = isDark ? (i18n[currentLang].btnTheme.replace('🌙 ', '☀️ ')) : i18n[currentLang].btnTheme;
    setTimeout(() => gerarMatriz(), 100); 
}

function toggleTheme() {
    const isNowDark = !document.body.classList.contains('dark-theme');
    localStorage.setItem('motherson_theme', isNowDark ? 'dark' : 'light');
    initTheme();
}

function calcularCW(d) {
    let date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    let start = new Date(date.getFullYear(), 0, 1);
    let diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000;
    let dayOfYear = Math.floor(diff / 86400000) + 1;
    let startDay = start.getDay(); 
    return Math.ceil((dayOfYear + startDay) / 7);
}

function initAnoSelector() {
    const sel = document.getElementById('filtro-ano-view');
    if(sel.options.length > 0) return;
    for(let a = 2026; a <= 2035; a++) {
        let opt = document.createElement('option'); opt.value = a; opt.innerHTML = a;
        sel.appendChild(opt);
    }
    let memYear = parseInt(localStorage.getItem('motherson_filtro_ano'));
    if (!memYear || memYear < 2026) memYear = Math.max(2026, dayjs().year());
    sel.value = memYear;
}

function trocarAno() {
    localStorage.setItem('motherson_filtro_ano', document.getElementById('filtro-ano-view').value);
    atualizarProjetosDoAno();
}

db.collection("settings").doc("global").onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        projetosGlobal = data.projetosAnos || {};
        areasLocais = data.areas || {};
    }
    configCarregada = true;
    initAnoSelector();
    if(tarefasCarregadas) processarIntegridadeERenderizar();
});

db.collection("tarefas").onSnapshot((snap) => {
    tarefas = [];
    snap.forEach(doc => tarefas.push({ id: doc.id, ...doc.data() }));
    tarefasCarregadas = true;
    if(configCarregada) processarIntegridadeERenderizar();
});

function processarIntegridadeERenderizar() {
    let mudou = false;
    tarefas.forEach(t => {
        let p = t.projeto;
        if (!projetosGlobal[p]) { projetosGlobal[p] = []; mudou = true; }
        let yStart = dayjs(t.inicio).year();
        let yEnd = dayjs(t.fim).year();
        for(let y = yStart; y <= yEnd; y++) {
            if (y >= 2026 && !projetosGlobal[p].includes(y)) { projetosGlobal[p].push(y); mudou = true; }
        }
        if (t.area) {
            if (!areasLocais[p]) { areasLocais[p] = []; mudou = true; }
            if (!areasLocais[p].includes(t.area)) { areasLocais[p].push(t.area); mudou = true; }
        }
    });

    if (mudou) {
        db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais, projetos: Object.keys(projetosGlobal) }, {merge: true});
    }

    atualizarProjetosDoAno();
    if(!inicializacaoCompleta) { setTimeout(() => irParaHoje(false), 200); inicializacaoCompleta = true; }
}

function atualizarProjetosDoAno() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value) || Math.max(2026, dayjs().year());
    projetosDoAno = [];
    for (let proj in projetosGlobal) { if (projetosGlobal[proj].includes(selAno)) projetosDoAno.push(proj); }
    projetosDoAno.sort();
    atualizarSelects();
    gerarMatriz();
}

function atualizarSelects() {
    let sP = document.getElementById('i-projeto'); let vP = document.getElementById('filtro-proj-view');
    if(!sP || !vP) return;
    sP.innerHTML = ''; 
    vP.innerHTML = `<option value="ALL">${i18n[currentLang].strAllProj}</option>`;
    projetosDoAno.forEach(p => {
        sP.innerHTML += `<option value="${p}">${p}</option>`;
        vP.innerHTML += `<option value="${p}">${p}</option>`;
    });
    const s = localStorage.getItem('motherson_filtro_proj');
    if(s && projetosDoAno.includes(s)) vP.value = s; else vP.value = "ALL";
    atualizarAreasDoModalAcao(); atualizarFiltroResponsavel(); atualizarFiltroAreasGlobais(); 
}

function atualizarAreasDoModalAcao() {
    let p = document.getElementById('i-projeto').value; let sA = document.getElementById('i-area');
    if(!sA) return;
    sA.innerHTML = '';
    if(p && areasLocais[p]) { areasLocais[p].forEach(a => sA.innerHTML += `<option value="${a}">${a}</option>`); }
}

function atualizarFiltroAreasGlobais() {
    let vP = document.getElementById('filtro-proj-view').value; let vA = document.getElementById('filtro-area-view');
    if(!vA) return;
    vA.innerHTML = `<option value="ALL">${i18n[currentLang].strAllArea}</option>`;
    let u = new Set();
    if(vP === "ALL") { projetosDoAno.forEach(p => { if(areasLocais[p]) areasLocais[p].forEach(a => u.add(a)); }); } 
    else if(areasLocais[vP]) { areasLocais[vP].forEach(a => u.add(a)); }
    Array.from(u).sort().forEach(a => vA.innerHTML += `<option value="${a}">${a}</option>`);
    const s = localStorage.getItem('motherson_filtro_area');
    if(s && u.has(s)) vA.value = s;
}

function atualizarFiltroResponsavel() {
    const vR = document.getElementById('filtro-resp-view');
    if(!vR) return;
    const selAno = parseInt(document.getElementById('filtro-ano-view').value);
    vR.innerHTML = `<option value="ALL">${i18n[currentLang].strAllResp}</option>`;
    let resps = new Set();
    tarefas.forEach(t => { if(t.responsavel && (dayjs(t.inicio).year() === selAno || dayjs(t.fim).year() === selAno)) resps.add(t.responsavel); });
    Array.from(resps).sort().forEach(r => vR.innerHTML += `<option value="${r}">${r}</option>`);
    const s = localStorage.getItem('motherson_filtro_resp');
    if(s && resps.has(s)) vR.value = s;
}

function salvarFiltros() {
    localStorage.setItem('motherson_filtro_proj', document.getElementById('filtro-proj-view').value);
    localStorage.setItem('motherson_filtro_area', document.getElementById('filtro-area-view').value);
    localStorage.setItem('motherson_filtro_resp', document.getElementById('filtro-resp-view').value);
}

function toggleFiltroStatus(status) {
    statusAtivos[status] = !statusAtivos[status];
    if(status === 'informativo') statusAtivos['operacional'] = statusAtivos['informativo'];
    let el = document.getElementById('leg-' + status);
    if(statusAtivos[status]) el.classList.remove('disabled');
    else el.classList.add('disabled');
    gerarMatriz();
}

function atualizarKPIs(filtradas) {
    let pct = 0, atrasos = 0, marcos = 0;
    if(filtradas.length > 0) { 
        const sum = filtradas.reduce((a, t) => a + (t.progresso || 0), 0);
        atrasos = filtradas.filter(t => dayjs(t.fim).startOf('day').isBefore(dayjs().startOf('day')) && (t.progresso || 0) < 100).length;
        marcos = filtradas.filter(t => t.status === 'milestone').length;
        pct = Math.round(sum / filtradas.length);
    }
    document.getElementById('kpi-progresso-total').innerText = pct + "%";
    document.getElementById('kpi-atrasos').innerText = atrasos;
    document.getElementById('kpi-milestones').innerText = marcos;
    
    let donut = document.getElementById('donut-progresso');
    if(donut) donut.style.setProperty('--p', pct + '%');
    let circleAtrasos = document.getElementById('circle-atrasos');
    if (circleAtrasos) circleAtrasos.style.animation = atrasos > 0 ? "piscar 1.5s infinite" : "none";
}

function handleTaskClick(e, id) {
    if (isResizing) return; 
    abrirModalAcao(id);
}

function initResize(e, id) {
    e.stopPropagation();
    isResizing = true;
    hideTooltip();

    const taskElement = document.getElementById(`task-${id}`);
    const startX = e.clientX || e.touches[0].clientX;
    const startWidth = taskElement.offsetWidth;
    
    const t = tarefas.find(x => x.id === id);
    if (!t) return;

    const viewYear = parseInt(document.getElementById('filtro-ano-view').value);
    const dIn = dayjs(`${viewYear}-01-01`);
    const dFim = dayjs(`${viewYear}-12-31`);
    
    let cStart = dayjs.max(dayjs(t.inicio), dIn);
    let cEnd = dayjs.min(dayjs(t.fim), dFim);
    let currentDur = cEnd.diff(cStart, 'day') + 1;
    const pixelsPerDay = startWidth / currentDur;

    taskElement.style.transition = 'none';
    document.body.style.cursor = 'ew-resize';

    function doDrag(dragEvent) {
        const currentX = dragEvent.clientX || dragEvent.touches[0].clientX;
        const diffX = currentX - startX;
        let newWidth = startWidth + diffX;
        if (newWidth < pixelsPerDay) newWidth = pixelsPerDay;
        taskElement.style.width = `${newWidth}px`;
    }

    function stopDrag() {
        document.removeEventListener('mousemove', doDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', doDrag);
        document.removeEventListener('touchend', stopDrag);
        document.body.style.cursor = '';

        const finalWidth = taskElement.offsetWidth;
        const novaDuracaoDias = Math.max(1, Math.round(finalWidth / pixelsPerDay));
        let newVisualEnd = cStart.add(novaDuracaoDias - 1, 'day');
        let newEndStr = newVisualEnd.format('YYYY-MM-DD');

        taskElement.style.transition = '';

        if (t.fim !== newEndStr) {
            db.collection('tarefas').doc(id).update({ fim: newEndStr }).then(() => {
                setTimeout(() => isResizing = false, 150);
            });
        } else {
            gerarMatriz();
            setTimeout(() => isResizing = false, 150);
        }
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', doDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);
}

function allowDrop(e) { e.preventDefault(); }
function dropTask(e, p, a, d) {
    e.preventDefault();
    let id = localStorage.getItem('draggedTaskId');
    if(id) {
        let t = tarefas.find(x => x.id === id);
        if(t) {
            let dur = dayjs(t.fim).diff(dayjs(t.inicio), 'day');
            db.collection("tarefas").doc(id).update({ inicio: d, fim: dayjs(d).add(dur, 'day').format('YYYY-MM-DD'), area: a, projeto: p });
        }
    }
}
function dragStart(e, id) { 
    if(isResizing) { e.preventDefault(); return; }
    localStorage.setItem('draggedTaskId', id); 
    hideTooltip();
}

function gerarMatriz() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value);
    if(isNaN(selAno)) return;
    renderizarGantt(`${selAno}-01-01`, `${selAno}-12-31`, selAno);
}

function renderizarGantt(startStr, endStr, tituloLabel) {
    const dict = i18n[currentLang];
    const dIn = dayjs(startStr);
    const dFim = dayjs(endStr);
    const totalDiasView = dFim.diff(dIn, 'day') + 1;
    const escala = document.getElementById('filtro-escala') ? document.getElementById('filtro-escala').value : 'diario';
    const termoBusca = document.getElementById('filtro-busca') ? document.getElementById('filtro-busca').value.toLowerCase().trim() : "";
    
    const hojeReal = dayjs().format('YYYY-MM-DD');
    
    let dArr = [];
    for(let i=0; i<totalDiasView; i++) {
        let d = dIn.add(i, 'day');
        dArr.push({ ds: d.format('YYYY-MM-DD'), d: d.date(), m: d.format('MMMM'), s: d.day(), y: d.year(), daysInMonth: d.daysInMonth() });
    }
    
    const pF = document.getElementById('filtro-proj-view').value;
    const aF = document.getElementById('filtro-area-view').value;
    const rF = document.getElementById('filtro-resp-view').value;
    const projsVisiveis = pF === "ALL" ? projetosDoAno : [pF];

    let tFiltradas = tarefas.filter(x => 
        !(dayjs(x.fim).isBefore(dIn) || dayjs(x.inicio).isAfter(dFim)) &&
        (pF === "ALL" || x.projeto === pF) && 
        (aF === "ALL" || x.area === aF) && 
        (rF === "ALL" || x.responsavel === rF) &&
        (statusAtivos[x.status] !== false && (x.status !== 'operacional' || statusAtivos['informativo'] !== false))
    );
    atualizarKPIs(tFiltradas);

    const txtProj = dict.thProj;
    const txtSetor = dict.thSetor;

    let h = `<table class="zoom-${escala}"><thead>`;
    if (escala === 'mensal') {
        h += `<tr class="head-ano"><th class="col-proj"></th><th class="col-area">${tituloLabel}</th>`;
        for(let i=0; i<dArr.length; i++) {
            let span = 1; while(i+1 < dArr.length && dArr[i+1].y === dArr[i].y) { span++; i++; }
            h += `<th colspan="${span}">${dArr[i].y}</th>`;
        }
        h += `</tr><tr class="head-mes"><th class="col-proj">${txtProj}</th><th class="col-area">${txtSetor}</th>`;
        for(let i=0; i<dArr.length; i++) {
            let span = 1; while(i+1 < dArr.length && dArr[i+1].m === dArr[i].m) { span++; i++; }
            h += `<th colspan="${span}">${dArr[i].m.toUpperCase()}</th>`;
        }
        h += `</tr>`;
    } else {
        h += `<tr class="head-mes"><th class="col-proj"></th><th class="col-area">${tituloLabel}</th>`;
        for(let i=0; i<dArr.length; i++) {
            let span = 1; while(i+1 < dArr.length && dArr[i+1].m === dArr[i].m) { span++; i++; }
            h += `<th colspan="${span}">${dArr[i].m.substring(0,3).toUpperCase()}</th>`;
        }
        h += `</tr><tr class="head-cw"><th class="col-proj">${txtProj}</th><th class="col-area">${txtSetor}</th>`;
        for(let i=0; i<dArr.length; i++) {
            let dObj = new Date(dArr[i].ds + 'T12:00:00'); let cwNum = calcularCW(dObj);
            let span = 1; while(i+1 < dArr.length && calcularCW(new Date(dArr[i+1].ds + 'T12:00:00')) === cwNum) { span++; i++; }
            const isCurr = (cwNum === calcularCW(new Date()) && dArr[i].y === dayjs().year());
            h += `<th colspan="${span}" style="${isCurr ? 'background:var(--bg-current-cw); font-weight:900;' : ''}">${escala === 'semanal' ? 'CW ' : ''}${cwNum}</th>`;
        }
        h += `</tr>`;
        if (escala === 'diario') {
            h += `<tr class="head-dia"><th class="col-proj"></th><th class="col-area"></th>`;
            dArr.forEach(d => h += `<th class="${(d.s === 0 || d.s === 6) ? 'is-weekend' : ''} ${d.ds === hojeReal ? 'is-today' : ''}">${d.d}</th>`);
            h += `</tr>`;
        }
    }
    h += `</thead><tbody>`;

    if (projsVisiveis.length === 0) { h += `<tr><td colspan="10" style="padding:20px; text-align:center;">${dict.strNoData}</td></tr>`; }

    projsVisiveis.forEach(p => {
        let areas = areasLocais[p] || [];
        let exibe = aF === "ALL" ? areas : areas.filter(a => a === aF);
        
        if (exibe.length === 0) {
            h += `<tr><td class="col-proj">${p}</td><td class="col-area" style="color:#888;">${dict.strNoSector}</td><td colspan="${dArr.length}"></td></tr>`;
        } else {
            exibe.forEach(areaNome => {
                let tArea = tFiltradas.filter(x => x.projeto === p && x.area === areaNome);
                tArea.sort((a,b) => dayjs(a.inicio).diff(dayjs(b.inicio)));
                
                let camadas = [];
                tArea.forEach(t => {
                    let c = camadas.find(cam => dayjs(t.inicio).isAfter(dayjs(cam[cam.length-1].fim)));
                    if(c) c.push(t); else camadas.push([t]);
                });
                if(camadas.length === 0) camadas = [[]];

                camadas.forEach((camada, cIdx) => {
                    h += `<tr>`;
                    if(cIdx === 0) h += `<td rowspan="${camadas.length}" class="col-proj">${p}</td><td rowspan="${camadas.length}" class="col-area">${areaNome}</td>`;
                    
                    dArr.forEach(d => {
                        let task = camada.find(x => x.inicio === d.ds || (d.ds === dIn.format('YYYY-MM-DD') && dayjs(x.inicio).isBefore(dIn)));
                        let isMonthEnd = (d.d === d.daysInMonth);
                        
                        h += `<td class="${(d.s === 0 || d.s === 6) ? 'is-weekend' : ''} ${d.ds === hojeReal ? 'is-today' : ''} ${isMonthEnd ? 'month-end' : ''}" ondragover="allowDrop(event)" ondrop="dropTask(event,'${p}','${areaNome}','${d.ds}')">`;
                        
                        if(task){
                            let cStart = dayjs.max(dayjs(task.inicio), dIn);
                            let cEnd = dayjs.min(dayjs(task.fim), dFim);
                            let dur = cEnd.diff(cStart, 'day') + 1;
                            
                            let clVemDeTras = dayjs(task.inicio).isBefore(dIn) ? 'vem-de-tras' : '';
                            let clContinua = dayjs(task.fim).isAfter(dFim) ? 'continua-frente' : '';
                            
                            let matchBusca = (termoBusca === "" || task.texto.toLowerCase().includes(termoBusca) || (task.responsavel && task.responsavel.toLowerCase().includes(termoBusca)));
                            let clDimmed = !matchBusca ? 'task-dimmed' : '';
                            
                            let subInfo = "";
                            let iconeAlerta = "";
                            let diasRestantes = dayjs(task.fim).startOf('day').diff(dayjs().startOf('day'), 'day');
                            let isPendente = false;
                            let tituloAlerta = dict.alertCrit;
                            
                            if (task.subtarefas && task.subtarefas.length > 0) {
                                let qtdePendentes = task.subtarefas.filter(s => !s.feita).length;
                                if (qtdePendentes > 0) {
                                    isPendente = true;
                                    tituloAlerta = dict.alertPend.replace('{n}', qtdePendentes);
                                }
                                subInfo = ` [${task.subtarefas.length - qtdePendentes}/${task.subtarefas.length}]`;
                            } else {
                                if ((task.progresso || 0) < 100) {
                                    isPendente = true;
                                }
                            }
                            
                            if (isPendente && diasRestantes <= 3) {
                                iconeAlerta = `<span class="task-alert" title="${tituloAlerta}">⚠️</span>`;
                            }
                            
                            h += `<div class="task-wrapper ${clDimmed}" id="task-${task.id}" draggable="true" ondragstart="dragStart(event, '${task.id}')" style="width:calc(${dur*100}% + ${dur-1}px);" onclick="handleTaskClick(event, '${task.id}')" onmousemove="showTooltip(event,'${task.id}')" onmouseleave="hideTooltip()">
                                    <div class="task-bar ${task.status} ${clVemDeTras} ${clContinua}"><div class="progress-fill" style="width:${task.progresso}%"></div></div>
                                    <div class="task-label">${iconeAlerta}${task.texto}${subInfo}</div>
                                    <div class="resize-handle" onmousedown="initResize(event, '${task.id}')" ontouchstart="initResize(event, '${task.id}')"></div>
                                  </div>`;
                        }
                        h += `</td>`;
                    });
                    h += `</tr>`;
                });
            });
        }
        h += `<tr><td colspan="${dArr.length+2}" style="height:4px; background:rgba(0,0,0,0.05); border:none;"></td></tr>`;
    });
    h += `</tbody></table>`;
    document.getElementById('gantt-container').innerHTML = h;
    let elHeader = document.getElementById('data-header');
    if(elHeader) elHeader.innerText = `${dict.title} - ${tituloLabel} | 🟢 Online`;
}

function irParaHoje(forceChangeYear = false) {
    const anoH = dayjs().year();
    const sel = document.getElementById('filtro-ano-view');
    if(parseInt(sel.value) !== anoH) {
        if(forceChangeYear) {
            sel.value = Math.max(2026, anoH); trocarAno();
            setTimeout(() => irParaHoje(false), 300);
        }
        return;
    }
    const t = document.querySelector('.is-today');
    if (t) document.getElementById('gantt-container').scrollTo({ left: t.offsetLeft - 250, behavior: 'smooth' });
}

function showTooltip(e, id) {
    const dict = i18n[currentLang];
    let t = tarefas.find(x => x.id === id);
    if(!t || window.innerWidth < 600) return;
    let el = document.getElementById('custom-tooltip');
    
    let htmlSub = "";
    if(t.subtarefas && t.subtarefas.length > 0) {
        htmlSub = `<div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.2); padding-top:6px;"><strong>${dict.ttCheck}:</strong><br>`;
        t.subtarefas.forEach(s => { htmlSub += `<span style="${s.feita ? 'color:#888; text-decoration:line-through;' : ''}">${s.feita ? '✅' : '⬜'} ${s.texto}</span><br>`; });
        htmlSub += `</div>`;
    }

    let statusT = (t.status === 'informativo' || t.status === 'operacional') ? dict.legInfo : t.status === 'suporte' ? dict.legSup : dict.legMile;
    el.innerHTML = `<strong>${t.texto}</strong><br>${dict.ttResp}: ${t.responsavel || '-'}<br>${dict.ttStatus}: ${statusT}<br>${dict.ttEvol}: ${t.progresso}%<br>${dict.ttPer}: ${dayjs(t.inicio).format('DD/MM/YY')} a ${dayjs(t.fim).format('DD/MM/YY')}${htmlSub}`;
    el.style.display = 'block'; el.style.left = (e.clientX + 15) + 'px'; el.style.top = (e.clientY + 15) + 'px';
}

function hideTooltip() { document.getElementById('custom-tooltip').style.display = 'none'; }

function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); subtarefasEditando = []; }

function renderizarSubtarefasModal() {
    let html = "";
    subtarefasEditando.forEach((s, idx) => {
        html += `
        <div class="subtask-item">
            <input type="checkbox" ${s.feita ? 'checked' : ''} onchange="toggleSubtarefa(${idx})">
            <span class="${s.feita ? 'subtask-done' : ''}">${s.texto}</span>
            <button class="btn-del-tiny" onclick="removerSubtarefa(${idx})">×</button>
        </div>`;
    });
    document.getElementById('lista-subtarefas-modal').innerHTML = html;
    if(subtarefasEditando.length > 0) {
        let feitas = subtarefasEditando.filter(s => s.feita).length;
        document.getElementById('i-progresso').value = Math.round((feitas / subtarefasEditando.length) * 100);
    }
}

function adicionarSubtarefa() {
    let txt = document.getElementById('nova-subtarefa-txt').value.trim();
    if(txt) { subtarefasEditando.push({ texto: txt, feita: false }); document.getElementById('nova-subtarefa-txt').value = ""; renderizarSubtarefasModal(); }
}

function toggleSubtarefa(idx) { subtarefasEditando[idx].feita = !subtarefasEditando[idx].feita; renderizarSubtarefasModal(); }
function removerSubtarefa(idx) { subtarefasEditando.splice(idx, 1); renderizarSubtarefasModal(); }

function abrirModalAcao(id = null) {
    const dict = i18n[currentLang];
    const t = id ? tarefas.find(x => x.id === id) : null;
    document.getElementById('modal-titulo').innerText = t ? dict.modalTitleEdit : dict.modalTitle;
    document.getElementById('i-id').value = t ? t.id : '';
    if(t) {
        document.getElementById('i-projeto').value = t.projeto; atualizarAreasDoModalAcao();
        document.getElementById('i-area').value = t.area; document.getElementById('i-inicio').value = t.inicio;
        document.getElementById('i-fim').value = t.fim; document.getElementById('i-progresso').value = t.progresso;
        document.getElementById('i-status').value = (t.status === 'operacional') ? 'informativo' : t.status;
        document.getElementById('i-texto').value = t.texto; document.getElementById('i-responsavel').value = t.responsavel || '';
        subtarefasEditando = t.subtarefas ? JSON.parse(JSON.stringify(t.subtarefas)) : [];
        document.getElementById('btn-excluir').style.display = 'block';
    } else {
        document.getElementById('i-inicio').value = dayjs().format('YYYY-MM-DD'); document.getElementById('i-fim').value = dayjs().format('YYYY-MM-DD');
        document.getElementById('i-progresso').value = 0; document.getElementById('i-texto').value = '';
        subtarefasEditando = []; document.getElementById('btn-excluir').style.display = 'none'; atualizarAreasDoModalAcao();
    }
    renderizarSubtarefasModal(); document.getElementById('modal-acao').style.display = 'flex';
}

function salvarTarefa() {
    const p = document.getElementById('i-projeto').value, a = document.getElementById('i-area').value, s = document.getElementById('i-inicio').value, f = document.getElementById('i-fim').value;
    if(!p || !a || dayjs(f).isBefore(dayjs(s))) return;
    const id = document.getElementById('i-id').value;
    const obj = { projeto: p, area: a, inicio: s, fim: f, progresso: parseInt(document.getElementById('i-progresso').value) || 0, status: document.getElementById('i-status').value, texto: document.getElementById('i-texto').value, responsavel: document.getElementById('i-responsavel').value, subtarefas: subtarefasEditando };
    if(id) { db.collection("tarefas").doc(id).update(obj); } else { db.collection("tarefas").doc('T'+Date.now()).set(obj); }
    fecharModais();
}

function apagarTarefaAtual() { if(confirm("Confirmar?")) { db.collection("tarefas").doc(document.getElementById('i-id').value).delete(); fecharModais(); } }

function renderizarListasConfig() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value) || Math.max(2026, dayjs().year());
    document.getElementById('setup-title').innerText = `${i18n[currentLang].setupTitle} (${selAno})`;
    let hP = ''; projetosDoAno.forEach((p) => { hP += `<div class="item-row"><span>${p}</span><button class="btn-mini" onclick="removerP('${p}')">X</button></div>`; });
    document.getElementById('lista-projetos-config').innerHTML = hP || `<div style="padding:10px; color:#888; font-size:12px;">${i18n[currentLang].strNoData}</div>`;
    let hA = ''; projetosDoAno.forEach(p => { if(areasLocais[p]) { areasLocais[p].forEach((a, i) => { hA += `<div class="item-row"><span>[${p}] ${a}</span><button class="btn-mini" onclick="removerA('${p}',${i})">X</button></div>`; }); } });
    document.getElementById('lista-areas-config').innerHTML = hA || `<div style="padding:10px; color:#888; font-size:12px;">${i18n[currentLang].strNoData}</div>`;
    let s = document.getElementById('cfg-area-proj'); s.innerHTML = ''; projetosDoAno.forEach(p => s.innerHTML += `<option value="${p}">${p}</option>`);
}

function abrirModalConfig() { renderizarListasConfig(); document.getElementById('modal-config').style.display = 'flex'; }

function adicionarProjetoConfig() {
    const n = document.getElementById('cfg-novo-proj').value.toUpperCase().trim();
    const startVal = document.getElementById('cfg-proj-inicio').value, endVal = document.getElementById('cfg-proj-fim').value;
    if(!n || !startVal || !endVal) return;
    const startYear = parseInt(startVal.split('-')[0]), endYear = parseInt(endVal.split('-')[0]);
    if (endYear < startYear) return;
    if(!projetosGlobal[n]) projetosGlobal[n] = [];
    for(let y = startYear; y <= endYear; y++) { if(!projetosGlobal[n].includes(y)) projetosGlobal[n].push(y); }
    if(!areasLocais[n]) areasLocais[n] = [];
    db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais, projetos: Object.keys(projetosGlobal) }, {merge: true}).then(() => {
        atualizarProjetosDoAno(); if(document.getElementById('modal-config').style.display === 'flex') renderizarListasConfig();
    });
    document.getElementById('cfg-novo-proj').value = ''; document.getElementById('cfg-proj-inicio').value = ''; document.getElementById('cfg-proj-fim').value = '';
}

function removerP(n) {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value) || Math.max(2026, dayjs().year());
    if(confirm(`Remover ${n}?`)) {
        projetosGlobal[n] = projetosGlobal[n].filter(y => y !== selAno);
        db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais, projetos: Object.keys(projetosGlobal) }, {merge: true}).then(() => {
            atualizarProjetosDoAno(); if(document.getElementById('modal-config').style.display === 'flex') renderizarListasConfig();
        });
    }
}

function adicionarAreaConfig() {
    const p = document.getElementById('cfg-area-proj').value, n = document.getElementById('cfg-nova-area').value.trim();
    if(p && n) {
        if(!areasLocais[p]) areasLocais[p] = [];
        if(!areasLocais[p].includes(n)) { areasLocais[p].push(n); areasLocais[p].sort(); }
        db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais }, {merge:true}).then(() => {
            atualizarProjetosDoAno(); if(document.getElementById('modal-config').style.display === 'flex') renderizarListasConfig();
        });
        document.getElementById('cfg-nova-area').value = '';
    }
}

function removerA(p, i) {
    areasLocais[p].splice(i, 1);
    db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais }, {merge:true}).then(() => {
        atualizarProjetosDoAno(); if(document.getElementById('modal-config').style.display === 'flex') renderizarListasConfig();
    });
}

function exportarExcel() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value);
    const dIn = dayjs(`${selAno}-01-01`), dFim = dayjs(`${selAno}-12-31`);
    let tAno = tarefas.filter(x => !(dayjs(x.fim).isBefore(dIn) || dayjs(x.inicio).isAfter(dFim)));
    if(tAno.length === 0) return;
    let c = "\uFEFFID;Projeto;Setor;Ação;Início;Fim;%;Status;Responsável\n";
    tAno.forEach(t => { c += `${t.id};${t.projeto};${t.area};${(t.texto||'').replace(/;/g, ",")};${dayjs(t.inicio).format('DD/MM/YYYY')};${dayjs(t.fim).format('DD/MM/YYYY')};${t.progresso};${t.status};${t.responsavel||''}\n`; });
    let a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv;charset=utf-8;' })); a.download = `Cronograma_Motherson_${selAno}.csv`; a.click();
}

async function exportarBackup() {
    try {
        const docSet = await db.collection("settings").doc("global").get();
        const settings = docSet.exists ? docSet.data() : {};
        const snapTar = await db.collection("tarefas").get();
        const tarefasArr = [];
        snapTar.forEach(doc => tarefasArr.push({ id: doc.id, ...doc.data() }));
        const backup = { settings, tarefas: tarefasArr, timestamp: new Date().toISOString() };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
        const a = document.createElement('a'); a.href = dataStr; a.download = `backup_motherson_${dayjs().format('YYYYMMDD_HHmm')}.json`; a.click();
    } catch (err) {}
}

function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            if (!backup.settings || !backup.tarefas) throw new Error("Erro");
            if (!confirm("Confirmar?")) { document.getElementById('import-file').value = ''; return; }
            await db.collection("settings").doc("global").set(backup.settings);
            const tarefasSnap = await db.collection("tarefas").get();
            const deletePromises = [];
            tarefasSnap.forEach(doc => deletePromises.push(db.collection("tarefas").doc(doc.id).delete()));
            await Promise.all(deletePromises);
            const insertPromises = [];
            backup.tarefas.forEach(t => { const id = t.id; const data = { ...t }; delete data.id; insertPromises.push(db.collection("tarefas").doc(id).set(data)); });
            await Promise.all(insertPromises);
            document.getElementById('import-file').value = ''; fecharModais();
        } catch (err) { document.getElementById('import-file').value = ''; }
    };
    reader.readAsText(file);
}

function abrirModalPrint() {
    const selAno = document.getElementById('filtro-ano-view').value;
    document.getElementById('print-inicio').value = `${selAno}-01-01`;
    document.getElementById('print-fim').value = `${selAno}-12-31`;
    document.getElementById('modal-print').style.display = 'flex';
}

function executarImpressao() {
    const pIn = document.getElementById('print-inicio').value, pFim = document.getElementById('print-fim').value;
    if (!pIn || !pFim || dayjs(pFim).isBefore(dayjs(pIn))) return;
    fecharModais(); 
    const escalaAtual = document.getElementById('filtro-escala') ? document.getElementById('filtro-escala').value : 'diario';
    gerarRelatorioImpressao(pIn, pFim, escalaAtual);
    const originalTitle = document.title;
    document.title = `Cronograma_Motherson_${dayjs(pIn).format('DD-MM-YY')}_a_${dayjs(pFim).format('DD-MM-YY')}`;
    setTimeout(() => { window.print(); document.title = originalTitle; gerarMatriz(); }, 600);
}

function gerarRelatorioImpressao(startStr, endStr, escala) {
    const dict = i18n[currentLang];
    const dIn = dayjs(startStr), dFim = dayjs(endStr);
    const totalDiasView = dFim.diff(dIn, 'day') + 1;
    let dArr = [];
    for(let i=0; i<totalDiasView; i++) {
        let d = dIn.add(i, 'day');
        dArr.push({ ds: d.format('YYYY-MM-DD'), d: d.date(), m: d.format('MMMM'), s: d.day(), y: d.year(), daysInMonth: d.daysInMonth() });
    }
    
    const pF = document.getElementById('filtro-proj-view').value, aF = document.getElementById('filtro-area-view').value, rF = document.getElementById('filtro-resp-view').value;
    const projsVisiveis = pF === "ALL" ? projetosDoAno : [pF];
    const termoBusca = document.getElementById('filtro-busca') ? document.getElementById('filtro-busca').value.toLowerCase().trim() : "";
    let tFiltradas = tarefas.filter(x => 
        !(dayjs(x.fim).isBefore(dIn) || dayjs(x.inicio).isAfter(dFim)) && 
        (pF === "ALL" || x.projeto === pF) && 
        (aF === "ALL" || x.area === aF) && 
        (rF === "ALL" || x.responsavel === rF) &&
        (statusAtivos[x.status] !== false && (x.status !== 'operacional' || statusAtivos['informativo'] !== false))
    );

    let h = `<table class="zoom-${escala}"><thead>`;
    if (escala === 'mensal') {
        h += `<tr class="head-ano"><th class="col-proj"></th><th class="col-area"></th>`;
        for(let i=0; i<dArr.length; i++) {
            let span = 1; while(i+1 < dArr.length && dArr[i+1].y === dArr[i].y) { span++; i++; }
            h += `<th colspan="${span}">${dArr[i].y}</th>`;
        }
        h += `</tr><tr class="head-mes"><th class="col-proj">${dict.thProj}</th><th class="col-area">${dict.thSetor}</th>`;
        for(let i=0; i<dArr.length; i++) {
            let span = 1; while(i+1 < dArr.length && dArr[i+1].m === dArr[i].m) { span++; i++; }
            h += `<th colspan="${span}">${dArr[i].m.toUpperCase()}</th>`;
        }
        h += `</tr>`;
    } 
    else {
        h += `<tr class="head-mes"><th class="col-proj"></th><th class="col-area"></th>`;
        for(let i=0; i<dArr.length; i++) {
            let span = 1; while(i+1 < dArr.length && dArr[i+1].m === dArr[i].m) { span++; i++; }
            h += `<th colspan="${span}">${dArr[i].m.substring(0,3).toUpperCase()}</th>`;
        }
        h += `</tr><tr class="head-cw"><th class="col-proj">${dict.thProj}</th><th class="col-area">${dict.thSetor}</th>`;
        for(let i=0; i<dArr.length; i++) {
            let dObj = new Date(dArr[i].ds + 'T12:00:00'); let cwNum = calcularCW(dObj);
            let span = 1; while(i+1 < dArr.length && calcularCW(new Date(dArr[i+1].ds + 'T12:00:00')) === cwNum) { span++; i++; }
            const isCurr = (cwNum === calcularCW(new Date()) && dArr[i].y === dayjs().year());
            h += `<th colspan="${span}" style="${isCurr ? 'background:rgba(218, 33, 40, 0.15); font-weight:900;' : ''}">${escala === 'semanal' ? 'CW ' : ''}${cwNum}</th>`;
        }
        h += `</tr>`;
        if (escala === 'diario') {
            const hojeReal = dayjs().format('YYYY-MM-DD');
            h += `<tr class="head-dia"><th class="col-proj"></th><th class="col-area"></th>`;
            dArr.forEach(d => h += `<th class="${(d.s === 0 || d.s === 6) ? 'is-weekend' : ''} ${d.ds === hojeReal ? 'is-today' : ''}">${d.d}</th>`);
            h += `</tr>`;
        }
    }
    h += `</thead><tbody>`;

    if (projsVisiveis.length === 0) { h += `<tr><td colspan="10" style="padding:20px; text-align:center;">${dict.strNoData}</td></tr>`; }

    projsVisiveis.forEach(p => {
        let areas = areasLocais[p] || [];
        let exibe = aF === "ALL" ? areas : areas.filter(a => a === aF);
        if (exibe.length === 0) { h += `<tr><td class="col-proj">${p}</td><td class="col-area" style="color:#888;">${dict.strNoSector}</td><td colspan="${dArr.length}"></td></tr>`; } 
        else {
            exibe.forEach(areaNome => {
                let tArea = tFiltradas.filter(x => x.projeto === p && x.area === areaNome);
                tArea.sort((a,b) => dayjs(a.inicio).diff(dayjs(b.inicio)));
                let camadas = [];
                tArea.forEach(t => { let c = camadas.find(cam => dayjs(t.inicio).isAfter(dayjs(cam[cam.length-1].fim))); if(c) c.push(t); else camadas.push([t]); });
                if(camadas.length === 0) camadas = [[]];

                camadas.forEach((camada, cIdx) => {
                    h += `<tr>`;
                    if(cIdx === 0) h += `<td rowspan="${camadas.length}" class="col-proj">${p}</td><td rowspan="${camadas.length}" class="col-area">${areaNome}</td>`;
                    
                    dArr.forEach(d => {
                        let task = camada.find(x => x.inicio === d.ds || (d.ds === dIn.format('YYYY-MM-DD') && dayjs(x.inicio).isBefore(dIn)));
                        let isMonthEnd = (d.d === d.daysInMonth);
                        const hojeReal = dayjs().format('YYYY-MM-DD');
                        
                        h += `<td class="${(d.s === 0 || d.s === 6) ? 'is-weekend' : ''} ${d.ds === hojeReal ? 'is-today' : ''} ${isMonthEnd ? 'month-end' : ''}">`;
                        
                        if(task){
                            let cStart = dayjs.max(dayjs(task.inicio), dIn);
                            let cEnd = dayjs.min(dayjs(task.fim), dFim);
                            let dur = cEnd.diff(cStart, 'day') + 1;
                            let clVemDeTras = dayjs(task.inicio).isBefore(dIn) ? 'vem-de-tras' : '';
                            let clContinua = dayjs(task.fim).isAfter(dFim) ? 'continua-frente' : '';
                            let matchBusca = (termoBusca === "" || task.texto.toLowerCase().includes(termoBusca) || (task.responsavel && task.responsavel.toLowerCase().includes(termoBusca)));
                            let clDimmed = !matchBusca ? 'task-dimmed' : '';
                            
                            let subInfo = "";
                            let iconeAlerta = "";
                            let diasRestantes = dayjs(task.fim).startOf('day').diff(dayjs().startOf('day'), 'day');
                            let isPendente = false;
                            
                            if (task.subtarefas && task.subtarefas.length > 0) {
                                let qtdePendentes = task.subtarefas.filter(s => !s.feita).length;
                                if (qtdePendentes > 0) isPendente = true;
                                subInfo = ` [${task.subtarefas.length - qtdePendentes}/${task.subtarefas.length}]`;
                            } else {
                                if ((task.progresso || 0) < 100) isPendente = true;
                            }
                            
                            if (isPendente && diasRestantes <= 3) {
                                iconeAlerta = `<span class="task-alert">⚠️</span>`;
                            }
                            
                            h += `<div class="task-wrapper ${clDimmed}" style="width:calc(${dur*100}% + ${dur-1}px);">
                                    <div class="task-bar ${task.status} ${clVemDeTras} ${clContinua}"><div class="progress-fill" style="width:${task.progresso}%"></div></div>
                                    <div class="task-label">${iconeAlerta}${task.texto}${subInfo}</div>
                                  </div>`;
                        }
                        h += `</td>`;
                    });
                    h += `</tr>`;
                });
            });
        }
    });
    h += `</tbody></table>`;

    let sortedTasks = [...tFiltradas].sort((a,b) => dayjs(a.inicio).diff(dayjs(b.inicio)));
    
    let hTable = `<div style="page-break-before: always; margin-top: 30px; width: 100%; font-family: 'Graphik', Arial, sans-serif;">
        <h3 style="color: var(--motherson-red); border-bottom: 2px solid var(--motherson-red); padding-bottom: 5px; margin-bottom: 15px; font-size: 16px;">${dict.printDetails}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 2px solid #333;">
            <thead>
                <tr style="background: #f4f4f4; border-bottom: 2px solid #333; text-align: left;">
                    <th style="padding: 6px; border: 1px solid #d4d4d4; text-align: center;">${dict.ttStatus}</th>
                    <th style="padding: 6px; border: 1px solid #d4d4d4;">${dict.printAction}</th>
                    <th style="padding: 6px; border: 1px solid #d4d4d4;">${dict.lblProj} / ${dict.lblArea}</th>
                    <th style="padding: 6px; border: 1px solid #d4d4d4;">${dict.ttPer}</th>
                    <th style="padding: 6px; border: 1px solid #d4d4d4;">${dict.lblResp}</th>
                    <th style="padding: 6px; border: 1px solid #d4d4d4; text-align: center;">%</th>
                </tr>
            </thead>
            <tbody>`;

    if (sortedTasks.length === 0) {
        hTable += `<tr><td colspan="6" style="padding: 10px; text-align: center;">${dict.strNoData}</td></tr>`;
    } else {
        sortedTasks.forEach(t => {
            let statusColor = t.status === 'milestone' ? '#fd7e14' : (t.status === 'suporte' ? '#FFFF00' : '#A9CCE3');
            let statLabel = t.status === 'milestone' ? dict.legMile : (t.status === 'suporte' ? dict.legSup : dict.legInfo);
            
            hTable += `<tr style="border-bottom: 1px solid #888; page-break-inside: avoid;">
                <td style="padding: 6px; border: 1px solid #d4d4d4; text-align: center;">
                    <div style="width: 12px; height: 12px; background: ${statusColor}; border-radius: 3px; margin: 0 auto; border: 1px solid #333;" title="${statLabel}"></div>
                </td>
                <td style="padding: 6px; border: 1px solid #d4d4d4; font-weight: bold;">${t.texto}</td>
                <td style="padding: 6px; border: 1px solid #d4d4d4;">${t.projeto} - ${t.area}</td>
                <td style="padding: 6px; border: 1px solid #d4d4d4;">${dayjs(t.inicio).format('DD/MM/YY')} - ${dayjs(t.fim).format('DD/MM/YY')}</td>
                <td style="padding: 6px; border: 1px solid #d4d4d4;">${t.responsavel || '-'}</td>
                <td style="padding: 6px; border: 1px solid #d4d4d4; text-align: center; font-weight: bold;">${t.progresso}%</td>
            </tr>`;
        });
    }
    hTable += `</tbody></table></div>`;

    document.getElementById('print-layout').innerHTML = `
        <div class="print-header">
            <div class="ph-left"><img src="logo.png" alt="Motherson"></div>
            <div class="ph-center">
                <h2>${dict.title.toUpperCase()}</h2>
                <p>${dict.ttPer}: ${dayjs(dIn).format('DD/MM/YYYY')} - ${dayjs(dFim).format('DD/MM/YYYY')}</p>
            </div>
            <div class="ph-right">
                <p><strong>Emissão:</strong> ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
                <p><strong>${dict.lblProj}:</strong> ${pF === "ALL" ? dict.strAllProj : pF}</p>
                <p><strong>${dict.lblArea}:</strong> ${aF === "ALL" ? dict.strAllArea : aF} | <strong>${dict.lblResp}:</strong> ${rF === "ALL" ? dict.strAllResp : rF}</p>
            </div>
        </div>
        <div class="print-table-container">${h}</div>
        ${hTable}
        <div class="print-footer" style="margin-top: 15px;"><span>Motherson Group - Documento Interno de Gestão</span><span>Proud to be part of.</span></div>
    `;
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModais(); });
document.querySelectorAll('.modal-overlay').forEach(overlay => { overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) fecharModais(); }); });

initLang();
initTheme();