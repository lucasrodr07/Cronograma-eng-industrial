const iconSun = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const iconMoon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

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
let currentContextId = null;
let buscaTimeout;

const teamMembers = [
    "Christian Conceição",
    "Gabriel Rocha",
    "Gerson Kalinoski",
    "Herick Schilipack",
    "João Quadros",
    "João Silva",
    "Lucas Hofmann",
    "Lucas Rodrigues",
    "Marco Bonatelli",
    "Sanderson William"
];

function san(s) {
    return s ? s.replace(/[&<>"'/]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;'}[m])) : '';
}

function showToast(message, type = 'error') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { if(container.contains(toast)) container.removeChild(toast); }, 3000);
}

function triggerSync() {
    const el = document.getElementById('sync-icon');
    if(el) {
        el.innerText = '✅';
        setTimeout(() => el.innerText = '🟢', 1500);
    }
}

function debounceBusca() {
    clearTimeout(buscaTimeout);
    buscaTimeout = setTimeout(() => gerarMatriz(), 300);
}

function animateValue(id, start, end, duration, isPercent = false) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4); 
        const currentVal = Math.floor(easeProgress * (end - start) + start);
        obj.innerText = currentVal + (isPercent ? "%" : "");
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerText = end + (isPercent ? "%" : "");
    };
    window.requestAnimationFrame(step);
}

const i18n = {
    'pt-br': {
        title: "Cronograma Engenharia Industrial", connecting: "Conectando ao banco de dados...",
        syncTitle: "Sincronização em tempo real", baseYear: "Ano Base:",
        kpi1: "Ações Concluídas", kpi1desc: "Progresso global",
        kpi2: "Atrasos Críticos", kpi2desc: "Fora do prazo",
        kpi3: "Marcos de Entrega", kpi3desc: "Milestones",
        search: "Buscar ação...", phResp: "Engenheiro / Técnico", phDesc: "Ex: Tryout Máquina 04...",
        phSub: "Nova subtarefa...", phNewProj: "Nome do projeto...", phNewSec: "Novo setor...",
        zoomDay: "Zoom Diário", zoomWeek: "Zoom Semanal", zoomMonth: "Zoom Mensal",
        btnTheme: "Tema", btnSetup: "Setup", btnToday: "Hoje", btnAdd: "Adicionar Ação", btnExcel: "Excel", btnPrint: "Imprimir",
        btnHeatmap: "Equipe", heatmapTitle: "Mapa de Carga da Equipe",
        hmDesc: "Cores indicam o volume de tarefas simultâneas: 1 a 2 (Verde), 3 a 4 (Amarelo), 5 ou mais (Vermelho/Sobrecarga).",
        hmTeam: "Membro da Equipe",
        legInfo: "Informativo", legSup: "Suporte / Atenção", legMile: "Milestones Cliente",
        modalTitle: "Nova Ação", modalTitleEdit: "Editar Ação", lblProj: "Projeto", lblArea: "Área / Setor", lblStart: "Início", lblEnd: "Fim Previsto",
        lblResp: "Responsável (Múltiplo ou Texto Livre)", lblClass: "Classificação", lblDesc: "Descrição Detalhada", lblCheck: "Checklist de Subtarefas",
        optInfo: "Informativo (Azul)", optSup: "Suporte / Atenção (Amarelo)", optMile: "Milestones Cliente (Laranja)",
        btnDelete: "Excluir", btnCancel: "Cancelar (Esc)", btnSave: "Salvar Nuvem",
        setupTitle: "Configurações do Banco", setupProj: "Projetos Ativos", setupSec: "Setores por Projeto", setupBackup: "Segurança e Backup",
        btnExport: "Exportar Dados", btnImport: "Importar Backup", btnClose: "Fechar (Esc)",
        printTitle: "Imprimir Cronograma", btnGen: "Gerar", printIncGantt: "Incluir Gráfico de Gantt visual",
        strAllProj: "Todos Projetos", strAllArea: "Todas Áreas", strAllResp: "Todos Responsáveis", strNoSector: "Sem Setor", strNoData: "Nenhuma ação encontrada.",
        ttResp: "Responsável", ttStatus: "Status", ttEvol: "Evolução", ttPer: "Período", ttCheck: "Checklist",
        thProj: "PROJETO", thSetor: "SETOR", alertPend: "Atenção: {n} item(ns) pendente(s) perto do prazo!", alertCrit: "Atenção: Prazo crítico!",
        printDetails: "Detalhamento Operacional das Ações", printAction: "Ação Técnica",
        msgDateErr: "A data de fim não pode ser anterior à data de início!", msgEmpty: "Por favor, preencha todos os campos obrigatórios.",
        msgNoDesc: "A descrição da ação é obrigatória!",
        cmComplete: "Concluir (100%)", cmAtt: "Marcar Atenção", cmNorm: "Status Normal", cmDel: "Excluir Ação"
    },
    'en': {
        title: "Industrial Engineering Timeline", connecting: "Connecting to database...",
        syncTitle: "Real-time sync", baseYear: "Base Year:",
        kpi1: "Completed Actions", kpi1desc: "Overall progress",
        kpi2: "Critical Delays", kpi2desc: "Overdue tasks",
        kpi3: "Milestones", kpi3desc: "Milestones",
        search: "Search task...", phResp: "Engineer / Tech", phDesc: "E.g.: Machine 04 Tryout...",
        phSub: "New subtask...", phNewProj: "Project name...", phNewSec: "New sector...",
        zoomDay: "Daily Zoom", zoomWeek: "Weekly Zoom", zoomMonth: "Monthly Zoom",
        btnTheme: "Theme", btnSetup: "Setup", btnToday: "Today", btnAdd: "Add Task", btnExcel: "Excel", btnPrint: "Print",
        btnHeatmap: "Team", heatmapTitle: "Team Workload Heatmap",
        hmDesc: "Colors indicate simultaneous tasks: 1-2 (Green), 3-4 (Yellow), 5+ (Red/Overload).",
        hmTeam: "Team Member",
        legInfo: "Informative", legSup: "Support / Attention", legMile: "Customer Milestones",
        modalTitle: "New Task", modalTitleEdit: "Edit Task", lblProj: "Project", lblArea: "Area / Sector", lblStart: "Start Date", lblEnd: "End Date",
        lblResp: "Assignee (Multiple or Free Text)", lblClass: "Classification", lblDesc: "Detailed Description", lblCheck: "Subtask Checklist",
        optInfo: "Informative (Blue)", optSup: "Support / Attention (Yellow)", optMile: "Customer Milestones (Orange)",
        btnDelete: "Delete", btnCancel: "Cancel (Esc)", btnSave: "Save to Cloud",
        setupTitle: "Database Settings", setupProj: "Active Projects", setupSec: "Sectors by Project", setupBackup: "Security & Backup",
        btnExport: "Export Data", btnImport: "Import Backup", btnClose: "Close (Esc)",
        printTitle: "Print Timeline", btnGen: "Generate", printIncGantt: "Include visual Gantt Chart",
        strAllProj: "All Projects", strAllArea: "All Areas", strAllResp: "All Assignees", strNoSector: "No Sector", strNoData: "No actions found.",
        ttResp: "Assignee", ttStatus: "Status", ttEvol: "Progress", ttPer: "Period", ttCheck: "Checklist",
        thProj: "PROJECT", thSetor: "SECTOR", alertPend: "Warning: {n} pending item(s) near deadline!", alertCrit: "Warning: Critical deadline!",
        printDetails: "Detailed Action Report", printAction: "Technical Action",
        msgDateErr: "End date cannot be before start date!", msgEmpty: "Please fill in all required fields.",
        msgNoDesc: "Task description is required!",
        cmComplete: "Complete (100%)", cmAtt: "Mark Attention", cmNorm: "Normal Status", cmDel: "Delete Task"
    },
    'de': {
        title: "Zeitplan für Wirtschaftsingenieurwesen", connecting: "Verbindung zur Datenbank...",
        syncTitle: "Echtzeit-Synchronisation", baseYear: "Basisjahr:",
        kpi1: "Abgeschlossene Aktionen", kpi1desc: "Gesamtfortschritt",
        kpi2: "Kritische Verzögerungen", kpi2desc: "Überfällige Aufgaben",
        kpi3: "Meilensteine", kpi3desc: "Meilensteine",
        search: "Aufgabe suchen...", phResp: "Ingenieur / Tech", phDesc: "Bsp.: Maschinen 04 Tryout...",
        phSub: "Neue Unteraufgabe...", phNewProj: "Projektname...", phNewSec: "Neuer Sektor...",
        zoomDay: "Tagesansicht", zoomWeek: "Wochenansicht", zoomMonth: "Monatsansicht",
        btnTheme: "Thema", btnSetup: "Setup", btnToday: "Heute", btnAdd: "Aufgabe", btnExcel: "Excel", btnPrint: "Drucken",
        btnHeatmap: "Team", heatmapTitle: "Team-Auslastungs-Heatmap",
        hmDesc: "Farben zeigen gleichzeitige Aufgaben an: 1-2 (Grün), 3-4 (Gelb), 5+ (Rot/Überlastung).",
        hmTeam: "Teammitglied",
        legInfo: "Informativ", legSup: "Support / Achtung", legMile: "Kundenmeilensteine",
        modalTitle: "Neue Aufgabe", modalTitleEdit: "Aufgabe bearbeiten", lblProj: "Projekt", lblArea: "Bereich / Sektor", lblStart: "Startdatum", lblEnd: "Enddatum",
        lblResp: "Zuständig (Mehrere o. Freitext)", lblClass: "Klassifizierung", lblDesc: "Detaillierte Beschreibung", lblCheck: "Unteraufgaben-Checkliste",
        optInfo: "Informativ (Blau)", optSup: "Support / Achtung (Gelb)", optMile: "Kundenmeilensteine (Orange)",
        btnDelete: "Löschen", btnCancel: "Abbrechen (Esc)", btnSave: "In Cloud speichern",
        setupTitle: "Datenbank-Einstellungen", setupProj: "Aktive Projekte", setupSec: "Sektoren nach Projekt", setupBackup: "Sicherheit & Backup",
        btnExport: "Daten exportieren", btnImport: "Backup importieren", btnClose: "Schließen (Esc)",
        printTitle: "Zeitplan drucken", btnGen: "Generieren", printIncGantt: "Visuelles Gantt-Diagramm einfügen",
        strAllProj: "Alle Projekte", strAllArea: "Alle Bereiche", strAllResp: "Alle Zuständigen", strNoSector: "Kein Sektor", strNoData: "Keine Daten verfügbar.",
        ttResp: "Zuständig", ttStatus: "Status", ttEvol: "Fortschritt", ttPer: "Zeitraum", ttCheck: "Checkliste",
        thProj: "PROJEKT", thSetor: "SEKTOR", alertPend: "Achtung: {n} ausstehende(s) Element(e) kurz vor Frist!", alertCrit: "Achtung: Kritische Frist!",
        printDetails: "Detaillierter Aufgabenbericht", printAction: "Technische Aktion",
        msgDateErr: "Enddatum darf nicht vor Startdatum liegen!", msgEmpty: "Bitte füllen Sie alle Pflichtfelder aus.",
        msgNoDesc: "Aufgabenbeschreibung ist erforderlich!",
        cmComplete: "Abschließen (100%)", cmAtt: "Achtung markieren", cmNorm: "Normaler Status", cmDel: "Aufgabe löschen"
    },
    'es': {
        title: "Cronograma de Ingeniería Industrial", connecting: "Conectando a la base de datos...",
        syncTitle: "Sincronización en tiempo real", baseYear: "Año Base:",
        kpi1: "Acciones Completadas", kpi1desc: "Progreso general",
        kpi2: "Retrasos Críticos", kpi2desc: "Tareas atrasadas",
        kpi3: "Hitos (Milestones)", kpi3desc: "Hitos",
        search: "Buscar tarea...", phResp: "Ingeniero / Técnico", phDesc: "Ej: Tryout Máquina 04...",
        phSub: "Nueva subtarea...", phNewProj: "Nombre del proyecto...", phNewSec: "Nuevo sector...",
        zoomDay: "Zoom Diario", zoomWeek: "Zoom Semanal", zoomMonth: "Zoom Mensual",
        btnTheme: "Tema", btnSetup: "Setup", btnToday: "Hoy", btnAdd: "Tarea", btnExcel: "Excel", btnPrint: "Imprimir",
        btnHeatmap: "Equipo", heatmapTitle: "Mapa de Carga del Equipo",
        hmDesc: "Los colores indican tareas simultáneas: 1-2 (Verde), 3-4 (Amarillo), 5+ (Rojo/Sobrecarga).",
        hmTeam: "Miembro del Equipo",
        legInfo: "Informativo", legSup: "Soporte / Atención", legMile: "Hitos del Cliente",
        modalTitle: "Nueva Tarea", modalTitleEdit: "Editar Tarea", lblProj: "Proyecto", lblArea: "Área / Sector", lblStart: "Inicio", lblEnd: "Fin Previsto",
        lblResp: "Responsable (Múltiple o Libre)", lblClass: "Clasificación", lblDesc: "Descripción Detallada", lblCheck: "Lista de Subtareas",
        optInfo: "Informativo (Azul)", optSup: "Soporte / Atención (Amarillo)", optMile: "Hitos del Cliente (Naranja)",
        btnDelete: "Eliminar", btnCancel: "Cancelar (Esc)", btnSave: "Guardar en Nube",
        setupTitle: "Configuración de Base de Datos", setupProj: "Proyectos Activos", setupSec: "Sectores por Proyecto", setupBackup: "Seguridad y Respaldo",
        btnExport: "Exportar Datos", btnImport: "Importar Respaldo", btnClose: "Cerrar (Esc)",
        printTitle: "Imprimir Cronograma", btnGen: "Generar", printIncGantt: "Incluir Gráfico de Gantt visual",
        strAllProj: "Todos Proyectos", strAllArea: "Todas Áreas", strAllResp: "Todos Responsables", strNoSector: "Sin Sector", strNoData: "Sin datos.",
        ttResp: "Responsable", ttStatus: "Estado", ttEvol: "Evolución", ttPer: "Período", ttCheck: "Checklist",
        thProj: "PROYECTO", thSetor: "SECTOR", alertPend: "Atención: ¡{n} elemento(s) pendiente(s) cerca de la fecha límite!", alertCrit: "Atención: ¡Plazo crítico!",
        printDetails: "Informe Detallado de Tareas", printAction: "Acción Técnica",
        msgDateErr: "¡La fecha de fin no puede ser anterior a la de inicio!", msgEmpty: "Por favor, complete todos los campos requeridos.",
        msgNoDesc: "¡La descripción de la tarea es obligatoria!",
        cmComplete: "Completar (100%)", cmAtt: "Marcar Atención", cmNorm: "Estado Normal", cmDel: "Eliminar Tarea"
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
    
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if(dict[key]) el.title = dict[key];
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
    
    const temaIcone = document.getElementById('tema-icone');
    if (temaIcone) {
        temaIcone.innerHTML = isDark ? iconMoon : iconSun;
    }
    
    setTimeout(() => gerarMatriz(), 100); 
}

function toggleTheme() {
    const overlay = document.getElementById('theme-overlay');
    const isDark = !document.body.classList.contains('dark-theme');
    
    if (overlay) {
        overlay.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    }

    const container = document.getElementById('gantt-container');
    if (container) {
        container.style.transition = 'transform 0.3s ease';
        container.style.transform = 'scale(0.98)';
    }
    
    setTimeout(() => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('motherson_theme', isDark ? 'dark' : 'light');
        
        const temaIcone = document.getElementById('tema-icone');
        if (temaIcone) {
            temaIcone.innerHTML = isDark ? iconMoon : iconSun;
        }
        
        if (overlay) {
            overlay.style.background = 'rgba(0,0,0,0)';
        }
        if (container) {
            container.style.transform = 'scale(1)';
        }
    }, 150); 
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
    
    if(vA.value !== "ALL") vA.classList.add('filtro-ativo');
    else vA.classList.remove('filtro-ativo');
}

function atualizarFiltroResponsavel() {
    const vR = document.getElementById('filtro-resp-view');
    if(!vR) return;
    const selAno = parseInt(document.getElementById('filtro-ano-view').value);
    vR.innerHTML = `<option value="ALL">${i18n[currentLang].strAllResp}</option>`;
    let resps = new Set();
    tarefas.forEach(t => { 
        if(t.responsavel && (dayjs(t.inicio).year() === selAno || dayjs(t.fim).year() === selAno)) {
            t.responsavel.split(',').forEach(r => {
                let nomeLimpo = r.trim();
                if(nomeLimpo) resps.add(nomeLimpo);
            });
        }
    });
    Array.from(resps).sort().forEach(r => vR.innerHTML += `<option value="${r}">${r}</option>`);
    const s = localStorage.getItem('motherson_filtro_resp');
    if(s && resps.has(s)) vR.value = s;
    
    if(vR.value !== "ALL") vR.classList.add('filtro-ativo');
    else vR.classList.remove('filtro-ativo');
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
    
    setTimeout(() => {
        animateValue('kpi-progresso-total', parseInt(document.getElementById('kpi-progresso-total').innerText) || 0, pct, 800, true);
        animateValue('kpi-atrasos', parseInt(document.getElementById('kpi-atrasos').innerText) || 0, atrasos, 800, false);
        animateValue('kpi-milestones', parseInt(document.getElementById('kpi-milestones').innerText) || 0, marcos, 800, false);
        
        let donut = document.getElementById('donut-progresso');
        if(donut) donut.style.setProperty('--p', pct + '%');
        let circleAtrasos = document.getElementById('circle-atrasos');
        if (circleAtrasos) circleAtrasos.style.animation = atrasos > 0 ? "piscar 1.5s infinite" : "none";
    }, 50);
}

function handleTaskClick(e, id) {
    if (isResizing) return; 
    abrirModalAcao(id);
}

function abrirContextMenu(e, id) {
    e.preventDefault(); 
    currentContextId = id;
    const menu = document.getElementById('context-menu');
    menu.style.display = 'flex';
    let x = e.clientX; 
    let y = e.clientY;
    if(x + 180 > window.innerWidth) x = window.innerWidth - 190;
    if(y + 160 > window.innerHeight) y = window.innerHeight - 170;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

document.addEventListener('click', (e) => { 
    const menu = document.getElementById('context-menu');
    if(menu && menu.style.display === 'flex' && !menu.contains(e.target)) {
        menu.style.display = 'none'; 
    }
});

document.addEventListener('keydown', (e) => {
    if(e.key === 'f' && e.ctrlKey) { e.preventDefault(); document.getElementById('filtro-busca')?.focus(); }
    if((e.key === 't' || e.key === 'T') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { irParaHoje(true); }
});

const ganttContainer = document.getElementById('gantt-container');
let isPanning = false; let startX, startY, scrollLeft, scrollTop;
ganttContainer.addEventListener('mousedown', (e) => {
    if(e.target.closest('.task-wrapper') || e.target.closest('.resize-handle')) return;
    isPanning = true;
    ganttContainer.classList.add('panning');
    startX = e.pageX - ganttContainer.offsetLeft;
    startY = e.pageY - ganttContainer.offsetTop;
    scrollLeft = ganttContainer.scrollLeft;
    scrollTop = ganttContainer.scrollTop;
});
ganttContainer.addEventListener('mouseleave', () => { isPanning = false; ganttContainer.classList.remove('panning'); });
ganttContainer.addEventListener('mouseup', () => { isPanning = false; ganttContainer.classList.remove('panning'); });
ganttContainer.addEventListener('mousemove', (e) => {
    if(!isPanning) return;
    e.preventDefault();
    const x = e.pageX - ganttContainer.offsetLeft;
    const y = e.pageY - ganttContainer.offsetTop;
    ganttContainer.scrollLeft = scrollLeft - (x - startX);
    ganttContainer.scrollTop = scrollTop - (y - startY);
});

function cmAcao(e, acao) {
    if(e) e.stopPropagation();
    document.getElementById('context-menu').style.display = 'none';
    
    if(!currentContextId) return;
    const t = tarefas.find(x => x.id === currentContextId);
    if(!t) return;
    
    if(acao === 'concluir') {
        db.collection('tarefas').doc(currentContextId).update({ progresso: 100 }).then(triggerSync);
    } else if(acao === 'suporte') {
        db.collection('tarefas').doc(currentContextId).update({ status: 'suporte' }).then(triggerSync);
    } else if(acao === 'informativo') {
        db.collection('tarefas').doc(currentContextId).update({ status: 'informativo' }).then(triggerSync);
    } else if(acao === 'excluir') {
        if(confirm(i18n[currentLang].btnDelete + "?")) db.collection('tarefas').doc(currentContextId).delete().then(triggerSync);
    }
}

function abrirModalHeatmap() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value);
    const dict = i18n[currentLang];
    const dIn = dayjs(`${selAno}-01-01`);
    const dFim = dayjs(`${selAno}-12-31`);
    
    let weeksData = {};
    for(let i=0; i<366; i++) {
        let d = dIn.add(i, 'day');
        if (d.year() > selAno) break;
        let cw = calcularCW(d.toDate());
        if(!weeksData[cw]) weeksData[cw] = { start: d.format('YYYY-MM-DD'), end: d.format('YYYY-MM-DD') };
        weeksData[cw].end = d.format('YYYY-MM-DD');
    }
    let maxCw = Math.max(...Object.keys(weeksData).map(Number));

    let h = `<table class="heatmap-table"><thead><tr><th class="heatmap-row-header">${dict.hmTeam}</th>`;
    for(let w=1; w<=maxCw; w++) {
        const isCurr = (w === calcularCW(new Date()) && selAno === dayjs().year());
        h += `<th id="hw-cw-${w}" style="${isCurr ? 'color: var(--motherson-red); font-size: 13px;' : ''}">CW ${w}</th>`;
    }
    h += `</tr></thead><tbody>`;

    let tAno = tarefas.filter(x => !(dayjs(x.fim).isBefore(dIn) || dayjs(x.inicio).isAfter(dFim)));

    teamMembers.forEach(eng => {
        h += `<tr><td class="heatmap-row-header">${eng}</td>`;
        for(let w=1; w<=maxCw; w++) {
            let count = 0;
            if(weeksData[w]) {
                let wStart = dayjs(weeksData[w].start);
                let wEnd = dayjs(weeksData[w].end);
                tAno.forEach(t => {
                    if(t.responsavel && t.responsavel.includes(eng)) {
                        let tStart = dayjs(t.inicio);
                        let tEnd = dayjs(t.fim);
                        if(tStart.isBefore(wEnd.add(1, 'day')) && tEnd.isAfter(wStart.subtract(1, 'day'))) count++;
                    }
                });
            }
            let heatClass = count === 0 ? 'heat-0' : count <= 2 ? 'heat-1' : count <= 4 ? 'heat-3' : 'heat-5';
            h += `<td class="${heatClass}" title="${eng} - CW ${w}: ${count} tarefas"><div class="heat-cell"><div class="heat-badge">${count > 0 ? count : '•'}</div></div></td>`;
        }
        h += `</tr>`;
    });
    h += `</tbody></table>`;
    
    document.getElementById('heatmap-container').innerHTML = h;
    document.getElementById('modal-heatmap').style.display = 'flex';

    setTimeout(() => {
        let currCw = calcularCW(new Date());
        if (selAno === dayjs().year()) {
            let elCw = document.getElementById(`hw-cw-${currCw}`);
            let container = document.getElementById('heatmap-container');
            if(elCw && container) {
                container.scrollTo({ left: elCw.offsetLeft - 180, behavior: 'smooth' });
            }
        }
    }, 100);
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
        
        const tetoAno = dayjs(`${viewYear}-12-31`);
        if (newVisualEnd.isAfter(tetoAno)) {
            newVisualEnd = tetoAno;
        }

        let newEndStr = newVisualEnd.format('YYYY-MM-DD');
        taskElement.style.transition = '';

        if (t.fim !== newEndStr) {
            db.collection('tarefas').doc(id).update({ fim: newEndStr }).then(() => {
                triggerSync();
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
            db.collection("tarefas").doc(id).update({ inicio: d, fim: dayjs(d).add(dur, 'day').format('YYYY-MM-DD'), area: a, projeto: p }).then(triggerSync);
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
        (rF === "ALL" || (x.responsavel && x.responsavel.split(',').map(s=>s.trim()).includes(rF))) &&
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

    if (projsVisiveis.length === 0) { 
        h += `<tr><td colspan="10" style="padding:40px; text-align:center;"><div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg><div>${dict.strNoData}</div></div></td></tr>`; 
    }

    projsVisiveis.forEach(p => {
        let areas = areasLocais[p] || [];
        let exibe = aF === "ALL" ? areas : areas.filter(a => a === aF);
        
        if (exibe.length === 0 && projsVisiveis.length === 1) {
            h += `<tr><td class="col-proj">${p}</td><td class="col-area" style="color:#888;">${dict.strNoSector}</td><td colspan="${dArr.length}"></td></tr>`;
        } else if (exibe.length > 0) {
            
            let areasData = [];
            let totalRowsProj = 0;
            
            exibe.forEach(areaNome => {
                let tArea = tFiltradas.filter(x => x.projeto === p && x.area === areaNome);
                tArea.sort((a,b) => dayjs(a.inicio).diff(dayjs(b.inicio)));
                
                let camadas = [];
                tArea.forEach(t => {
                    let c = camadas.find(cam => dayjs(t.inicio).isAfter(dayjs(cam[cam.length-1].fim)));
                    if(c) c.push(t); else camadas.push([t]);
                });
                if(camadas.length === 0) camadas = [[]];
                
                areasData.push({ areaNome, camadas });
                totalRowsProj += camadas.length;
            });
            
            let isFirstRowProj = true;
            
            areasData.forEach(data => {
                data.camadas.forEach((camada, cIdx) => {
                    h += `<tr>`;
                    
                    if(isFirstRowProj) {
                        h += `<td rowspan="${totalRowsProj}" class="col-proj">${p}</td>`;
                        isFirstRowProj = false;
                    }
                    
                    if(cIdx === 0) {
                        h += `<td rowspan="${data.camadas.length}" class="col-area">${data.areaNome}</td>`;
                    }
                    
                    dArr.forEach(d => {
                        let task = camada.find(x => x.inicio === d.ds || (d.ds === dIn.format('YYYY-MM-DD') && dayjs(x.inicio).isBefore(dIn)));
                        let isMonthEnd = (d.d === d.daysInMonth);
                        
                        h += `<td class="${(d.s === 0 || d.s === 6) ? 'is-weekend' : ''} ${d.ds === hojeReal ? 'is-today' : ''} ${isMonthEnd ? 'month-end' : ''}" ondragover="allowDrop(event)" ondrop="dropTask(event,'${p}','${data.areaNome}','${d.ds}')">`;
                        
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
                                iconeAlerta = `<span class="task-alert" title="${tituloAlerta}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M12 2L2 19h20L12 2z"/></svg></span>`;
                            }
                            
                            h += `<div class="task-wrapper ${clDimmed}" id="task-${task.id}" draggable="true" ondragstart="dragStart(event, '${task.id}')" onclick="handleTaskClick(event, '${task.id}')" oncontextmenu="abrirContextMenu(event, '${task.id}')" onmousemove="showTooltip(event,'${task.id}')" onmouseleave="hideTooltip()" style="width:calc(${dur*100}% + ${dur-1}px);">
                                    <div class="task-bar ${task.status} ${clVemDeTras} ${clContinua}"><div class="progress-fill" style="width:${task.progresso}%;"></div></div>
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
    });

    h += `</tbody></table>`;
    document.getElementById('gantt-container').innerHTML = h;
    
    let elHeader = document.getElementById('data-header');
    if(elHeader) elHeader.innerText = `${dict.baseYear} ${tituloLabel}`;
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
        let feitas = t.subtarefas.filter(s => s.feita).length;
        let pct = Math.round((feitas / t.subtarefas.length) * 100);
        
        htmlSub = `<div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.2); padding-top:6px;"><strong>${dict.ttCheck}:</strong>`;
        htmlSub += `<div class="tooltip-sparkline"><div class="tooltip-sparkline-fill" style="width: ${pct}%"></div></div>`;
        t.subtarefas.forEach(s => { 
            let icon = s.feita 
                ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' 
                : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
            htmlSub += `<span style="${s.feita ? 'color:#888; text-decoration:line-through;' : ''}"><br>${icon} ${s.texto}</span>`;
        });
        htmlSub += `</div>`;
    }

    let statusT = (t.status === 'informativo' || t.status === 'operacional') ? dict.legInfo : t.status === 'suporte' ? dict.legSup : dict.legMile;
    el.innerHTML = `<strong>${t.texto}</strong><br>${dict.ttResp}: ${t.responsavel || '-'}<br>${dict.ttStatus}: ${statusT}<br>${dict.ttEvol}: ${t.progresso}%<br>${dict.ttPer}: ${dayjs(t.inicio).format('DD/MM/YY')} a ${dayjs(t.fim).format('DD/MM/YY')}${htmlSub}`;
    el.style.display = 'block'; el.style.left = (e.clientX + 15) + 'px'; el.style.top = (e.clientY + 15) + 'px';
}

function hideTooltip() { document.getElementById('custom-tooltip').style.display = 'none'; }

function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); subtarefasEditando = []; }

function renderRespTags() {
    const container = document.getElementById('resp-sugestoes');
    if(!container) return;
    const inp = document.getElementById('i-responsavel');
    const currentArr = inp.value.split(',').map(s => s.trim()).filter(s => s);

    let html = '';
    teamMembers.forEach(name => {
        const isSelected = currentArr.includes(name);
        html += `<span class="resp-tag ${isSelected ? 'selected' : ''}" onclick="toggleResp('${name}')">${name}</span>`;
    });
    container.innerHTML = html;
}

function toggleResp(name) {
    const inp = document.getElementById('i-responsavel');
    let currentArr = inp.value.split(',').map(s => s.trim()).filter(s => s);

    if(currentArr.includes(name)) {
        currentArr = currentArr.filter(n => n !== name);
    } else {
        currentArr.push(name);
    }
    inp.value = currentArr.join(', ');
    renderRespTags();
}

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
    
    let inpProg = document.getElementById('i-progresso');
    if(subtarefasEditando.length > 0) {
        let feitas = subtarefasEditando.filter(s => s.feita).length;
        inpProg.value = Math.round((feitas / subtarefasEditando.length) * 100);
        inpProg.readOnly = true;
    } else {
        inpProg.readOnly = false;
    }
}

function adicionarSubtarefa() {
    let txt = san(document.getElementById('nova-subtarefa-txt').value.trim());
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
        document.getElementById('i-texto').value = t.texto; 
        document.getElementById('i-responsavel').value = t.responsavel || '';
        subtarefasEditando = t.subtarefas ? JSON.parse(JSON.stringify(t.subtarefas)) : [];
        document.getElementById('btn-excluir').style.display = 'block';
    } else {
        document.getElementById('i-inicio').value = dayjs().format('YYYY-MM-DD'); document.getElementById('i-fim').value = dayjs().format('YYYY-MM-DD');
        document.getElementById('i-progresso').value = 0; document.getElementById('i-texto').value = '';
        document.getElementById('i-responsavel').value = '';
        subtarefasEditando = []; document.getElementById('btn-excluir').style.display = 'none'; atualizarAreasDoModalAcao();
    }
    renderRespTags();
    renderizarSubtarefasModal(); document.getElementById('modal-acao').style.display = 'flex';
}

function salvarTarefa() {
    const p = document.getElementById('i-projeto').value, a = document.getElementById('i-area').value, s = document.getElementById('i-inicio').value, f = document.getElementById('i-fim').value;
    const texto = document.getElementById('i-texto').value.trim();
    const dict = i18n[currentLang];
    
    if(!p || !a) { showToast(dict.msgEmpty, 'error'); return; }
    if(!texto) { showToast(dict.msgNoDesc, 'error'); return; }
    if(dayjs(f).isBefore(dayjs(s))) { showToast(dict.msgDateErr, 'error'); return; }
    
    const id = document.getElementById('i-id').value;
    const obj = { 
        projeto: p, 
        area: a, 
        inicio: s, 
        fim: f, 
        progresso: parseInt(document.getElementById('i-progresso').value) || 0, 
        status: document.getElementById('i-status').value, 
        texto: san(texto), 
        responsavel: san(document.getElementById('i-responsavel').value), 
        subtarefas: subtarefasEditando 
    };

    const btn = document.getElementById('btn-salvar-nuvem');
    const txtOriginal = btn.innerText;
    btn.innerHTML = '⏳ Gravando...';
    btn.style.opacity = '0.7';
    btn.disabled = true;

    const finalize = () => {
        triggerSync();
        fecharModais();
        btn.innerHTML = txtOriginal;
        btn.style.opacity = '1';
        btn.disabled = false;
    };

    if(id) { 
        db.collection("tarefas").doc(id).update(obj).then(finalize); 
    } else { 
        db.collection("tarefas").doc('T'+Date.now()).set(obj).then(finalize); 
    }
}

function apagarTarefaAtual() {
    if(confirm("Confirmar?")) { db.collection("tarefas").doc(document.getElementById('i-id').value).delete().then(triggerSync); fecharModais(); }
}

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
    const n = san(document.getElementById('cfg-novo-proj').value.toUpperCase().trim());
    const startVal = document.getElementById('cfg-proj-inicio').value, endVal = document.getElementById('cfg-proj-fim').value;
    const dict = i18n[currentLang];
    
    if(!n || !startVal || !endVal) { showToast(dict.msgEmpty, 'error'); return; }
    const startYear = parseInt(startVal.split('-')[0]), endYear = parseInt(endVal.split('-')[0]);
    if (endYear < startYear) { showToast(dict.msgDateErr, 'error'); return; }
    
    if(!projetosGlobal[n]) projetosGlobal[n] = [];
    for(let y = startYear; y <= endYear; y++) { if(!projetosGlobal[n].includes(y)) projetosGlobal[n].push(y); }
    if(!areasLocais[n]) areasLocais[n] = [];
    db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais, projetos: Object.keys(projetosGlobal) }, {merge: true}).then(() => {
        atualizarProjetosDoAno(); if(document.getElementById('modal-config').style.display === 'flex') renderizarListasConfig(); triggerSync();
    });
    document.getElementById('cfg-novo-proj').value = ''; document.getElementById('cfg-proj-inicio').value = ''; document.getElementById('cfg-proj-fim').value = '';
}

/* FIX 2: DELEÇÃO COMPLETA DE PROJETO (ANIQUILAÇÃO DO ZUMBI) */
function removerP(n) {
    let tProj = tarefas.filter(x => x.projeto === n);
    let msg = `ATENÇÃO: O projeto "${n}" será EXCLUÍDO PERMANENTEMENTE de todos os anos.\n\nEle possui ${tProj.length} ação(ões) vinculada(s).\n\nDeseja realmente excluir o projeto e todas as suas ações?`;
    
    if(confirm(msg)) {
        // Deleta as tarefas tratando erros silenciosos
        let promises = tProj.map(t => db.collection("tarefas").doc(t.id).delete().catch(err => console.error("Erro ao deletar:", err)));
        
        Promise.all(promises).then(() => {
            // Apaga da memória local completamente
            delete projetosGlobal[n];
            delete areasLocais[n];
            
            // Sobrescreve o documento inteiro sem o merge: true, varrendo as chaves mortas
            db.collection("settings").doc("global").set({ 
                projetosAnos: projetosGlobal, 
                areas: areasLocais, 
                projetos: Object.keys(projetosGlobal) 
            }).then(() => {
                atualizarProjetosDoAno(); 
                if(document.getElementById('modal-config').style.display === 'flex') renderizarListasConfig();
                triggerSync();
            });
        });
    }
}

function adicionarAreaConfig() {
    const p = document.getElementById('cfg-area-proj').value, n = san(document.getElementById('cfg-nova-area').value.trim());
    if(!p || !n) { showToast(i18n[currentLang].msgEmpty, 'error'); return; }
    
    if(!areasLocais[p]) areasLocais[p] = [];
    if(!areasLocais[p].includes(n)) { areasLocais[p].push(n); areasLocais[p].sort(); }
    db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais }, {merge:true}).then(() => {
        atualizarProjetosDoAno(); if(document.getElementById('modal-config').style.display === 'flex') renderizarListasConfig(); triggerSync();
    });
    document.getElementById('cfg-nova-area').value = '';
}

function removerA(p, i) {
    let areaNome = areasLocais[p][i];
    let tArea = tarefas.filter(x => x.projeto === p && x.area === areaNome);
    let msg = `Remover o setor "${areaNome}" do projeto "${p}"?`;
    if(tArea.length > 0) {
        msg = `ATENÇÃO: O setor "${areaNome}" possui ${tArea.length} ação(ões).\n\nRemover o setor apagará TODAS as ações vinculadas a ele permanentemente.\n\nDeseja excluir o setor e suas ações?`;
    }
    if(confirm(msg)) {
        let promises = tArea.map(t => db.collection("tarefas").doc(t.id).delete().catch(err => console.error("Erro ao deletar:", err)));
        Promise.all(promises).then(() => {
            areasLocais[p].splice(i, 1);
            db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais, projetos: Object.keys(projetosGlobal) }).then(() => {
                atualizarProjetosDoAno(); 
                if(document.getElementById('modal-config').style.display === 'flex') renderizarListasConfig();
                triggerSync();
            });
        });
    }
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
            document.getElementById('import-file').value = ''; fecharModais(); triggerSync();
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
    const pIn = document.getElementById('print-inicio').value;
    const pFim = document.getElementById('print-fim').value;
    
    if (!pIn || !pFim || dayjs(pFim).isBefore(dayjs(pIn))) {
        showToast(i18n[currentLang].msgDateErr, 'error');
        return;
    }
    
    fecharModais(); 
    const escalaAtual = document.getElementById('filtro-escala') ? document.getElementById('filtro-escala').value : 'diario';
    
    gerarRelatorioImpressao(pIn, pFim, escalaAtual);
    
    const originalTitle = document.title;
    document.title = `Cronograma_Motherson_${dayjs(pIn).format('DD-MM-YY')}_a_${dayjs(pFim).format('DD-MM-YY')}`;
    
    setTimeout(() => { 
        window.print(); 
        document.title = originalTitle; 
        document.getElementById('print-layout').innerHTML = ''; 
        gerarMatriz(); 
    }, 150);
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
    
    let tFiltradas = tarefas.filter(x => 
        !(dayjs(x.fim).isBefore(dIn) || dayjs(x.inicio).isAfter(dFim)) && 
        (pF === "ALL" || x.projeto === pF) && 
        (aF === "ALL" || x.area === aF) && 
        (rF === "ALL" || (x.responsavel && x.responsavel.split(',').map(s=>s.trim()).includes(rF))) &&
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
            h += `<th colspan="${span}">${escala === 'semanal' ? 'CW ' : ''}${cwNum}</th>`;
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
            let areasData = [];
            let totalRowsProj = 0;
            exibe.forEach(areaNome => {
                let tArea = tFiltradas.filter(x => x.projeto === p && x.area === areaNome);
                tArea.sort((a,b) => dayjs(a.inicio).diff(dayjs(b.inicio)));
                let camadas = [];
                tArea.forEach(t => { let c = camadas.find(cam => dayjs(t.inicio).isAfter(dayjs(cam[cam.length-1].fim))); if(c) c.push(t); else camadas.push([t]); });
                if(camadas.length === 0) camadas = [[]];
                areasData.push({ areaNome, camadas });
                totalRowsProj += camadas.length;
            });
            
            let isFirstRowProj = true;
            areasData.forEach(data => {
                data.camadas.forEach((camada, cIdx) => {
                    h += `<tr>`;
                    if(isFirstRowProj) { h += `<td rowspan="${totalRowsProj}" class="col-proj">${p}</td>`; isFirstRowProj = false; }
                    if(cIdx === 0) { h += `<td rowspan="${data.camadas.length}" class="col-area">${data.areaNome}</td>`; }
                    
                    let dIdx = 0;
                    while(dIdx < dArr.length) {
                        let d = dArr[dIdx];
                        let task = camada.find(x => dayjs(d.ds).isBetween(x.inicio, x.fim, 'day', '[]'));
                        
                        if(task) {
                            let cStart = dayjs.max(dayjs(task.inicio), dIn);
                            let cEnd = dayjs.min(dayjs(task.fim), dFim);
                            let span = cEnd.diff(cStart, 'day') + 1;
                            
                            let subInfo = task.subtarefas?.length ? ` [${task.subtarefas.filter(s=>s.feita).length}/${task.subtarefas.length}]` : '';
                            let iconeAlerta = ((task.progresso||0) < 100 && dayjs(task.fim).startOf('day').diff(dayjs().startOf('day'), 'day') <= 3) ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px; vertical-align:middle;"><path d="M12 9v4M12 17h.01"/><path d="M12 2L2 19h20L12 2z"/></svg>' : '';
                            
                            let isVemDeTras = dayjs(task.inicio).isBefore(dIn) ? 'border-left: 1.5pt dashed #000 !important;' : '';
                            let isContinua = dayjs(task.fim).isAfter(dFim) ? 'border-right: 1.5pt dashed #000 !important;' : '';

                            h += `<td colspan="${span}" class="print-task-cell ${task.status}" style="${isVemDeTras} ${isContinua}">
                                    <div class="print-task-text">${iconeAlerta}${task.texto}${subInfo} (${task.progresso}%)</div>
                                  </td>`;
                            dIdx += span;
                        } else {
                            let isMonthEnd = (d.d === d.daysInMonth) ? 'border-right: 1.5pt solid #555 !important;' : '';
                            let isWeekend = (d.s === 0 || d.s === 6) ? 'background-color: #f2f2f2 !important;' : '';
                            h += `<td style="${isWeekend} ${isMonthEnd} border: 0.5pt solid #888;"></td>`;
                            dIdx++;
                        }
                    }
                    h += `</tr>`;
                });
            });
        }
    });
    h += `</tbody></table>`;

    let sortedTasks = [...tFiltradas].sort((a,b) => dayjs(a.inicio).diff(dayjs(b.inicio)));
    
    // Detalhamento enxuto para caber mais ações por página
    let hTable = `<div style="margin-top: 20px; width: 100%; font-family: 'Graphik', Arial, sans-serif; page-break-before: auto;">
        <h3 style="color: var(--motherson-red); border-bottom: 2px solid var(--motherson-red); padding-bottom: 4px; margin-bottom: 8px; font-size: 13px;">${dict.printDetails}</h3>
        <table class="print-appendix-table" style="width: 100%; border-collapse: collapse; font-size: 8px; border: 1.5pt solid #000;">
            <thead>
                <tr style="background: #eaeaea; border-bottom: 1.5pt solid #000; text-align: left;">
                    <th style="padding: 2px 4px; border: 0.5pt solid #888; text-align: center; width: 40px;">${dict.ttStatus}</th>
                    <th style="padding: 2px 4px; border: 0.5pt solid #888;">${dict.printAction}</th>
                    <th style="padding: 2px 4px; border: 0.5pt solid #888; width: 140px;">${dict.lblProj} / ${dict.lblArea}</th>
                    <th style="padding: 2px 4px; border: 0.5pt solid #888; width: 90px;">${dict.ttPer}</th>
                    <th style="padding: 2px 4px; border: 0.5pt solid #888; width: 100px;">${dict.lblResp}</th>
                    <th style="padding: 2px 4px; border: 0.5pt solid #888; text-align: center; width: 35px;">%</th>
                </tr>
            </thead>
            <tbody>`;

    if (sortedTasks.length === 0) {
        hTable += `<tr><td colspan="6" style="padding: 10px; text-align: center;">${dict.strNoData}</td></tr>`;
    } else {
        sortedTasks.forEach(t => {
            let statusColor = t.status === 'milestone' ? '#ff5722' : (t.status === 'suporte' ? '#ffcc00' : '#007bff');
            
            hTable += `<tr>
                <td style="padding: 2px 4px; border: 0.5pt solid #888; text-align: center;">
                    <div style="width: 8px; height: 8px; background: ${statusColor}; margin: 0 auto; border: 1px solid #000;"></div>
                </td>
                <td style="padding: 2px 4px; border: 0.5pt solid #888; font-weight: bold; line-height: 1.1;">${t.texto}</td>
                <td style="padding: 2px 4px; border: 0.5pt solid #888;">${t.projeto} - ${t.area}</td>
                <td style="padding: 2px 4px; border: 0.5pt solid #888;">${dayjs(t.inicio).format('DD/MM/YY')} - ${dayjs(t.fim).format('DD/MM/YY')}</td>
                <td style="padding: 2px 4px; border: 0.5pt solid #888;">${t.responsavel || '-'}</td>
                <td style="padding: 2px 4px; border: 0.5pt solid #888; text-align: center; font-weight: bold;">${t.progresso}%</td>
            </tr>`;
        });
    }
    hTable += `</tbody></table></div>`;

    let includeGantt = document.getElementById('print-inc-gantt') ? document.getElementById('print-inc-gantt').checked : true;
    let ganttSection = includeGantt ? `<div class="print-table-container">${h}</div>` : '';

    document.getElementById('print-layout').innerHTML = `
        <div class="print-header-fixed">
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
        </div>

        <table class="print-wrapper-table">
            <thead><tr><td><div class="header-space"></div></td></tr></thead>
            <tbody><tr><td>
                ${ganttSection}
                ${hTable}
            </td></tr></tbody>
            <tfoot><tr><td><div class="footer-space"></div></td></tr></tfoot>
        </table>

        <div class="print-footer-fixed">
            <span>Motherson Group - Documento Interno de Gestão</span>
            <span>Proud to be part of.</span>
        </div>
    `;
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModais(); });
document.querySelectorAll('.modal-overlay').forEach(overlay => { overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) fecharModais(); }); });

initLang();
initTheme();