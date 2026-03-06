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

const dataSistema = dayjs();
const HOJE = dataSistema.format('YYYY-MM-DD');

let projetosGlobal = {};
let projetosDoAno = [];
let areasLocais = {};
let tarefas = [];
let subtarefasEditando = [];
let configCarregada = false;
let tarefasCarregadas = false;
let inicializacaoCompleta = false;

function initTheme() {
    const saved = localStorage.getItem('motherson_theme');
    const isDark = saved === 'dark';
    document.body.classList.toggle('dark-theme', isDark);
    const btn = document.getElementById('btn-tema');
    if(btn) btn.innerText = isDark ? '☀️ Tema' : '🌙 Tema';
}

function toggleTheme() {
    const isNowDark = !document.body.classList.contains('dark-theme');
    localStorage.setItem('motherson_theme', isNowDark ? 'dark' : 'light');
    initTheme();
}

function calcularCW(d) {
    let date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    let week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function initAnoSelector() {
    const sel = document.getElementById('filtro-ano-view');
    if(sel.options.length > 0) return;
    for(let a = 2026; a <= 2035; a++) {
        let opt = document.createElement('option');
        opt.value = a;
        opt.innerHTML = a;
        sel.appendChild(opt);
    }
    let memYear = parseInt(localStorage.getItem('motherson_filtro_ano'));
    if (!memYear || memYear < 2026) memYear = Math.max(2026, dataSistema.year());
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
            if (y >= 2026 && !projetosGlobal[p].includes(y)) { 
                projetosGlobal[p].push(y); 
                mudou = true; 
            }
        }
        
        if (t.area) {
            if (!areasLocais[p]) { areasLocais[p] = []; mudou = true; }
            if (!areasLocais[p].includes(t.area)) { 
                areasLocais[p].push(t.area); 
                mudou = true; 
            }
        }
    });

    if (mudou) {
        db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais, projetos: Object.keys(projetosGlobal) }, {merge: true});
    }

    atualizarProjetosDoAno();
    
    if(!inicializacaoCompleta) {
        setTimeout(() => irParaHoje(false), 200);
        inicializacaoCompleta = true;
    }
}

function atualizarProjetosDoAno() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value) || Math.max(2026, dataSistema.year());
    
    projetosDoAno = [];
    for (let proj in projetosGlobal) {
        if (projetosGlobal[proj].includes(selAno)) {
            projetosDoAno.push(proj);
        }
    }
    projetosDoAno.sort();
    
    // ORDEM CRÍTICA MANTIDA AQUI: 1. Popula selects -> 2. Popula áreas -> 3. Gera Matriz
    atualizarSelects();
    gerarMatriz();
}

function atualizarSelects() {
    let sP = document.getElementById('i-projeto');
    let vP = document.getElementById('filtro-proj-view');
    if(!sP || !vP) return;
    
    sP.innerHTML = '';
    vP.innerHTML = '<option value="ALL">Todos os Projetos</option>';
    
    projetosDoAno.forEach(p => {
        sP.innerHTML += `<option value="${p}">${p}</option>`;
        vP.innerHTML += `<option value="${p}">${p}</option>`;
    });
    
    const s = localStorage.getItem('motherson_filtro_proj');
    if(s && projetosDoAno.includes(s)) vP.value = s;
    else vP.value = "ALL";
    
    atualizarAreasDoModalAcao();
    atualizarFiltroResponsavel();
    
    // CORREÇÃO: As opções de Área agora são construídas ANTES do gráfico tentar lê-las.
    atualizarFiltroAreasGlobais(); 
}

function atualizarAreasDoModalAcao() {
    let p = document.getElementById('i-projeto').value;
    let sA = document.getElementById('i-area');
    if(!sA) return;
    sA.innerHTML = '';
    if(p && areasLocais[p]) {
        areasLocais[p].forEach(a => sA.innerHTML += `<option value="${a}">${a}</option>`);
    }
}

function atualizarFiltroAreasGlobais() {
    let vP = document.getElementById('filtro-proj-view').value;
    let vA = document.getElementById('filtro-area-view');
    if(!vA) return;
    vA.innerHTML = '<option value="ALL">Todas as Áreas</option>';
    let u = new Set();
    
    if(vP === "ALL") {
        projetosDoAno.forEach(p => {
            if(areasLocais[p]) areasLocais[p].forEach(a => u.add(a));
        });
    } else if(areasLocais[vP]) {
        areasLocais[vP].forEach(a => u.add(a));
    }
    
    Array.from(u).sort().forEach(a => vA.innerHTML += `<option value="${a}">${a}</option>`);
    const s = localStorage.getItem('motherson_filtro_area');
    if(s && u.has(s)) vA.value = s;
}

function atualizarFiltroResponsavel() {
    const vR = document.getElementById('filtro-resp-view');
    if(!vR) return;
    const selAno = parseInt(document.getElementById('filtro-ano-view').value);
    vR.innerHTML = '<option value="ALL">Todos os Responsáveis</option>';
    let resps = new Set();
    tarefas.forEach(t => {
        if(t.responsavel && (dayjs(t.inicio).year() === selAno || dayjs(t.fim).year() === selAno)) {
            resps.add(t.responsavel);
        }
    });
    Array.from(resps).sort().forEach(r => vR.innerHTML += `<option value="${r}">${r}</option>`);
    const s = localStorage.getItem('motherson_filtro_resp');
    if(s && resps.has(s)) vR.value = s;
}

function salvarFiltros() {
    localStorage.setItem('motherson_filtro_proj', document.getElementById('filtro-proj-view').value);
    localStorage.setItem('motherson_filtro_area', document.getElementById('filtro-area-view').value);
    localStorage.setItem('motherson_filtro_resp', document.getElementById('filtro-resp-view').value);
}

function atualizarKPIs(filtradas) {
    if(!filtradas.length) { 
        document.getElementById('kpi-progresso-total').innerText = "0%";
        document.getElementById('kpi-atrasos').innerText = "0";
        document.getElementById('kpi-milestones').innerText = "0";
        return; 
    }
    const sum = filtradas.reduce((a, t) => a + (t.progresso || 0), 0);
    const atrasos = filtradas.filter(t => dayjs(t.fim).isBefore(dayjs()) && (t.progresso || 0) < 100).length;
    const marcos = filtradas.filter(t => t.status === 'milestone').length;
    document.getElementById('kpi-progresso-total').innerText = Math.round(sum / filtradas.length) + "%";
    document.getElementById('kpi-atrasos').innerText = atrasos;
    document.getElementById('kpi-milestones').innerText = marcos;
}

function gerarMatriz() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value);
    if(isNaN(selAno)) return;
    renderizarGantt(`${selAno}-01-01`, `${selAno}-12-31`, selAno);
}

function renderizarGantt(startStr, endStr, tituloLabel) {
    const dIn = dayjs(startStr);
    const dFim = dayjs(endStr);
    const totalDias = dFim.diff(dIn, 'day') + 1;
    
    let dArr = [];
    for(let i=0; i<totalDias; i++) {
        let d = dIn.add(i, 'day');
        dArr.push({ ds: d.format('YYYY-MM-DD'), d: d.date(), m: d.format('MMMM'), s: d.day(), y: d.year() });
    }
    
    const pF = document.getElementById('filtro-proj-view').value;
    const aF = document.getElementById('filtro-area-view').value;
    const rF = document.getElementById('filtro-resp-view').value;
    const projsVisiveis = pF === "ALL" ? projetosDoAno : [pF];

    let tFiltradas = tarefas.filter(x => 
        !(dayjs(x.fim).isBefore(dIn) || dayjs(x.inicio).isAfter(dFim)) &&
        (pF === "ALL" || x.projeto === pF) &&
        (aF === "ALL" || x.area === aF) &&
        (rF === "ALL" || x.responsavel === rF)
    );

    atualizarKPIs(tFiltradas);

    let h = `<table><thead><tr class="head-mes"><th class="col-proj"></th><th class="col-area">${tituloLabel}</th>`;
    for(let i=0; i<dArr.length; i++) {
        let span = 1;
        while(i+1 < dArr.length && dArr[i+1].m === dArr[i].m) { span++; i++; }
        h += `<th colspan="${span}">${dArr[i].m.substring(0,3).toUpperCase()}</th>`;
    }
    h += `</tr><tr class="head-cw"><th class="col-proj"></th><th class="col-area">CW</th>`;
    for(let i=0; i<dArr.length; i++) {
        let dObj = new Date(dArr[i].ds + 'T12:00:00');
        let cwNum = calcularCW(dObj);
        let span = 1;
        while(i+1 < dArr.length && calcularCW(new Date(dArr[i+1].ds + 'T12:00:00')) === cwNum) { span++; i++; }
        const isCurr = (cwNum === calcularCW(new Date()) && dArr[i].y === new Date().getFullYear());
        h += `<th colspan="${span}" style="${isCurr ? 'background:var(--bg-current-cw); font-weight:900;' : ''}">${cwNum}</th>`;
    }
    h += `</tr><tr class="head-dia"><th class="col-proj">PROJETO</th><th class="col-area">SETOR</th>`;
    dArr.forEach(d => h += `<th class="${(d.s === 0 || d.s === 6) ? 'is-weekend' : ''} ${d.ds === HOJE ? 'is-today' : ''}">${d.d}</th>`);
    h += `</tr></thead><tbody>`;

    if (projsVisiveis.length === 0) {
        h += `<tr><td colspan="${dArr.length+2}" style="padding:20px;">Nenhum projeto associado a este ano.</td></tr>`;
    }

    projsVisiveis.forEach(p => {
        let areas = areasLocais[p] || [];
        let exibe = aF === "ALL" ? areas : areas.filter(a => a === aF);
        
        if (exibe.length === 0) {
            h += `<tr><td class="col-proj">${p}</td><td class="col-area" style="color:#888;">Sem Setor</td>`;
            dArr.forEach(() => h += `<td></td>`); 
            h += `</tr>`;
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
                        h += `<td class="${(d.s === 0 || d.s === 6) ? 'is-weekend' : ''} ${d.ds === HOJE ? 'is-today' : ''}" ondragover="allowDrop(event)" ondrop="dropTask(event,'${p}','${areaNome}','${d.ds}')">`;
                        if(task){
                            let cStart = dayjs.max(dayjs(task.inicio), dIn);
                            let cEnd = dayjs.min(dayjs(task.fim), dFim);
                            let dur = cEnd.diff(cStart, 'day') + 1;
                            let isMilestone = task.status === 'milestone';
                            let subInfo = "";
                            if(task.subtarefas && task.subtarefas.length > 0) {
                                let feitas = task.subtarefas.filter(s => s.feita).length;
                                subInfo = ` [${feitas}/${task.subtarefas.length}]`;
                            }
                            
                            h += `<div class="task-wrapper ${isMilestone ? 'milestone-diamond' : ''}" style="width:calc(${dur*100}% + ${dur-1}px);" onclick="abrirModalAcao('${task.id}')" onmousemove="showTooltip(event,'${task.id}')" onmouseleave="hideTooltip()">
                                    <div class="task-bar ${task.status}"><div class="progress-fill" style="width:${task.progresso}%"></div></div>
                                    <div class="task-label">${task.texto}${subInfo}</div>
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
    document.getElementById('gantt-container').innerHTML = h + `</tbody></table>`;
    document.getElementById('data-header').innerText = `Visualizando: ${tituloLabel} | 🟢 Online`;
    initTheme();
}

function irParaHoje(forceChangeYear = false) {
    const anoH = dataSistema.year();
    const sel = document.getElementById('filtro-ano-view');
    if(parseInt(sel.value) !== anoH) {
        if(forceChangeYear) {
            sel.value = Math.max(2026, anoH);
            trocarAno();
            setTimeout(() => irParaHoje(false), 300);
        }
        return;
    }
    const t = document.querySelector('.is-today');
    if (t) document.getElementById('gantt-container').scrollTo({ left: t.offsetLeft - 250, behavior: 'smooth' });
}

function showTooltip(e, id) {
    let t = tarefas.find(x => x.id === id);
    if(!t || window.innerWidth < 600) return;
    let el = document.getElementById('custom-tooltip');
    
    let htmlSub = "";
    if(t.subtarefas && t.subtarefas.length > 0) {
        htmlSub = `<div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.2); padding-top:6px;"><strong>Checklist:</strong><br>`;
        t.subtarefas.forEach(s => {
            htmlSub += `<span style="${s.feita ? 'color:#888; text-decoration:line-through;' : ''}">${s.feita ? '✅' : '⬜'} ${s.texto}</span><br>`;
        });
        htmlSub += `</div>`;
    }

    let statusT = (t.status === 'informativo' || t.status === 'operacional') ? 'Informativo' : t.status === 'suporte' ? 'Suporte' : 'Milestone';
    el.innerHTML = `<strong>${t.texto}</strong><br>Responsável: ${t.responsavel || '-'}<br>Status: ${statusT}<br>Evolução: ${t.progresso}%<br>Período: ${dayjs(t.inicio).format('DD/MM/YY')} a ${dayjs(t.fim).format('DD/MM/YY')}${htmlSub}`;
    el.style.display = 'block'; 
    el.style.left = (e.clientX + 15) + 'px'; 
    el.style.top = (e.clientY + 15) + 'px';
}

function hideTooltip() { document.getElementById('custom-tooltip').style.display = 'none'; }
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
function dragStart(e, id) { localStorage.setItem('draggedTaskId', id); }

function fecharModais() { 
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); 
    subtarefasEditando = []; 
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
    
    if(subtarefasEditando.length > 0) {
        let feitas = subtarefasEditando.filter(s => s.feita).length;
        document.getElementById('i-progresso').value = Math.round((feitas / subtarefasEditando.length) * 100);
    }
}

function adicionarSubtarefa() {
    let txt = document.getElementById('nova-subtarefa-txt').value.trim();
    if(txt) {
        subtarefasEditando.push({ texto: txt, feita: false });
        document.getElementById('nova-subtarefa-txt').value = "";
        renderizarSubtarefasModal();
    }
}

function toggleSubtarefa(idx) {
    subtarefasEditando[idx].feita = !subtarefasEditando[idx].feita;
    renderizarSubtarefasModal();
}

function removerSubtarefa(idx) {
    subtarefasEditando.splice(idx, 1);
    renderizarSubtarefasModal();
}

function abrirModalAcao(id = null) {
    const t = id ? tarefas.find(x => x.id === id) : null;
    document.getElementById('modal-titulo').innerText = t ? "Editar Ação" : "Nova Ação";
    document.getElementById('i-id').value = t ? t.id : '';
    if(t) {
        document.getElementById('i-projeto').value = t.projeto;
        atualizarAreasDoModalAcao();
        document.getElementById('i-area').value = t.area;
        document.getElementById('i-inicio').value = t.inicio;
        document.getElementById('i-fim').value = t.fim;
        document.getElementById('i-progresso').value = t.progresso;
        document.getElementById('i-status').value = (t.status === 'operacional') ? 'informativo' : t.status;
        document.getElementById('i-texto').value = t.texto;
        document.getElementById('i-responsavel').value = t.responsavel || '';
        subtarefasEditando = t.subtarefas ? JSON.parse(JSON.stringify(t.subtarefas)) : [];
        document.getElementById('btn-excluir').style.display = 'block';
    } else {
        document.getElementById('i-inicio').value = HOJE; 
        document.getElementById('i-fim').value = HOJE;
        document.getElementById('i-progresso').value = 0; 
        document.getElementById('i-texto').value = '';
        subtarefasEditando = [];
        document.getElementById('btn-excluir').style.display = 'none';
        atualizarAreasDoModalAcao();
    }
    renderizarSubtarefasModal();
    document.getElementById('modal-acao').style.display = 'flex';
}

function salvarTarefa() {
    const p = document.getElementById('i-projeto').value;
    const a = document.getElementById('i-area').value;
    const s = document.getElementById('i-inicio').value;
    const f = document.getElementById('i-fim').value;
    
    if(!p || !a || dayjs(f).isBefore(dayjs(s))) return alert("Verifique as datas e preencha os dados corretamente.");
    
    const id = document.getElementById('i-id').value;
    const obj = { 
        projeto: p, 
        area: a, 
        inicio: s, 
        fim: f, 
        progresso: parseInt(document.getElementById('i-progresso').value) || 0, 
        status: document.getElementById('i-status').value, 
        texto: document.getElementById('i-texto').value, 
        responsavel: document.getElementById('i-responsavel').value, 
        subtarefas: subtarefasEditando 
    };
    
    if(id) {
        db.collection("tarefas").doc(id).update(obj); 
    } else {
        db.collection("tarefas").doc('T'+Date.now()).set(obj);
    }
    fecharModais();
}

function apagarTarefaAtual() {
    if(confirm("Deseja realmente excluir esta ação?")) { 
        db.collection("tarefas").doc(document.getElementById('i-id').value).delete(); 
        fecharModais(); 
    }
}

function renderizarListasConfig() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value) || Math.max(2026, dataSistema.year());
    document.getElementById('setup-title').innerText = `⚙️ Configurações do Banco (${selAno})`;

    let hP = '';
    projetosDoAno.forEach((p) => {
        hP += `<div class="item-row"><span>${p}</span><button class="btn-mini" onclick="removerP('${p}')">X</button></div>`;
    });
    document.getElementById('lista-projetos-config').innerHTML = hP || `<div style="padding:10px; color:#888; font-size:12px;">Nenhum projeto em ${selAno}.</div>`;
    
    let hA = '';
    projetosDoAno.forEach(p => {
        if(areasLocais[p]) {
            areasLocais[p].forEach((a, i) => {
                hA += `<div class="item-row"><span>[${p}] ${a}</span><button class="btn-mini" onclick="removerA('${p}',${i})">X</button></div>`;
            });
        }
    });
    document.getElementById('lista-areas-config').innerHTML = hA || `<div style="padding:10px; color:#888; font-size:12px;">Adicione projetos primeiro.</div>`;
    
    let s = document.getElementById('cfg-area-proj'); 
    s.innerHTML = '';
    projetosDoAno.forEach(p => s.innerHTML += `<option value="${p}">${p}</option>`);
}

function abrirModalConfig() { 
    renderizarListasConfig(); 
    document.getElementById('modal-config').style.display = 'flex'; 
}

function adicionarProjetoConfig() {
    const n = document.getElementById('cfg-novo-proj').value.toUpperCase().trim();
    const selAno = parseInt(document.getElementById('filtro-ano-view').value) || Math.max(2026, dataSistema.year());
    
    if(n) {
        if(!projetosGlobal[n]) projetosGlobal[n] = [];
        if(!projetosGlobal[n].includes(selAno)) projetosGlobal[n].push(selAno);
        if(!areasLocais[n]) areasLocais[n] = [];
        
        db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais, projetos: Object.keys(projetosGlobal) }, {merge: true}).then(() => {
            atualizarProjetosDoAno();
            if(document.getElementById('modal-config').style.display === 'flex') {
                renderizarListasConfig();
            }
        });
        document.getElementById('cfg-novo-proj').value = '';
    }
}

function removerP(n) {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value) || Math.max(2026, dataSistema.year());
    if(confirm(`Remover o projeto ${n} do ano de ${selAno}? (Ações salvas continuam no banco)`)) {
        projetosGlobal[n] = projetosGlobal[n].filter(y => y !== selAno);
        db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais, projetos: Object.keys(projetosGlobal) }, {merge: true}).then(() => {
            atualizarProjetosDoAno();
            if(document.getElementById('modal-config').style.display === 'flex') {
                renderizarListasConfig();
            }
        });
    }
}

function adicionarAreaConfig() {
    const p = document.getElementById('cfg-area-proj').value;
    const n = document.getElementById('cfg-nova-area').value.trim();
    if(p && n) {
        if(!areasLocais[p]) areasLocais[p] = [];
        if(!areasLocais[p].includes(n)) { 
            areasLocais[p].push(n); 
            areasLocais[p].sort(); 
        }
        db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais }, {merge:true}).then(() => {
            atualizarProjetosDoAno();
            if(document.getElementById('modal-config').style.display === 'flex') {
                renderizarListasConfig();
            }
        });
        document.getElementById('cfg-nova-area').value = '';
    }
}

function removerA(p, i) {
    areasLocais[p].splice(i, 1);
    db.collection("settings").doc("global").set({ projetosAnos: projetosGlobal, areas: areasLocais }, {merge:true}).then(() => {
        atualizarProjetosDoAno();
        if(document.getElementById('modal-config').style.display === 'flex') {
            renderizarListasConfig();
        }
    });
}

function exportarExcel() {
    const selAno = parseInt(document.getElementById('filtro-ano-view').value);
    const dIn = dayjs(`${selAno}-01-01`);
    const dFim = dayjs(`${selAno}-12-31`);
    let tAno = tarefas.filter(x => !(dayjs(x.fim).isBefore(dIn) || dayjs(x.inicio).isAfter(dFim)));
    
    if(tAno.length === 0) return alert(`Sem ações registradas em ${selAno}.`);
    
    let c = "\uFEFFID;Projeto;Setor;Ação;Início;Fim;%;Status;Responsável\n";
    tAno.forEach(t => {
        c += `${t.id};${t.projeto};${t.area};${(t.texto||'').replace(/;/g, ",")};${dayjs(t.inicio).format('DD/MM/YYYY')};${dayjs(t.fim).format('DD/MM/YYYY')};${t.progresso};${t.status};${t.responsavel||''}\n`;
    });
    
    let a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Cronograma_Motherson_${selAno}.csv`; 
    a.click();
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
    if (!pIn || !pFim || dayjs(pFim).isBefore(dayjs(pIn))) return alert("Datas de impressão inválidas.");
    
    fecharModais(); 
    renderizarGantt(pIn, pFim, `Período: ${dayjs(pIn).format('DD/MM/YY')} a ${dayjs(pFim).format('DD/MM/YY')}`);
    setTimeout(() => window.print(), 600);
}

window.onafterprint = () => gerarMatriz();
initTheme();