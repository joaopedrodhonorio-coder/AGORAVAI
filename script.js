// Interações do site

// -----------------------------
// JANELA DOS PROJETOS
// -----------------------------
function mostrarProjeto(titulo, texto) {
    const modal = document.querySelector("#modal");
    const modalTitulo = document.querySelector("#modalTitulo");
    const modalTexto = document.querySelector("#modalTexto");

    modalTitulo.textContent = titulo;
    modalTexto.textContent = texto;
    modal.classList.add("aberto");
}

function fecharProjeto() {
    const modal = document.querySelector("#modal");
    modal.classList.remove("aberto");
}

const modal = document.querySelector("#modal");
if (modal) {
    modal.addEventListener("click", function (evento) {
        if (evento.target === this) fecharProjeto();
    });
}

// -----------------------------
// DIÁRIO INTERATIVO
// -----------------------------
const abrirEditor = document.querySelector("#abrirEditor");
const editorConteudo = document.querySelector("#editorConteudo");
const resumoTrabalho = document.querySelector("#resumoTrabalho");
const fotoInput = document.querySelector("#fotoInput");
const videoInput = document.querySelector("#videoInput");
const fotoTexto = document.querySelector("#fotoTexto");
const videoTexto = document.querySelector("#videoTexto");
const cancelarTrabalho = document.querySelector("#cancelarTrabalho");
const registrarTrabalho = document.querySelector("#registrarTrabalho");
const listaTrabalhos = document.querySelector("#listaTrabalhos");

let numeroTrabalho = 1;
let fotoSelecionada = null;
let videoSelecionado = null;

// IndexedDB guarda as fotos e vídeos sem depender do limite pequeno do localStorage.
const DB_NAME = "turingDiarioDB";
const DB_VERSION = 1;
const STORE_NAME = "midias";

function abrirBanco() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB não disponível"));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function () {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function salvarMidia(id, arquivo) {
    if (!arquivo) return;
    const db = await abrirBanco();

    return new Promise((resolve, reject) => {
        const transacao = db.transaction(STORE_NAME, "readwrite");
        transacao.objectStore(STORE_NAME).put(arquivo, id);
        transacao.oncomplete = () => {
            db.close();
            resolve();
        };
        transacao.onerror = () => {
            db.close();
            reject(transacao.error);
        };
    });
}

async function buscarMidia(id) {
    if (!id) return null;

    try {
        const db = await abrirBanco();
        return await new Promise((resolve, reject) => {
            const request = db.transaction(STORE_NAME, "readonly")
                .objectStore(STORE_NAME)
                .get(id);

            request.onsuccess = () => {
                db.close();
                resolve(request.result || null);
            };
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    } catch {
        return null;
    }
}

function lerTrabalhos() {
    try {
        return JSON.parse(localStorage.getItem("turingTrabalhos") || "[]");
    } catch {
        return [];
    }
}

function salvarTrabalhos(trabalhos) {
    localStorage.setItem("turingTrabalhos", JSON.stringify(trabalhos));
}

function atualizarBotao() {
    abrirEditor.textContent = `+ Adicionar resumo do trabalho ${numeroTrabalho}`;
}

function abrirEditorDiario() {
    editorConteudo.hidden = false;
    abrirEditor.hidden = true;
    resumoTrabalho.focus();
}

function limparEditor() {
    resumoTrabalho.value = "";
    fotoInput.value = "";
    videoInput.value = "";
    fotoSelecionada = null;
    videoSelecionado = null;
    fotoTexto.textContent = "Adicionar foto";
    videoTexto.textContent = "Adicionar vídeo";
}

function cancelarEdicao() {
    limparEditor();
    editorConteudo.hidden = true;
    abrirEditor.hidden = false;
}

function criarCardTrabalho(trabalho) {
    const card = document.createElement("article");
    card.className = "diario-trabalho";

    const numero = document.createElement("span");
    numero.className = "diario-trabalho-numero";
    numero.textContent = `TRABALHO ${trabalho.numero}`;

    const titulo = document.createElement("h3");
    titulo.textContent = `Trabalho ${trabalho.numero}`;

    const texto = document.createElement("p");
    texto.className = "diario-trabalho-texto";
    texto.textContent = trabalho.resumo;

    card.append(numero, titulo, texto);

    const midias = document.createElement("div");
    midias.className = "diario-trabalho-midias";

    if (trabalho.fotoId) {
        buscarMidia(trabalho.fotoId).then((arquivo) => {
            if (!arquivo) return;
            const imagem = document.createElement("img");
            imagem.alt = `Foto do trabalho ${trabalho.numero}`;
            imagem.src = URL.createObjectURL(arquivo);
            midias.appendChild(imagem);
        });
    }

    if (trabalho.videoId) {
        buscarMidia(trabalho.videoId).then((arquivo) => {
            if (!arquivo) return;
            const video = document.createElement("video");
            video.controls = true;
            video.preload = "metadata";
            video.src = URL.createObjectURL(arquivo);
            midias.appendChild(video);
        });
    }

    if (trabalho.fotoId || trabalho.videoId) card.appendChild(midias);
    listaTrabalhos.appendChild(card);
}

async function carregarTrabalhos() {
    const trabalhos = lerTrabalhos();
    listaTrabalhos.innerHTML = "";

    trabalhos.forEach(criarCardTrabalho);
    numeroTrabalho = trabalhos.length + 1;
    atualizarBotao();
}

async function registrar() {
    const resumo = resumoTrabalho.value.trim();

    if (!resumo) {
        resumoTrabalho.focus();
        resumoTrabalho.placeholder = "Escreva o resumo antes de registrar...";
        return;
    }

    const trabalho = {
        numero: numeroTrabalho,
        resumo,
        fotoId: fotoSelecionada ? `foto-${Date.now()}-${Math.random()}` : null,
        videoId: videoSelecionado ? `video-${Date.now()}-${Math.random()}` : null
    };

    // Primeiro guarda as mídias. Se der algum problema, ainda podemos registrar o texto.
    try {
        if (fotoSelecionada) await salvarMidia(trabalho.fotoId, fotoSelecionada);
        if (videoSelecionado) await salvarMidia(trabalho.videoId, videoSelecionado);
    } catch (erro) {
        console.warn("Não foi possível guardar uma das mídias:", erro);
    }

    const trabalhos = lerTrabalhos();
    trabalhos.push(trabalho);
    salvarTrabalhos(trabalhos);

    criarCardTrabalho(trabalho);
    numeroTrabalho++;
    atualizarBotao();
    cancelarEdicao();
}

if (abrirEditor) abrirEditor.addEventListener("click", abrirEditorDiario);
if (cancelarTrabalho) cancelarTrabalho.addEventListener("click", cancelarEdicao);
if (registrarTrabalho) registrarTrabalho.addEventListener("click", registrar);

if (fotoInput) {
    fotoInput.addEventListener("change", function () {
        fotoSelecionada = this.files[0] || null;
        fotoTexto.textContent = fotoSelecionada ? fotoSelecionada.name : "Adicionar foto";
    });
}

if (videoInput) {
    videoInput.addEventListener("change", function () {
        videoSelecionado = this.files[0] || null;
        videoTexto.textContent = videoSelecionado ? videoSelecionado.name : "Adicionar vídeo";
    });
}

// Enter registra. Shift + Enter permite quebrar linha no resumo.
if (resumoTrabalho) {
    resumoTrabalho.addEventListener("keydown", function (evento) {
        if (evento.key === "Enter" && !evento.shiftKey) {
            evento.preventDefault();
            registrar();
        }
    });
}

if (abrirEditor) {
    carregarTrabalhos();
}
