let currentIndex = 0;
const totalSlides = 3;
let isAnimating = false;

const track = document.getElementById("track");
const slides = document.querySelectorAll(".slide-item");
const pills = document.querySelectorAll(".pill-item");
const currNum = document.getElementById("curr-num");
const pulseDot = document.getElementById("pulse-dot");
const footerCaption = document.getElementById("footer-caption");
const systemStatus = document.getElementById("system-status");

const captions = [
  "Modul 1: Sharevdi 4-Port LAN Hardware Appliance Active.",
  "Modul 2: Dynamic IDS/IPS Threat Mitigation & Denial Active.",
  "Modul 3: Antimalware Heuristic Cryptographic Lock Active."
];

const statuses = [
  "PERIMETER NORMAL",
  "INTERCEPTION PROTOCOL ACTIVE",
  "CIRCUIT PROTECTED"
];

function initSlides() {
  slides[0].classList.add("active-slide");
}
initSlides();

function goToSlide(index) {
  if (isAnimating) return;
  isAnimating = true;

  // Batasi rentang index
  if (index < 0) index = totalSlides - 1;
  if (index >= totalSlides) index = 0;

  currentIndex = index;

  // Geser keseluruhan track horizontal (Video + UI bergerak bersama)
  track.style.transform = `translateX(-${currentIndex * 33.3333}%)`;

  // Update Status Aktif pada Slide
  slides.forEach((slide, idx) => {
    slide.classList.toggle("active-slide", idx === currentIndex);
    const video = slide.querySelector("video");
    if (idx === currentIndex) {
      video.currentTime = 0;
      video.play();
    }
  });

  // Update Pill Navigasi
  pills.forEach((pill, idx) => {
    pill.classList.toggle("active", idx === currentIndex);
  });

  // Update Teks Status & Warna Accent
  const theme = slides[currentIndex].getAttribute("data-theme");
  pulseDot.style.backgroundColor = theme;
  pulseDot.style.boxShadow = `0 0 10px ${theme}`;
  footerCaption.innerText = captions[currentIndex];
  systemStatus.innerText = statuses[currentIndex];
  systemStatus.style.color = theme;
  currNum.innerText = `0${currentIndex + 1}`;

  setTimeout(() => {
    isAnimating = false;
  }, 800);
}

// Navigasi Tombol Pill
pills.forEach(pill => {
  pill.addEventListener("click", () => {
    const idx = parseInt(pill.getAttribute("data-index"));
    goToSlide(idx);
  });
});

// Tombol Next & Prev
document.getElementById("next-btn").addEventListener("click", () => goToSlide(currentIndex + 1));
document.getElementById("prev-btn").addEventListener("click", () => goToSlide(currentIndex - 1));

// Trigger Gerakan Melalui Scroll Roda Mouse (Seperti Video ke-4)
let wheelTimeout;
window.addEventListener("wheel", (e) => {
  clearTimeout(wheelTimeout);
  wheelTimeout = setTimeout(() => {
    if (e.deltaY > 30) {
      goToSlide(currentIndex + 1);
    } else if (e.deltaY < -30) {
      goToSlide(currentIndex - 1);
    }
  }, 50);
});

// Otomatis Berotasi setiap 8 Detik
setInterval(() => {
  goToSlide(currentIndex + 1);
}, 8000);
