const escapeHtml=(value)=>value.replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));

function inlineMarkdown(value){
  return escapeHtml(value)
    .replace(/\`([^\`]+)\`/g,"<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
}

function renderMarkdown(markdown){
  const lines=markdown.replace(/\r/g,"").split("\n");
  const output=[];
  let listOpen=false;
  const closeList=()=>{if(listOpen){output.push("</ul>");listOpen=false;}};

  for(const raw of lines){
    const line=raw.trim();
    if(!line){closeList();continue;}

    const heading=line.match(/^(#{1,3})\s+(.+)$/);
    if(heading){
      closeList();
      const level=heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if(line.startsWith("- ")){
      if(!listOpen){output.push("<ul>");listOpen=true;}
      output.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    closeList();
    output.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  return output.join("");
}

async function loadMarkdown(path,targetId){
  const target=document.getElementById(targetId);
  try{
    const response=await fetch(path,{cache:"no-store"});
    if(!response.ok) throw new Error("Could not load "+path);
    target.innerHTML=renderMarkdown(await response.text());
  }catch{
    target.innerHTML="<p>Could not load this source file.</p>";
  }
}

async function loadAssets(){
  const target=document.getElementById("asset-grid");
  try{
    const response=await fetch("./assets/manifest.json",{cache:"no-store"});
    if(!response.ok) throw new Error("Could not load asset manifest");
    const manifest=await response.json();

    target.innerHTML=manifest.groups.map((group)=>{
      const items=(group.items||[]).map((item)=>
        `<div class="asset-item"><span>${escapeHtml(item.name)}</span><code>${escapeHtml(item.file)}</code></div>`
      ).join("");

      return `<article class="asset-card">
        <div class="asset-card-top">
          <h3>${escapeHtml(group.label)}</h3>
          <span class="count">${group.items.length} added</span>
        </div>
        <p>${escapeHtml(group.description)}</p>
        <code>${escapeHtml(group.path)}</code>
        ${items?`<div class="asset-items">${items}</div>`:""}
      </article>`;
    }).join("");
  }catch{
    target.innerHTML="<article class='asset-card'><h3>Asset manifest missing</h3><p>Check assets/manifest.json.</p></article>";
  }
}

document.querySelectorAll("[data-copy]").forEach((button)=>{
  button.addEventListener("click",async()=>{
    try{
      await navigator.clipboard.writeText(button.dataset.copy);
      const original=button.textContent;
      button.textContent="Copied";
      setTimeout(()=>button.textContent=original,1100);
    }catch{
      button.textContent=button.dataset.copy;
    }
  });
});

const links=[...document.querySelectorAll("[data-section-link]")];
const sections=[...document.querySelectorAll(".section-target")];
const observer=new IntersectionObserver((entries)=>{
  const visible=entries.filter((entry)=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if(!visible)return;
  links.forEach((link)=>link.classList.toggle("active",link.dataset.sectionLink===visible.target.id));
},{rootMargin:"-18% 0px -58% 0px",threshold:[.05,.3,.7]});

sections.forEach((section)=>observer.observe(section));
loadMarkdown("./script.md","script-content");
loadMarkdown("./idea.md","idea-content");
loadAssets();
