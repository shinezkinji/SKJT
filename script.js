// Data Modul Keamanan Jaringan
const securityModules = [
  {
    num: "01 / 03",
    tag: "MODULE 01 // HARDWARE FIREWALL",
    title: "FIREWALL PERIMETER",
    subtitle: "Garda Terdepan Lalu Lintas Jaringan",
    video: "assets/video1.mp4",
    themeColor: "#00f3ff",
    desc: "Firewall bertindak sebagai pos pemeriksaan keamanan antara jaringan internal yang tepercaya dan internet publik. Mengatur port, menyaring paket (packet filtering), dan memblokir akses ilegal sebelum masuk ke infrastruktur.",
    features: [
      { title: "Hardware Packet Filtering", desc: "Menganalisis header IP, port, dan protokol dengan kecepatan tinggi." },
      { title: "Network Isolation & NAT", desc: "Menyembunyikan topologi IP internal dari pemindaian luar." }
    ]
  },
  {
    num: "02 / 03",
    tag: "MODULE 02 // IDS & IPS ENGINE",
    title: "IDS / IPS MONITORING",
    subtitle: "Deteksi & Pencegahan Intrusi Real-Time",
    video: "assets/video2.mp4",
    themeColor: "#ff0055",
    desc: "Intrusion Detection System (IDS) menganalisis traffic jaringan untuk pola serangan mencurigakan, sedangkan Intrusion Prevention System (IPS) langsung memutus koneksi berbahaya secara otomatis.",
    features: [
      { title: "Anomaly & Signature Detection", desc: "Mendeteksi serangan DDoS, port scanning, dan eksploitasi zero-day." },
      { title: "Automated Threat Neutralization", desc: "Memblokir IP penyerang secara instan saat pelanggaran terdeteksi." }
    ]
  },
  {
    num: "03 / 03",
    tag: "MODULE 03 // ANTIMALWARE & ENDPOINT",
    title: "ANTIMALWARE SYSTEM",
    subtitle: "Proteksi Enkripsi & Integritas Data",
    video: "assets/video3.mp4",
    themeColor: "#00ff66",
    desc: "Sistem pengamanan tingkat dalam yang berfokus membasmi program jahat (Trojan, Ransomware, Spyware) serta memastikan transmisi data tetap terenkripsi dan terproteksi dari kebocoran.",
    features: [
      { title: "Heuristic Behavioral Scan", desc: "Mengidentifikasi kode berbahaya berdasarkan pola perilaku software." },
      { title: "Cryptographic Protection", desc: "Menjaga integritas data penting dari penyusupan dan ransomware." }
    ]
  }
];

let currentIndex = 0;
let autoSlideTimer = null;
let countdown = 10;
let isPaused = false;

// DOM Elements
const videoEl = document.getElementById("cyber-video");
const videoSource = document.getElementById("video-source");
const videoTag = document.getElementById("video-tag");
const modNum = document.getElementById("mod-num");
const modTitle = document.getElementById("mod-title");
const modSub = document.getElementById("mod-sub");
const modDesc = document.getElementById("mod-desc");
const modFeatures = document.getElementById("mod-features");
const indicators = document.querySelectorAll(".indicator");
const timerText = document.getElementById("timer-count");
const pauseBtn = document.getElementById("pause-btn");
const cardGlow = document.getElementById("info-card");

// Fungsi Render Slide
function renderSlide(index) {
  const data = securityModules[index];

  // Efek transisi halus UI
  cardGlow.style.opacity = "0";
  cardGlow.style.transform = "translateY(15px)";
  videoEl.style.opacity = "0";

  setTimeout(() => {
    // Update Video
    videoSource.src = data.video;
    videoEl.load();
    videoEl.play();
    videoTag.innerText = data.tag;
    videoTag.style.borderColor = data.themeColor;
    videoTag.style.color = data.themeColor;

    // Update Content
    modNum.innerText = data.num;
    modNum.style.color = data.themeColor;
    modTitle.innerText = data.title;
    modSub.innerText = data.subtitle;
    modDesc.innerText = data.desc;

    // Update Features
    modFeatures.innerHTML = data.features.map(f => `
      <div class="feature-item" style="border-left-color: ${data.themeColor}">
        <div class="feat-icon" style="color: ${data.themeColor}">&#9670;</div>
        <div>
          <strong>${f.title}</strong>
          <p>${f.desc}</p>
        </div>
      </div>
    `).join("");

    // Update Indicators
    indicators.forEach((ind, i) => {
      ind.classList.toggle("active", i === index);
      if (i === index) ind.style.background = data.themeColor;
      else ind.style.background = "rgba(255, 255, 255, 0.2)";
    });

    // Fade in
    cardGlow.style.opacity = "1";
    cardGlow.style.transform = "translateY(0)";
    videoEl.style.opacity = "1";
  }, 250);

  countdown = 10;
}

// Navigasi Next & Prev
function nextSlide() {
  currentIndex = (currentIndex + 1) % securityModules.length;
  renderSlide(currentIndex);
}

function prevSlide() {
  currentIndex = (currentIndex - 1 + securityModules.length) % securityModules.length;
  renderSlide(currentIndex);
}

document.getElementById("next-btn").addEventListener("click", nextSlide);
document.getElementById("prev-btn").addEventListener("click", prevSlide);

indicators.forEach(ind => {
  ind.addEventListener("click", (e) => {
    currentIndex = parseInt(e.target.getAttribute("data-index"));
    renderSlide(currentIndex);
  });
});

// Auto Loop Timer
setInterval(() => {
  if (!isPaused) {
    countdown--;
    timerText.innerText = `${countdown}s`;
    if (countdown <= 0) {
      nextSlide();
    }
  }
}, 1000);

pauseBtn.addEventListener("click", () => {
  isPaused = !isPaused;
  pauseBtn.innerText = isPaused ? "RESUME ROTATION" : "PAUSE ROTATION";
  pauseBtn.style.color = isPaused ? "var(--accent-red)" : "#fff";
});

// ==========================================
// BACKGROUND 3D (Three.js Particle Cyber Network)
// ==========================================
const canvas = document.getElementById("bg3d");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 30;

// Membuat Partikel Jaringan Node
const particleCount = 200;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 80;
}
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  color: 0x00f3ff,
  size: 0.8,
  transparent: true,
  opacity: 0.7
});

const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);

// Animasi 3D
function animate3D() {
  requestAnimationFrame(animate3D);
  particleSystem.rotation.y += 0.0015;
  particleSystem.rotation.x += 0.0008;
  renderer.render(scene, camera);
}
animate3D();

// Resize Window Event
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
