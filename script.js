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

// Ativa persistência offline para evitar perda em quedas de sinal
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') console.log("Persistência falhou: multiplas abas abertas.");
    else if (err.code == 'unimplemented') console.log("Browser não suporta persistência.");
});

const dataSistema = dayjs();
const HOJE = dataSistema.format('YYYY-MM-DD');
const FERIADOS = ['2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-05-01', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-12-25'];

let configGeral = {};
let projetosLocais = [];
let areasLocais = {};
let tarefas = [];
let sincronizado = false;

function calcularCW(d) {
    let date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    let firstDayOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    let pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
}

const CW_ATUAL = calcularCW(dataSistema.toDate());

// Carregamento de Configurações
db.collection("settings").doc("global").onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        configGeral = data.config;
        projetosLocais = data.projetos;
        areasLocais = data.areas;
        sincronizado = true;
        renderizarApp();
    } else {
        // Inicialização padrão se o banco estiver zerado
        let defaultCfg = { dataInicio: dayjs().startOf('year').format('YYYY-MM-DD'), dataFim: dayjs().endOf('year').format('YYYY-MM-DD') };
        let defaultProj = ['UDARA', 'GEELY'];
        let defaultArea = { 'UDARA': ['Injeção'], 'GEELY': ['Montagem'] };
        db.collection("settings").doc("global").set({ config: defaultCfg, projetos: defaultProj, areas: defaultArea });
    }
});

// Carregamento de Tarefas (Removida migração automática perigosa)
db.collection("tarefas").onSnapshot((snap) => {
    tarefas = [];
    snap.forEach(doc => {
        tarefas.push({ id: doc.id, ...doc.data() });
    });
    if(sincronizado) gerarMatriz();
});

function renderizarApp() {
    document.getElementById('data-header').innerText = `Atualizado: ${dataSistema.format('DD/MM/YYYY')} | CW${CW_ATUAL} | 🟢 Online`;
    atualizarSelects();
    gerarMatriz();
    setTimeout(() => { irParaHoje(false); }, 500);
}

function atualizarSelects() {
    let sP = document.getElementById('i-projeto');
    let vP = document.getElementById('filtro-proj-view');
    if(!sP || !vP) return;
    
    sP.innerHTML = '';
    vP.innerHTML = '<option value="ALL">Todos os Projetos</option>';
    
    projetosLocais.forEach(p => {
        sP.innerHTML += `<option value="${p}">${p}</option>`;
        vP.innerHTML += `<option value="${p}">${p}</option>`;
    });
    atualizarAreasDoModalAcao();
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
    let unicas = new Set();
    if(vP === "ALL") {
        Object.values(areasLocais).forEach(l => l.forEach(a => unicas.add(a)));
    } else if(areasLocais[vP]) {
        areasLocais[vP].forEach(a => unicas.add(a));
    }
    unicas.forEach(a => vA.innerHTML += `<option value="${a}">${a}</option>`);
}

function gerarMatriz() {
    if(!configGeral.dataInicio) return;
    const d1 = dayjs(configGeral.dataInicio);
    const d2 = dayjs(configGeral.dataFim);
    const DIAS = d2.diff(d1, 'day') + 1;
    if(DIAS <= 0 || DIAS > 1000) return;
    
    let diasArr = [];
    for(let i=0; i<DIAS; i++) {
        let d = d1.add(i, 'day');
        diasArr.push({ ds: d.format('YYYY-MM-DD'), d: d.date(), m: d.format('MMMM'), s: d.day(), cw: calcularCW(d.toDate()) });
    }
    
    let pF = document.getElementById('filtro-proj-view').value;
    let aF = document.getElementById('filtro-area-view').value;
    let projs = pF === "ALL" ? projetosLocais : [pF];

    let h = `<table><thead><tr class="head-mes"><th class="col-proj"></th><th class="col-area">CRONOGRAMA</th>`;
    let mC = 1;
    for(let i=1; i<diasArr.length; i++) {
        if(diasArr[i].m === diasArr[i-1].m) mC++;
        else { h += `<th colspan="${mC}">${diasArr[i-1].m.substring(0,3).toUpperCase()}</th>`; mC = 1; }
    }
    h += `<th colspan="${mC}">${diasArr[diasArr.length-1].m.substring(0,3).toUpperCase()}</th></tr>`;

    h += `<tr class="head-cw"><th class="col-proj"></th><th class="col-area">CW</th>`;
    let cwCont = 1;
    for(let i=1; i<diasArr.length; i++) {
        if(diasArr[i].cw === diasArr[i-1].cw) cwCont++;
        else {
            let st = diasArr[i-1].cw === CW_ATUAL ? 'background:#ffd54f; font-weight:900; color:#b71c1c;' : '';
            h += `<th colspan="${cwCont}" style="${st}">CW ${diasArr[i-1].cw}</th>`; cwCont = 1; 
        }
    }
    let stLast = diasArr[diasArr.length-1].cw === CW_ATUAL ? 'background:#ffd54f; font-weight:900; color:#b71c1c;' : '';
    h += `<th colspan="${cwCont}" style="${stLast}">CW ${diasArr[diasArr.length-1].cw}</th></tr>`;

    h += `<tr class="head-dia"><th class="col-proj">PROJETO</th><th class="col-area">SETOR / ÁREA</th>`;
    diasArr.forEach(d => {
        let cl = (d.s === 0 || d.s === 6) ? 'is-weekend' : '';
        if(FERIADOS.includes(d.ds)) cl += ' is-holiday';
        if(d.cw === CW_ATUAL) cl += ' is-current-cw';
        if(d.ds === HOJE) cl += ' is-today';
        h += `<th class="${cl}">${d.d}</th>`;
    });
    h += `</tr></thead><tbody>`;

    projs.forEach(p => {
        let areas = areasLocais[p] || [];
        let exibe = aF === "ALL" ? areas : areas.filter(a => a === aF);
        if(exibe.length === 0) {
            h += `<tr><td class="col-proj">${p}</td><td class="col-area">Sem áreas</td><td colspan="${diasArr.length}"></td></tr>`;
        } else {
            exibe.forEach((areaNome) => {
                let tarefasArea = tarefas.filter(x => x.projeto === p && x.area === areaNome);
                tarefasArea.sort((a,b) => dayjs(a.inicio).diff(dayjs(b.inicio)));
                let trilhas = [];
                tarefasArea.forEach(t => {
                    let encaixado = false;
                    for(let i=0; i<trilhas.length; i++){
                        let last = trilhas[i][trilhas[i].length-1];
                        if(dayjs(t.inicio).isAfter(dayjs(last.fim))) { trilhas[i].push(t); encaixado = true; break; }
                    }
                    if(!encaixado) trilhas.push([t]);
                });
                if(trilhas.length === 0) trilhas = [[]];

                trilhas.forEach((trilha, tIdx) => {
                    h += `<tr>`;
                    if(tIdx === 0) {
                        h += `<td rowspan="${trilhas.length}" class="col-proj">${p}</td>`;
                        h += `<td rowspan="${trilhas.length}" class="col-area">${areaNome}</td>`;
                    }
                    diasArr.forEach(d => {
                        let cl = (d.s === 0 || d.s === 6) ? 'is-weekend' : '';
                        if(d.cw === CW_ATUAL) cl += ' is-current-cw';
                        if(d.ds === HOJE) cl += ' is-today';
                        let t = trilha.find(x => x.inicio === d.ds);
                        h += `<td class="${cl}" ondragover="allowDrop(event)" ondrop="dropTask(event,'${p}','${areaNome}','${d.ds}')">`;
                        if(t){
                            let dur = dayjs(t.fim).diff(dayjs(t.inicio), 'day') + 1;
                            h += `<div class="task-wrapper" style="width:calc(${dur*100}% + ${dur-1}px);" draggable="true" ondragstart="dragStart(event,'${t.id}')" onclick="abrirModalAcao('${t.id}')" onmousemove="showTooltip(event,'${t.id}')" onmouseleave="hideTooltip()">
                                    <div class="task-bar ${t.status}"><div class="progress-fill" style="width:${t.progresso}%"></div></div>
                                    <div class="task-label">${t.texto}</div>
                                  </div>`;
                        }
                        h += `</td>`;
                    });
                    h += `</tr>`;
                });
            });
        }
        h += `<tr><td colspan="${diasArr.length+2}" style="height:3px; background:#666; border:none;"></td></tr>`;
    });
    document.getElementById('gantt-container').innerHTML = h + `</tbody></table>`;
}

function irParaHoje(alerta = true) {
    const c = document.getElementById('gantt-container');
    const t = document.querySelector('th.is-today');
    if (t) {
        c.scrollTo({ left: t.offsetLeft - (window.innerWidth < 600 ? 140 : 250), behavior: 'smooth' });
    } else if(alerta) alert("Data de hoje fora do intervalo.");
}

function showTooltip(e, id) {
    if(window.innerWidth < 600) return;
    let t = tarefas.find(x => x.id === id);
    if(!t) return;
    let el = document.getElementById('custom-tooltip');
    let st = t.status === 'informativo' ? 'Operacional' : t.status === 'suporte' ? 'Suporte' : 'Milestone';
    el.innerHTML = `<strong>${t.texto}</strong><br>Resp: ${t.responsavel || '-'}<br>Status: ${st}<br>Progresso: ${t.progresso}%<br>Fim: ${dayjs(t.fim).format('DD/MM/YY')}`;
    el.style.display = 'block'; el.style.left = (e.pageX + 15) + 'px'; el.style.top = (e.pageY + 15) + 'px';
}

function hideTooltip() { document.getElementById('custom-tooltip').style.display = 'none'; }
function dragStart(e, id) { e.dataTransfer.setData("text", id); }
function allowDrop(e) { e.preventDefault(); }
function dropTask(e, p, a, d) {
    e.preventDefault();
    let id = e.dataTransfer.getData("text");
    let t = tarefas.find(x => x.id === id);
    if(t) {
        let dur = dayjs(t.fim).diff(dayjs(t.inicio), 'day');
        db.collection("tarefas").doc(id).update({ inicio: d, fim: dayjs(d).add(dur, 'day').format('YYYY-MM-DD'), area: a, projeto: p });
    }
}

function fecharModais() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }

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
        document.getElementById('i-status').value = t.status;
        document.getElementById('i-texto').value = t.texto;
        document.getElementById('i-responsavel').value = t.responsavel;
        document.getElementById('btn-excluir').style.display = 'block';
    } else {
        document.getElementById('i-inicio').value = HOJE;
        document.getElementById('i-fim').value = HOJE;
        document.getElementById('i-progresso').value = 0;
        document.getElementById('i-texto').value = '';
        document.getElementById('btn-excluir').style.display = 'none';
    }
    document.getElementById('modal-acao').style.display = 'flex';
}

function salvarTarefa() {
    let id = document.getElementById('i-id').value;
    let t = {
        projeto: document.getElementById('i-projeto').value,
        area: document.getElementById('i-area').value,
        inicio: document.getElementById('i-inicio').value,
        fim: document.getElementById('i-fim').value,
        progresso: parseInt(document.getElementById('i-progresso').value) || 0,
        status: document.getElementById('i-status').value,
        texto: document.getElementById('i-texto').value,
        responsavel: document.getElementById('i-responsavel').value
    };
    if(!t.projeto || !t.area) return alert("Erro: Selecione Projeto e Área.");
    if(id) db.collection("tarefas").doc(id).update(t);
    else db.collection("tarefas").add(t);
    fecharModais();
}

function apagarTarefaAtual() {
    let id = document.getElementById('i-id').value;
    if(confirm("Excluir ação permanentemente?")) {
        db.collection("tarefas").doc(id).delete();
        fecharModais();
    }
}

function abrirModalConfig() {
    document.getElementById('cfg-inicio').value = configGeral.dataInicio;
    document.getElementById('cfg-fim').value = configGeral.dataFim;
    let s = document.getElementById('cfg-area-proj');
    s.innerHTML = '';
    projetosLocais.forEach(p => s.innerHTML += `<option value="${p}">${p}</option>`);
    renderizarListasConfig();
    document.getElementById('modal-config').style.display = 'flex';
}

function renderizarListasConfig() {
    let hP = '';
    projetosLocais.forEach((p, i) => hP += `<div class="item-row"><span>${p}</span><button class="btn-mini" onclick="removerP(${i},'${p}')">X</button></div>`);
    document.getElementById('lista-projetos-config').innerHTML = hP;
    let hA = '';
    projetosLocais.forEach(p => {
        if(areasLocais[p]) areasLocais[p].forEach((a, i) => hA += `<div class="item-row"><span>[${p}] ${a}</span><button class="btn-mini" onclick="removerA('${p}',${i})">X</button></div>`);
    });
    document.getElementById('lista-areas-config').innerHTML = hA;
}

function adicionarProjetoConfig() {
    let n = document.getElementById('cfg-novo-proj').value.toUpperCase().trim();
    if(n && !projetosLocais.includes(n)) {
        projetosLocais.push(n); areasLocais[n] = [];
        document.getElementById('cfg-novo-proj').value = '';
        renderizarListasConfig();
        atualizarSelects();
    }
}

function removerP(i, n) {
    if(confirm(`Remover projeto ${n}?`)) {
        projetosLocais.splice(i, 1); delete areasLocais[n];
        renderizarListasConfig();
    }
}

function adicionarAreaConfig() {
    let p = document.getElementById('cfg-area-proj').value;
    let n = document.getElementById('cfg-nova-area').value.trim();
    if(p && n) {
        if(!areasLocais[p]) areasLocais[p] = [];
        if(!areasLocais[p].includes(n)) {
            areasLocais[p].push(n);
            document.getElementById('cfg-nova-area').value = '';
            renderizarListasConfig();
        }
    }
}

function removerA(p, i) { areasLocais[p].splice(i, 1); renderizarListasConfig(); }

function salvarConfiguracoes() {
    configGeral.dataInicio = document.getElementById('cfg-inicio').value;
    configGeral.dataFim = document.getElementById('cfg-fim').value;
    db.collection("settings").doc("global").set({ config: configGeral, projetos: projetosLocais, areas: areasLocais }).then(fecharModais);
}

function exportarExcel() {
    if(tarefas.length === 0) return;
    let c = "\uFEFFID;Projeto;Setor;Início;Fim;%;Status;Resp;Descrição\n";
    tarefas.forEach(t => c += `${t.id};${t.projeto};${t.area};${dayjs(t.inicio).format('DD/MM/YYYY')};${dayjs(t.fim).format('DD/MM/YYYY')};${t.progresso};${t.status};${t.responsavel};${(t.texto||'').replace(/;/g, ",")}\n`);
    let a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Cronograma_Industrial.csv`; a.click();
}