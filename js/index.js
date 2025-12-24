// CONFIGURACIÃ“N DE PDF.JS (Trabajador Web)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// --- LÃ“GICA DEL ANALIZADOR REAL ---
const dropZone = document.getElementById("dropZone");
const cvInput = document.getElementById("cvInput");

dropZone.addEventListener("click", () => cvInput.click());
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("dragover")
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
cvInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

async function handleFile(file) {
  if (file.type !== "application/pdf") {
    showToast("Por favor sube un archivo PDF vÃ¡lido");
    return;
  }

  // Interfaz de carga
  document.getElementById("dropZone").style.display = "none";
  document.getElementById("scanOverlay").style.display = "flex";
  document.getElementById("scanResult").style.display = "none";
  document.getElementById("scanStatus").innerText = "Leyendo texto del PDF...";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

    let fullText = "";
    // Leemos solo la primera pÃ¡gina para el anÃ¡lisis rÃ¡pido
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    fullText = textContent.items.map((item) => item.str).join(" ");

    analyzeText(fullText);
  } catch (error) {
    console.error(error);
    document.getElementById("scanOverlay").style.display = "none";
    document.getElementById("dropZone").style.display = "block";
    showToast("Error al leer el PDF. Intenta con otro.");
  }
}

function analyzeText(text) {
  document.getElementById("scanStatus").innerText =
    "Analizando palabras clave con IA...";

  setTimeout(() => {
    // ALGORITMO HEURÃSTICO (SIMULA IA BASADA EN REGLAS)
    const lowerText = text.toLowerCase();
    let score = 0;
    let findings = [];

    // 1. DetecciÃ³n de contacto
    const hasEmail = /@/.test(lowerText);
    const hasPhone = /\d{8,}/.test(lowerText.replace(/\s/g, "")); // Busca secuencia de nÃºmeros
    const hasLinkedIn = lowerText.includes("linkedin.com");

    if (hasEmail) {
      score += 15;
      findings.push({ type: "good", text: "Email detectado" });
    } else {
      findings.push({ type: "bad", text: "Falta Email de contacto" });
    }

    if (hasLinkedIn) {
      score += 15;
      findings.push({
        type: "good",
        text: "Perfil de LinkedIn vinculado",
      });
    } else {
      findings.push({
        type: "warn",
        text: "No encontramos enlace a LinkedIn",
      });
    }

    // 2. Secciones Clave (Busca palabras comunes de encabezados)
    const sections = [
      "experiencia",
      "experience",
      "educaciÃ³n",
      "education",
      "habilidades",
      "skills",
      "proyectos",
    ];
    let sectionsFound = 0;
    sections.forEach((sec) => {
      if (lowerText.includes(sec)) sectionsFound++;
    });

    if (sectionsFound >= 3) {
      score += 20;
      findings.push({
        type: "good",
        text: "Estructura de secciones clara",
      });
    } else {
      findings.push({
        type: "bad",
        text: "Estructura poco clara o faltan secciones",
      });
    }

    // 3. Palabras de AcciÃ³n/Liderazgo (Keywords)
    const powerWords = [
      "liderÃ©",
      "gestionÃ©",
      "desarrollÃ©",
      "aumentÃ©",
      "logrÃ©",
      "creÃ©",
      "equipo",
      "responsable",
      "analicÃ©",
    ];
    let powerCount = 0;
    powerWords.forEach((pw) => {
      if (lowerText.includes(pw)) powerCount++;
    });

    if (powerCount > 3) {
      score += 20;
      findings.push({ type: "good", text: "Uso de verbos de acciÃ³n" });
    } else {
      score += 5;
      findings.push({
        type: "warn",
        text: "Faltan verbos de impacto/acciÃ³n",
      });
    }

    // 4. Longitud
    if (text.length > 3000) {
      findings.push({
        type: "warn",
        text: "El texto parece muy extenso",
      });
      score += 5;
    } else if (text.length < 200) {
      findings.push({ type: "bad", text: "Contenido muy escaso" });
    } else {
      score += 15;
      findings.push({
        type: "good",
        text: "Longitud de contenido adecuada",
      });
    }

    // Factor aleatorio pequeÃ±o para que no sea estÃ¡tico siempre (VariaciÃ³n humana)
    score += Math.floor(Math.random() * 10);
    if (score > 100) score = 98; // Nadie es perfecto para vender el servicio

    // Renderizar resultados
    showResults(score, findings);
  }, 1500); // PequeÃ±a espera para dar sensaciÃ³n de proceso
}

function showResults(score, findings) {
  document.getElementById("scanOverlay").style.display = "none";
  document.getElementById("scanResult").style.display = "block";

  // AnimaciÃ³n de puntaje
  const scoreVal = document.getElementById("scoreValue");
  const scoreCircle = document.getElementById("scoreCircle");
  let current = 0;
  const interval = setInterval(() => {
    current++;
    scoreVal.innerText = current;
    if (current >= score) clearInterval(interval);
  }, 20);

  // Color del cÃ­rculo
  if (score < 50) scoreCircle.style.borderColor = "var(--danger)";
  else if (score < 75) scoreCircle.style.borderColor = "var(--accent-yellow)";
  else scoreCircle.style.borderColor = "var(--success)";

  // Lista de hallazgos
  const list = document.getElementById("resultList");
  list.innerHTML = "";
  findings.forEach((f) => {
    let icon =
      f.type === "good"
        ? "fa-check-circle"
        : f.type === "bad"
        ? "fa-times-circle"
        : "fa-exclamation-circle";
    list.innerHTML += `<div class="check-item ${f.type}"><i class="fas ${icon}"></i> ${f.text}</div>`;
  });

  // TÃ­tulo dinÃ¡mico
  const titles =
    score > 80
      ? "Â¡Tienes un CV SÃ³lido!"
      : score > 50
      ? "Buen inicio, pero mejorable"
      : "Tu CV necesita ayuda urgente";
  document.getElementById("resultTitle").innerText = titles;
}

// --- FUNCIONES GENERALES ---
function showToast(msg) {
  const container = document.getElementById("notificationContainer");
  const toast = document.createElement("div");
  toast.className = "toast show";
  toast.innerHTML = `<i class="fas fa-info-circle"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Agregar al carrito - SIMPLE: siempre usa temp_cart
function addToCart(id, name, price, icon) {
  try {
    let cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
    let existingItem = cart.find((item) => item.id === id);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ id, name, price, icon, quantity: 1 });
    }

    localStorage.setItem("temp_cart", JSON.stringify(cart));
    updateCartCounter();
    showToast(`${name} añadido al carrito`);
    console.log(
      "✅ Producto agregado:",
      name,
      "| Carrito:",
      cart.length,
      "items"
    );
  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    showToast(`Error al agregar producto`);
  }
}

function updateCartCounter() {
  try {
    let cart = JSON.parse(localStorage.getItem("temp_cart") || "[]");
    let total = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);
    const badge = document.getElementById("cart-count");
    if (badge) {
      badge.innerText = total;
      badge.style.display = total === 0 ? "none" : "flex";
    }
  } catch (error) {
    console.error("❌ Error updating counter:", error);
  }
}

const navLinks = document.querySelectorAll(".nav-links a");
const homeLink = document.querySelector('.nav-links a[href="index.html"]');
const analyzerLink = document.querySelector('.nav-links a[href="#analyzer"]');

// Scroll Navbar & Active Link Highlighting
const sections = document.querySelectorAll("section[id]");

window.addEventListener("scroll", function () {
  var navbar = document.getElementById("navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }

  let currentSectionId = "";
  const scrollY = window.pageYOffset;

  if (scrollY < sections[0].offsetTop - 100) {
    currentSectionId = "home";
  } else {
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 100; // Adjusted for navbar height
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute("id");

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentSectionId = sectionId;
      }
    });
  }

  navLinks.forEach((link) => {
    link.classList.remove("active");
  });

  if (currentSectionId === "analyzer") {
    if (analyzerLink) {
      analyzerLink.classList.add("active");
    }
  } else {
    if (homeLink) {
      homeLink.classList.add("active");
    }
  }
});

// Mobile Menu
const menuToggle = document.querySelector(".menu-toggle");
const navLinksContainer = document.querySelector(".nav-links");
menuToggle.addEventListener("click", () => {
  navLinksContainer.classList.toggle("active");
  menuToggle.querySelector("i").classList.toggle("fa-bars");
  menuToggle.querySelector("i").classList.toggle("fa-times");
});
function closeMenu() {
  navLinksContainer.classList.remove("active");
  menuToggle.querySelector("i").classList.add("fa-bars");
  menuToggle.querySelector("i").classList.remove("fa-times");
}

// Inicializar Carrito
document.addEventListener("DOMContentLoaded", updateCartCounter);

// Animaciones de Scroll
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);
document.querySelectorAll(".card").forEach((card) => observer.observe(card));

// Parallax
if (window.innerWidth > 768) {
  document.addEventListener("mousemove", (e) => {
    const x = (window.innerWidth - e.pageX) / 50;
    const y = (window.innerHeight - e.pageY) / 50;
    const hero = document.getElementById("heroContent");
    if (hero) hero.style.transform = `translate(${x}px, ${y}px)`;
  });
}
