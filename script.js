// --- Configuración del test ---
const TOTAL_RONDAS = 20;
const DURACION_RONDA_MS = 500; // 500 ms por ronda
const VOCALES = ["A","E","I","O","U"];
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CONSONANTES = ALFABETO.filter(l => !VOCALES.includes(l));

// --- Elementos del DOM ---
const pantallaInicio = document.getElementById("pantalla-inicio");
const pantallaJuego = document.getElementById("pantalla-juego");
const pantallaResultados = document.getElementById("pantalla-resultados");

const btnComenzar = document.getElementById("btn-comenzar");
const btnReiniciar = document.getElementById("btn-reiniciar");

const indicadorRonda = document.getElementById("indicador-ronda");
const cronometro = document.getElementById("cronometro");
const zonaClic = document.getElementById("zona-clic");
const letraEl = document.getElementById("letra");
const barraProgreso = document.getElementById("barra-progreso");
const emojiFeedback = document.getElementById("emoji-feedback");

const cuerpoTabla = document.getElementById("cuerpo-tabla");

// --- Estado ---
let ronda = 0;
let letraActual = "";
let inicioRonda = 0;
let clicRegistrado = false;
let timeoutRonda = null;
let secuencia = [];
const resultados = []; // { ronda, letra, correcto, tiempoMs | "Sin respuesta" }

// --- Utilidades ---
const esVocal = (ch) => VOCALES.includes(ch);
const aleatoria = (arr) => arr[Math.floor(Math.random()*arr.length)];

// Genera secuencia equilibrada: 10 vocales + 10 consonantes, embarajadas
function prepararSecuencia() {
  const vocalesRandom = Array.from({length:10}, () => aleatoria(VOCALES));
  const consonantesRandom = Array.from({length:10}, () => aleatoria(CONSONANTES));
  const mezcladas = vocalesRandom.concat(consonantesRandom);

  // Fisher–Yates shuffle
  for (let i = mezcladas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mezcladas[i], mezcladas[j]] = [mezcladas[j], mezcladas[i]];
  }
  return mezcladas;
}

// --- Inicio del test ---
btnComenzar.addEventListener("click", () => {
  resultados.length = 0;
  ronda = 0;
  secuencia = prepararSecuencia();
  pantallaInicio.classList.add("hidden");
  pantallaResultados.classList.add("hidden");
  pantallaJuego.classList.remove("hidden");
  siguienteRonda();
});

// --- Reinicio ---
btnReiniciar.addEventListener("click", () => {
  cuerpoTabla.innerHTML = "";
  pantallaResultados.classList.add("hidden");
  pantallaInicio.classList.remove("hidden");
});

// --- Lógica de cada ronda ---
function siguienteRonda(){
  if (ronda >= TOTAL_RONDAS) {
    finalizar();
    return;
  }

  letraActual = secuencia[ronda];
  ronda++;
  indicadorRonda.textContent = `Ronda ${ronda}/${TOTAL_RONDAS}`;
  cronometro.textContent = `${(DURACION_RONDA_MS/1000).toFixed(1)} s`;

  letraEl.textContent = letraActual;

  clicRegistrado = false;
  zonaClic.classList.remove("flash-ok","flash-err");

  // Reinicia barra de tiempo
  barraProgreso.style.animation = "none";
  barraProgreso.offsetHeight;
  barraProgreso.style.animation = `drain ${DURACION_RONDA_MS}ms linear forwards`;

  // Inicio de temporizador
  requestAnimationFrame(() => {
    inicioRonda = performance.now();

    window.addEventListener("click", onClick, { once: true });

    timeoutRonda = setTimeout(() => {
      if (!clicRegistrado) {
        window.removeEventListener("click", onClick);
        registrarSinClic();
      }
    }, DURACION_RONDA_MS);
  });
}

// --- Manejo del clic ---
function onClick(){
  if (clicRegistrado) return;
  clicRegistrado = true;
  const tiempo = performance.now() - inicioRonda;
  clearTimeout(timeoutRonda);

  const correcto = esVocal(letraActual);

  resultados.push({
    ronda,
    letra: letraActual,
    correcto,
    tiempo: correcto ? tiempo.toFixed(2) : "Sin respuesta"
  });

  mostrarEmoji(correcto);
  flashResultado(correcto);
  avanzarTrasBrevePausa();
}

// --- Sin clic en la ronda ---
function registrarSinClic(){
  const correcto = !esVocal(letraActual);
  resultados.push({
    ronda,
    letra: letraActual,
    correcto,
    tiempo: "Sin respuesta"
  });

  mostrarEmoji(correcto);
  flashResultado(correcto);
  avanzarTrasBrevePausa();
}

// --- Mostrar emoji ---
function mostrarEmoji(correcto){
  emojiFeedback.textContent = correcto ? "✅" : "❌";
  emojiFeedback.classList.add("show");
  emojiFeedback.classList.remove("hidden");
  setTimeout(() => {
    emojiFeedback.classList.remove("show");
    emojiFeedback.classList.add("hidden");
  }, 1000);
}

// --- Feedback visual ---
function flashResultado(correcto){
  zonaClic.classList.remove("flash-ok","flash-err");
  zonaClic.classList.add(correcto ? "flash-ok" : "flash-err");
}

// --- Pausa breve antes de siguiente ronda ---
function avanzarTrasBrevePausa(){
  setTimeout(() => {
    siguienteRonda();
  }, 1000); // ahora espera 1s para mostrar el emoji
}

// --- Finalización ---
function finalizar(){
  window.removeEventListener("click", onClick);
  clearTimeout(timeoutRonda);
  pantallaJuego.classList.add("hidden");
  pantallaResultados.classList.remove("hidden");

  cuerpoTabla.innerHTML = resultados.map(res => `
    <tr>
      <td>${res.ronda}</td>
      <td>${res.letra}</td>
      <td>${res.correcto ? "✅" : "❌"}</td>
      <td>${res.tiempo}</td>
    </tr>
  `).join("");

  const tiemposValidos = resultados
    .filter(r => r.tiempo !== "Sin respuesta" && r.correcto)
    .map(r => parseFloat(r.tiempo))
    .filter(t => !isNaN(t));

  if (tiemposValidos.length > 0) {
    const media = (tiemposValidos.reduce((a,b) => a+b, 0)/tiemposValidos.length).toFixed(2);
    cuerpoTabla.innerHTML += `
      <tr style="font-weight:bold; background:#eef;">
        <td colspan="3">Media de tiempos (solo respuestas correctas)</td>
        <td>${media} ms</td>
      </tr>
    `;
  }
}

// --- Animación CSS para la barra ---
const style = document.createElement("style");
style.textContent = `
@keyframes drain {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}`;
document.head.appendChild(style);
