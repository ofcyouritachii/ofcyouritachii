const COUNT = window.innerWidth > 768 ? 50 : 0;
const box = document.getElementById('particles');
for (let i = 0; i < COUNT; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.left = Math.random() * 100 + '%';
  p.style.animationDuration = (Math.random() * 10 + 10) + 's';
  p.style.animationDelay = Math.random() * 15 + 's';
  box.appendChild(p);
}