const slides = [
  {
    category: "MODULE 01 // HARDWARE ARCHITECTURE",
    headline: "Protecting perimeter data before it flows.",
    desc: "Perangkat keras firewall mandiri dengan multi-port LAN terisolasi. Menyaring lalu lintas jaringan secara deterministik langsung pada lapisan gerbang utama tanpa overhead sistem.",
    video: "assets/video1.mp4",
    threat: "MINIMAL",
    speed: "10 Gbps",
    inspection: "Deep Packet / NAT",
    caption: "Hardware appliance routing 4-port Gigabit LAN active.",
    accent: "#38bdf8"
  },
  {
    category: "MODULE 02 // THREAT MITIGATION",
    headline: "Intrusion detected. Access instantly denied.",
    desc: "Sistem IDS dan IPS berkecepatan tinggi yang terus-menerus memindai anomali paket global, memetakan serangan secara real-time, dan mengisolasi alamat IP berbahaya seketika.",
    video: "assets/video2.mp4",
    threat: "ELEVATED",
    speed: "4.8 Gbps",
    inspection: "Anomaly Detection",
    caption: "Dynamic packet interception & signature rule triggered.",
    accent: "#ef4444"
  },
  {
    category: "MODULE 03 // DATA INTEGRITY & SHIELD",
    headline: "Full-state cryptographic terminal lock.",
    desc: "Lapisan proteksi internal endpoint berbasis antimalware cerdas. Menjaga otentikasi data sirkuit, mencegah ekstensi ransomware, dan mengunci akses tidak terotorisasi.",
    video: "assets/video3.mp4",
    threat: "SECURED",
    speed: "Quantum-Safe",
    inspection: "Zero-Trust Mesh",
    caption: "Cipher nodes synchronized. Endpoint security active.",
    accent: "#10b981"
  }
];

let activeIndex = 0;
let isAnimating = false;

// DOM Elements
const video = document.getElementById("main-video");
const videoSource = document.getElementById("video-src");
const pillButtons = document.querySelectorAll(".pill-item");
const catLabel = document.getElementById("cat-label");
const mainHeadline = document.getElementById("main-headline");
const mainDesc = document.getElementById("main-desc");
const metricThreat = document.getElementById("metric-threat");
const metricSpeed = document.getElementById("metric-speed");
const metricType = document.getElementById("metric-type");
const footerCaption = document.getElementById("footer-caption");
const currentSlide = document.getElementById("current-slide");
const editorialBlock = document.querySelector(".editorial-text");

function transitionTo(index) {
  if (isAnimating || index === activeIndex) return;
  isAnimating = true;

  const target = slides[index];

  // Efek transisi keluar halus
  editorialBlock.style.opacity = "0";
  editorialBlock.style.transform = "translateY(10px)";
  video.style.opacity = "0.2";

  setTimeout(() => {
    // Perbarui Video
    videoSource.src = target.video;
    video.load();
    video.play();

    // Perbarui Teks & Data
    catLabel.innerText = target.category;
    catLabel.style.color = target.accent;
    mainHeadline.innerText = target.headline;
    mainDesc.innerText = target.desc;
    metricThreat.innerText = target.threat;
    metricThreat.style.color = target.accent;
    metricSpeed.innerText = target.speed;
    metricType.innerText = target.inspection;
    footerCaption.innerText = target.caption;
    currentSlide.innerText = `0${index + 1}`;

    // Perbarui Tombol Pill
    pillButtons.forEach((btn, idx) => {
      btn.classList.toggle("active", idx === index);
    });

    // Fade In
    editorialBlock.style.opacity = "1";
    editorialBlock.style.transform = "translateY(0)";
    video.style.opacity = "1";

    activeIndex = index;
    isAnimating = false;
  }, 350);
}

// Event Listener Tombol Navigasi Pill
pillButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const idx = parseInt(btn.getAttribute("data-index"));
    transitionTo(idx);
  });
});

// Fitur Scroll Wheel (Scrollytelling seperti di video 4)
let scrollTimeout;
window.addEventListener("wheel", (e) => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    if (e.deltaY > 30) {
      // Scroll Down -> Slide Berikutnya
      const next = (activeIndex + 1) % slides.length;
      transitionTo(next);
    } else if (e.deltaY < -30) {
      // Scroll Up -> Slide Sebelumnya
      const prev = (activeIndex - 1 + slides.length) % slides.length;
      transitionTo(prev);
    }
  }, 60);
});

// Otomatis Berotasi setiap 9 Detik
setInterval(() => {
  const next = (activeIndex + 1) % slides.length;
  transitionTo(next);
}, 9000);
