const projects = [
  {title:'Python Tools N Toys', desc:'String-search plus memory helpers.', tech:['Python'], url:'https://github.com/yokaimsi/Python-Tools-N-Toys'},
  {title:'ezfetch', desc:'Minimal sys-info fetch script.', tech:['Python'], url:'https://github.com/yokaimsi/ezfetch'},
  {title:'Bumblebee Bot', desc:'Moderation & fun Discord bot.', tech:['JS','Python'], url:'https://github.com/yokaimsi'},
  {title:'Discord-BOTS', desc:'Collection of small bots.', tech:['JS','Python'], url:'https://github.com/yokaimsi/Discord-BOTS'}
];
const skills = ['Python','HTML','CSS','JavaScript','Git','GitHub','VSCode','Flask','SQLite','Vercel','Windows','Kali Linux','Linux Mint','Parrot','Ubuntu','Zorin'];

export function initUI(){
  // nav
  const navLinks = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.page');
  const indicator = $('.nav-indicator');
  function slideIndicator(el){
    indicator.style.left = el.offsetLeft+'px';
    indicator.style.width = el.offsetWidth+'px';
  }
  navLinks.forEach(link=>{
    link.addEventListener('click', e=>{
      e.preventDefault();
      navLinks.forEach(l=>l.classList.remove('active'));
      pages.forEach(p=>p.classList.remove('active'));
      link.classList.add('active');
      const target = link.dataset.page;
      $('#'+target).classList.add('active');
      slideIndicator(link);
      if(window.innerWidth<=768) $('#hamburger').click();
    });
  });
  slideIndicator($('.nav-link.active'));

  // hamburger
  $('#hamburger').addEventListener('click', ()=>{
    document.querySelector('.nav').classList.toggle('nav-open');
  });

  // inject project cards
  const pGrid = $('.projects-grid');
  projects.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="project-content">
        <div class="project-header"><i class="fas fa-code"></i><h3>${p.title}</h3></div>
        <p class="project-desc">${p.desc}</p>
        <div class="project-tech">${p.tech.map(t=>`<span class="tech-tag ${t.toLowerCase()}">${t}</span>`).join('')}</div>
        <a href="${p.url}" target="_blank" rel="noreferrer" class="project-btn github"><i class="fab fa-github"></i>GitHub</a>
      </div>`;
    pGrid.appendChild(card);
  });

  // inject skill cards
  const sGrid = $('.skills-grid');
  skills.forEach(s=>{
    const ic = s==='Python'?'devicon-python-plain'
             : s==='Flask'?'fas fa-flask'
             : s==='SQLite'?'devicon-sqlite-plain'
             : s==='VSCode'?'devicon-vscode-plain'
             : s==='JavaScript'?'fab fa-js-square'
             : s==='Git'?'fab fa-git-alt'
             : s==='GitHub'?'fab fa-github'
             : s==='HTML'?'fab fa-html5'
             : s==='CSS'?'fab fa-css3-alt'
             : s==='Windows'?'fab fa-windows'
             : s.includes('Linux')?'fab fa-linux'
             : 'fas fa-cog';
    const card = document.createElement('div');
    card.className = 'skill-card';
    card.innerHTML = `<i class="${ic}"></i><span class="skill-label">${s}</span>`;
    sGrid.appendChild(card);
  });
}

function $(sel){return document.querySelector(sel)}