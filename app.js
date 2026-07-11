
const state={
  data:[],filtered:[],compare:new Set(JSON.parse(localStorage.getItem("p1_compare")||"[]")),
  shortlist:new Set(JSON.parse(localStorage.getItem("p1_shortlist")||"[]")),
  notes:JSON.parse(localStorage.getItem("p1_notes")||"{}"),mode:"cards",activeRegion:null
};
const $=id=>document.getElementById(id);
const safe=v=>(v===null||v===undefined||v==="")?"—":v;
const riskClass=r=>/Extreme|Very High|High/.test(r||"")?"risk":/Medium/.test(r||"")?"warn":"good";
const idOf=d=>d.id||d.pairing_id;

function persist(){
  localStorage.setItem("p1_compare",JSON.stringify([...state.compare]));
  localStorage.setItem("p1_shortlist",JSON.stringify([...state.shortlist]));
  localStorage.setItem("p1_notes",JSON.stringify(state.notes));
  updateCounts();
}
function updateCounts(){
  $("compareCount").textContent=state.compare.size;
  $("shortlistCount").textContent=state.shortlist.size;
}
function unique(field){return [...new Set(state.data.map(d=>d[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)))}
function populateSelect(id,values){values.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;$(id).appendChild(o)})}
function matchesBudget(d,max){return !max||(d.price_min!==null&&d.price_min<=Number(max))}
function applyFilters(){
  const q=$("searchInput").value.trim().toLowerCase(),budget=$("budgetFilter").value,region=$("regionFilter").value;
  const cat=$("categoryFilter").value,risk=$("riskFilter").value,tenure=$("tenureFilter").value;
  const top=Number($("topFilter").value||0),score=Number($("scoreFilter").value||0),sort=$("sortFilter").value;
  state.filtered=state.data.filter(d=>{
    const hay=[d.target_school,d.condo,d.region,d.school_category,...(d.alternative_schools_list||[])].join(" ").toLowerCase();
    return(!q||hay.includes(q))&&matchesBudget(d,budget)&&(!region||d.region===region)&&(!cat||d.school_category===cat)&&
      (!risk||d.admission_risk===risk)&&(!tenure||d.tenure===tenure)&&Number(d.top_year||0)>=top&&Number(d.overall_score_100||0)>=score
  });
  state.filtered.sort((a,b)=>{
    if(sort==="admission_desc")return Number(b.admission_chance_20||0)-Number(a.admission_chance_20||0);
    if(sort==="property_desc")return Number(b.property_investment_20||0)-Number(a.property_investment_20||0);
    if(sort==="price_asc")return(a.price_min??Infinity)-(b.price_min??Infinity);
    if(sort==="top_desc")return Number(b.top_year||0)-Number(a.top_year||0);
    return Number(b.overall_score_100||0)-Number(a.overall_score_100||0)
  });
  renderExplore();renderMap();
}
function renderExplore(){
  const d=state.filtered;
  $("kpiPairings").textContent=d.length;$("kpiSchools").textContent=new Set(d.map(x=>x.target_school)).size;
  $("kpiCondos").textContent=new Set(d.map(x=>x.condo)).size;
  $("kpiAvgScore").textContent=d.length?(d.reduce((s,x)=>s+Number(x.overall_score_100||0),0)/d.length).toFixed(1):"0";
  $("resultCount").textContent=`${d.length} pairing${d.length===1?"":"s"} shown`;
  renderCards(d);renderTable(d)
}
function cardHtml(d,rank,context="explore"){
  const id=idOf(d),isFav=state.shortlist.has(id),isCmp=state.compare.has(id);
  return `<article class="property-card">
    <div class="card-head"><span class="rank-badge">#${rank}</span><span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_risk)}</span></div>
    <h3>${safe(d.target_school)}</h3><div class="condo-name">${safe(d.condo)}</div>
    <div class="score-line"><span class="big-score">${safe(d.overall_score_100)}</span><span class="score-label">overall /100</span></div>
    <div class="meta-grid">
      <div class="meta"><small>3-bed cost</small><strong>${safe(d["3_bed_cost"])}</strong></div>
      <div class="meta"><small>TOP / tenure</small><strong>${safe(d.top_year)} · ${safe(d.tenure)}</strong></div>
      <div class="meta"><small>Admission</small><strong>${safe(d.admission_chance_20)}/20</strong></div>
      <div class="meta"><small>Property</small><strong>${safe(d.property_investment_20)}/20</strong></div>
    </div>
    <div class="pill-row"><span class="pill">${safe(d.region)}</span><span class="pill">${safe(d.school_category)}</span></div>
    <div class="card-actions">
      <button class="icon-btn details-btn" data-id="${id}">Details</button>
      <button class="icon-btn compare-btn ${isCmp?"selected":""}" data-id="${id}">${isCmp?"Compared":"Compare"}</button>
      <button class="icon-btn fav-btn ${isFav?"selected":""}" data-id="${id}">${isFav?"Saved":"Shortlist"}</button>
    </div>
  </article>`
}
function bindCardActions(root=document){
  root.querySelectorAll(".details-btn").forEach(b=>b.onclick=()=>openDetail(findById(b.dataset.id)));
  root.querySelectorAll(".compare-btn").forEach(b=>b.onclick=()=>toggleCompare(b.dataset.id));
  root.querySelectorAll(".fav-btn").forEach(b=>b.onclick=()=>toggleShortlist(b.dataset.id))
}
function renderCards(items){
  const box=$("cardsContainer");
  box.innerHTML=items.length?items.map((d,i)=>cardHtml(d,i+1)).join(""):'<div class="empty">No pairings match the active filters.</div>';
  bindCardActions(box)
}
function renderTable(items){
  $("resultsBody").innerHTML=items.length?items.map((d,i)=>`<tr data-id="${idOf(d)}"><td>${i+1}</td><td><strong>${safe(d.target_school)}</strong><br><span class="muted">${safe(d.school_category)}</span></td><td><strong>${safe(d.condo)}</strong></td><td>${safe(d.region)}</td><td><span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_chance_20)}/20 · ${safe(d.admission_risk)}</span></td><td>${safe(d["3_bed_cost"])}</td><td>${safe(d.top_year)}</td><td>${safe(d.tenure)}</td><td>${safe((d.alternative_schools_list||[]).slice(0,3).join("; "))}</td><td class="score">${safe(d.overall_score_100)}</td></tr>`).join(""):'<tr><td colspan="10" class="empty">No results.</td></tr>';
  $("resultsBody").querySelectorAll("tr[data-id]").forEach(tr=>tr.onclick=()=>openDetail(findById(tr.dataset.id)))
}
function findById(id){return state.data.find(d=>idOf(d)===id)}
function toggleCompare(id){
  if(state.compare.has(id))state.compare.delete(id);else{
    if(state.compare.size>=4){alert("Compare supports up to four pairings.");return}
    state.compare.add(id)
  }
  persist();renderExplore();renderCompare()
}
function toggleShortlist(id){
  state.shortlist.has(id)?state.shortlist.delete(id):state.shortlist.add(id);
  persist();renderExplore();renderShortlist()
}
function renderCompare(){
  const items=[...state.compare].map(findById).filter(Boolean),box=$("compareContainer");
  if(!items.length){box.innerHTML='<div class="empty">No pairings selected. Add up to four from Explore.</div>';return}
  const rows=[
    ["Target school","target_school"],["Condo","condo"],["Overall score","overall_score_100"],["Admission","admission_chance_20"],
    ["Admission risk","admission_risk"],["Property score","property_investment_20"],["3-bed cost","3_bed_cost"],["TOP","top_year"],
    ["Tenure","tenure"],["Transit","transit_mrt"],["Alternative schools","alternative_schools_within_1km"]
  ];
  box.innerHTML=`<table class="compare-table"><thead><tr><th>Metric</th>${items.map(d=>`<th>${safe(d.condo)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label,key])=>`<tr><td>${label}</td>${items.map(d=>`<td>${safe(d[key])}</td>`).join("")}</tr>`).join("")}</tbody></table>`
}
function renderShortlist(){
  const items=[...state.shortlist].map(findById).filter(Boolean),box=$("shortlistContainer");
  box.innerHTML=items.length?items.map((d,i)=>cardHtml(d,i+1,"shortlist")).join(""):'<div class="empty">Your shortlist is empty.</div>';
  bindCardActions(box)
}
function renderMap(){
  const visible=state.filtered,regions={};
  visible.forEach(d=>(regions[d.region]??=[]).push(d));
  const map=$("regionalMap");
  map.innerHTML=Object.entries(regions).map(([region,items])=>`<button class="map-cluster ${state.activeRegion===region?"active":""}" data-region="${region}" style="left:${items[0].map_x}%;top:${items[0].map_y}%"><strong>${items.length}</strong><span>${region}</span></button>`).join("");
  map.querySelectorAll(".map-cluster").forEach(b=>b.onclick=()=>{state.activeRegion=b.dataset.region;renderMapResults(regions[state.activeRegion]||[]);renderMap()});
  if(state.activeRegion&&regions[state.activeRegion])renderMapResults(regions[state.activeRegion])
}
function renderMapResults(items){
  $("mapResults").innerHTML=`<h3>${safe(state.activeRegion)}</h3><p>${items.length} visible pairing${items.length===1?"":"s"}</p>${items.slice(0,15).map(d=>`<div class="map-item" data-id="${idOf(d)}"><strong>${safe(d.condo)}</strong><span>${safe(d.target_school)} · ${safe(d.overall_score_100)}/100</span></div>`).join("")}`;
  $("mapResults").querySelectorAll(".map-item").forEach(x=>x.onclick=()=>openDetail(findById(x.dataset.id)))
}
function detailItem(label,value){return`<div class="detail-item"><small>${label}</small><strong>${safe(value)}</strong></div>`}
function sourceLink(label,url){return url&&/^https?:/.test(url)?`<a href="${url}" target="_blank" rel="noopener">${label}</a>`:""}
function openDetail(d){
  const id=idOf(d),note=state.notes[id]||"";
  $("detailContent").innerHTML=`<div class="detail-head"><h2>${safe(d.target_school)}</h2><p>${safe(d.condo)}</p></div>
  <div class="detail-grid">${detailItem("Overall",`${safe(d.overall_score_100)}/100`)}${detailItem("Admission",`${safe(d.admission_chance_20)}/20`)}${detailItem("Risk",d.admission_risk)}${detailItem("School quality",`${safe(d.school_quality_30)}/30`)}${detailItem("Property",`${safe(d.property_investment_20)}/20`)}${detailItem("3-bed cost",d["3_bed_cost"])}${detailItem("TOP",d.top_year)}${detailItem("Tenure",d.tenure)}${detailItem("PSF",d.estimated_psf)}${detailItem("Liquidity",d.liquidity)}${detailItem("Transit",d.transit_mrt)}${detailItem("Distance",d.estimated_evidenced_distance)}</div>
  <div class="detail-section"><h3>2025 P1 evidence</h3><div class="detail-grid">${detailItem("Phase 2A",`${safe(d["2025_phase_2a_applicants"])} / ${safe(d["2025_phase_2a_vacancies"])}`)}${detailItem("Phase 2B",`${safe(d["2025_phase_2b_applicants"])} / ${safe(d["2025_phase_2b_vacancies"])}`)}${detailItem("Phase 2C",`${safe(d["2025_phase_2c_applicants"])} / ${safe(d["2025_phase_2c_vacancies"])}`)}${detailItem("2C ratio",d["2025_phase_2c_ratio"])}</div></div>
  <div class="detail-section"><h3>Alternative schools within 1 km</h3><p>${(d.alternative_schools_list||[]).join(" · ")||"None listed"}</p></div>
  <div class="detail-section"><h3>My note</h3><textarea id="noteInput" class="notes-input" placeholder="Record viewing notes, concerns or follow-up questions">${note}</textarea><button id="saveNoteBtn" class="primary compact">Save note</button></div>
  <div class="detail-section sources"><h3>Sources</h3>${sourceLink("Distance source",d.distance_source)}${sourceLink("P1 source",d.p1_source)}${sourceLink("Property source",d.property_source)}</div>`;
  $("saveNoteBtn").onclick=()=>{state.notes[id]=$("noteInput").value;persist();$("saveNoteBtn").textContent="Saved"};
  $("detailDialog").showModal()
}
function setView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $(`${name}View`).classList.add("active");
  if(name==="compare")renderCompare();if(name==="shortlist")renderShortlist();if(name==="map")renderMap()
}
function applyPreset(name){
  document.querySelectorAll(".chip").forEach(c=>c.classList.toggle("active",c.dataset.preset===name));
  ["budgetFilter","tenureFilter","topFilter"].forEach(id=>$(id).value="");
  $("sortFilter").value="overall_desc";
  if(name==="under2m")$("budgetFilter").value="2000000";
  if(name==="admission")$("sortFilter").value="admission_desc";
  if(name==="property")$("sortFilter").value="property_desc";
  if(name==="newer"){$("topFilter").value="2018";$("sortFilter").value="top_desc"}
  if(name==="freehold")$("tenureFilter").value="Freehold";
  applyFilters()
}
function exportCsv(){
  const fields=["target_school","condo","region","admission_risk","admission_chance_20","3_bed_cost","top_year","tenure","overall_score_100","alternative_schools_within_1km"];
  const lines=[fields.join(",")].concat(state.filtered.map(d=>fields.map(f=>`"${String(d[f]??"").replaceAll('"','""')}"`).join(",")));
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="filtered-pairings.csv";a.click();URL.revokeObjectURL(a.href)
}
async function init(){
  state.data=await(await fetch("data/pairings.json")).json();state.filtered=[...state.data];
  populateSelect("regionFilter",unique("region"));populateSelect("categoryFilter",unique("school_category"));
  populateSelect("riskFilter",unique("admission_risk"));populateSelect("tenureFilter",unique("tenure"));
  ["searchInput","budgetFilter","regionFilter","categoryFilter","riskFilter","tenureFilter","topFilter","scoreFilter","sortFilter"].forEach(id=>$(id).addEventListener("input",()=>{if(id==="scoreFilter")$("scoreValue").textContent=$(id).value;applyFilters()}));
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>setView(b.dataset.view));
  document.querySelectorAll(".chip").forEach(c=>c.onclick=()=>applyPreset(c.dataset.preset));
  $("cardModeBtn").onclick=()=>{$("cardsContainer").classList.remove("hidden");$("tableContainer").classList.add("hidden");$("cardModeBtn").classList.add("active");$("tableModeBtn").classList.remove("active")};
  $("tableModeBtn").onclick=()=>{$("cardsContainer").classList.add("hidden");$("tableContainer").classList.remove("hidden");$("tableModeBtn").classList.add("active");$("cardModeBtn").classList.remove("active")};
  $("resetBtn").onclick=()=>{["searchInput","budgetFilter","regionFilter","categoryFilter","riskFilter","tenureFilter","topFilter"].forEach(id=>$(id).value="");$("scoreFilter").value=0;$("scoreValue").textContent="0";applyPreset("overall")};
  $("exportBtn").onclick=exportCsv;$("closeDialog").onclick=()=>$("detailDialog").close();
  $("clearCompareBtn").onclick=()=>{state.compare.clear();persist();renderCompare();renderExplore()};
  $("clearShortlistBtn").onclick=()=>{state.shortlist.clear();persist();renderShortlist();renderExplore()};
  updateCounts();applyFilters();renderCompare();renderShortlist()
}
init().catch(err=>document.body.innerHTML=`<main class="panel"><h1>Unable to load data</h1><p>${err.message}</p><p>Use GitHub Pages or a local HTTP server.</p></main>`);
