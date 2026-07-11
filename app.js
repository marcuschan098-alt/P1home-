
const state={
  data:[],filtered:[],
  compare:new Set(JSON.parse(localStorage.getItem("p1_compare")||"[]")),
  shortlist:new Set(JSON.parse(localStorage.getItem("p1_shortlist")||"[]")),
  notes:JSON.parse(localStorage.getItem("p1_notes")||"{}")
};

const $=id=>document.getElementById(id);
const safe=v=>(v===null||v===undefined||v==="")?"—":v;
const idOf=d=>d.id||d.pairing_id;
const riskClass=r=>/Extreme|Very High|High/.test(r||"")?"risk":/Medium/.test(r||"")?"warn":"good";

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
function unique(field){
  return [...new Set(state.data.map(d=>d[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
}
function populateSelect(id,values){
  const el=$(id);
  values.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o)});
}
function populateSearchSuggestions(){
  const items=[...new Set(state.data.flatMap(d=>[d.target_school,d.condo,...(d.alternative_schools_list||[])]).filter(Boolean))].sort();
  $("searchSuggestions").innerHTML=items.map(v=>`<option value="${String(v).replaceAll('"','&quot;')}"></option>`).join("");
}
function money(n){return `S$${(Number(n)/1000000).toFixed(2)}M`}
function selectedPriceRange(){
  const minEl=$("priceMin"),maxEl=$("priceMax");
  let min=Number(minEl.value),max=Number(maxEl.value);
  if(min>max-50000){
    if(document.activeElement===minEl)min=max-50000;else max=min+50000;
  }
  min=Math.max(1000000,min);max=Math.min(3000000,max);
  minEl.value=min;maxEl.value=max;
  return[min,max];
}
function updatePriceRange(){
  const[min,max]=selectedPriceRange(),span=2000000;
  $("priceRangeLabel").textContent=`${money(min)} – ${money(max)}`;
  $("priceMinLabel").textContent=money(min);
  $("priceMaxLabel").textContent=money(max);
  $("rangeFill").style.left=`${((min-1000000)/span)*100}%`;
  $("rangeFill").style.right=`${100-((max-1000000)/span)*100}%`;
}
function overlapsPrice(d,min,max){
  const low=Number(d.price_min),high=Number(d.price_max);
  return Number.isFinite(low)&&Number.isFinite(high)&&high>=min&&low<=max;
}
function applyFilters(){
  updatePriceRange();
  const [priceMin,priceMax]=selectedPriceRange();
  const q=$("searchInput").value.trim().toLowerCase();
  const region=$("regionFilter").value,category=$("categoryFilter").value,risk=$("riskFilter").value;
  const tenure=$("tenureFilter").value,top=Number($("topFilter").value||0),score=Number($("scoreFilter").value||0);
  const sort=$("sortFilter").value;

  state.filtered=state.data.filter(d=>{
    const hay=[d.target_school,d.condo,d.region,d.school_category,...(d.alternative_schools_list||[])].join(" ").toLowerCase();
    return(!q||hay.includes(q))
      &&overlapsPrice(d,priceMin,priceMax)
      &&(!region||d.region===region)
      &&(!category||d.school_category===category)
      &&(!risk||d.admission_risk===risk)
      &&(!tenure||d.tenure===tenure)
      &&Number(d.top_year||0)>=top
      &&Number(d.overall_score_100||0)>=score;
  });

  state.filtered.sort((a,b)=>{
    if(sort==="admission_desc")return Number(b.admission_chance_20||0)-Number(a.admission_chance_20||0);
    if(sort==="property_desc")return Number(b.property_investment_20||0)-Number(a.property_investment_20||0);
    if(sort==="price_asc")return(a.price_min??Infinity)-(b.price_min??Infinity);
    if(sort==="top_desc")return Number(b.top_year||0)-Number(a.top_year||0);
    return Number(b.overall_score_100||0)-Number(a.overall_score_100||0);
  });
  renderAll();
}
function renderInsights(){
  const data=state.filtered;
  const bestOverall=[...data].sort((a,b)=>Number(b.overall_score_100||0)-Number(a.overall_score_100||0))[0];
  const bestAdmission=[...data].sort((a,b)=>Number(b.admission_chance_20||0)-Number(a.admission_chance_20||0))[0];
  const bestProperty=[...data].sort((a,b)=>Number(b.property_investment_20||0)-Number(a.property_investment_20||0))[0];

  $("insightOverallName").textContent=bestOverall?safe(bestOverall.condo):"No result";
  $("insightOverallScore").textContent=bestOverall?safe(bestOverall.overall_score_100):"—";
  $("insightAdmissionName").textContent=bestAdmission?safe(bestAdmission.target_school):"No result";
  $("insightAdmissionScore").textContent=bestAdmission?safe(bestAdmission.admission_chance_20):"—";
  $("insightPropertyName").textContent=bestProperty?safe(bestProperty.condo):"No result";
  $("insightPropertyScore").textContent=bestProperty?safe(bestProperty.property_investment_20):"—";
  $("insightVisible").textContent=`${data.length} pairing${data.length===1?"":"s"}`;
  $("insightSchools").textContent=new Set(data.map(d=>d.target_school)).size;
  $("insightCondos").textContent=new Set(data.map(d=>d.condo)).size;
}
function renderAll(){
  $("resultCount").textContent=`${state.filtered.length} pairing${state.filtered.length===1?"":"s"} shown`;
  renderInsights();renderCards(state.filtered);renderTable(state.filtered);renderCompare();renderShortlist();
}
function progress(value,max){
  const pct=Math.max(0,Math.min(100,(Number(value||0)/max)*100));
  return `${pct}%`;
}
function cardHtml(d,rank){
  const id=idOf(d),fav=state.shortlist.has(id),cmp=state.compare.has(id);
  return `<article class="property-card">
    <div class="card-head">
      <span class="rank-badge">#${rank}</span>
      <span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_risk)}</span>
    </div>
    <h3>${safe(d.target_school)}</h3>
    <div class="condo-name">${safe(d.condo)}</div>
    <div class="score-line"><span class="big-score">${safe(d.overall_score_100)}</span><span class="score-label">overall /100</span></div>
    <div class="bar-group">
      <div class="bar-row"><span>Admission</span><div class="bar"><span style="width:${progress(d.admission_chance_20,20)}"></span></div><strong>${safe(d.admission_chance_20)}/20</strong></div>
      <div class="bar-row"><span>Property</span><div class="bar"><span style="width:${progress(d.property_investment_20,20)}"></span></div><strong>${safe(d.property_investment_20)}/20</strong></div>
    </div>
    <div class="meta-grid">
      <div class="meta"><small>3-bed cost</small><strong>${safe(d["3_bed_cost"])}</strong></div>
      <div class="meta"><small>TOP / tenure</small><strong>${safe(d.top_year)} · ${safe(d.tenure)}</strong></div>
      <div class="meta"><small>Region</small><strong>${safe(d.region)}</strong></div>
      <div class="meta"><small>School category</small><strong>${safe(d.school_category)}</strong></div>
    </div>
    <div class="card-actions">
      <button class="details-btn" data-id="${id}">Details</button>
      <button class="compare-btn ${cmp?"selected":""}" data-id="${id}">${cmp?"Compared":"Compare"}</button>
      <button class="fav-btn ${fav?"selected":""}" data-id="${id}">${fav?"Saved":"Shortlist"}</button>
    </div>
  </article>`;
}
function bindCardActions(root=document){
  root.querySelectorAll(".details-btn").forEach(b=>b.onclick=()=>openDetail(findById(b.dataset.id)));
  root.querySelectorAll(".compare-btn").forEach(b=>b.onclick=()=>toggleCompare(b.dataset.id));
  root.querySelectorAll(".fav-btn").forEach(b=>b.onclick=()=>toggleShortlist(b.dataset.id));
}
function renderCards(items){
  const box=$("cardsContainer");
  box.innerHTML=items.length?items.map((d,i)=>cardHtml(d,i+1)).join(""):'<div class="empty">No pairings match the active filters.</div>';
  bindCardActions(box);
}
function renderTable(items){
  $("resultsBody").innerHTML=items.length?items.map((d,i)=>`<tr data-id="${idOf(d)}">
    <td>${i+1}</td>
    <td><strong>${safe(d.target_school)}</strong><br><span class="muted">${safe(d.school_category)}</span></td>
    <td><strong>${safe(d.condo)}</strong></td>
    <td>${safe(d.region)}</td>
    <td><span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_chance_20)}/20 · ${safe(d.admission_risk)}</span></td>
    <td>${safe(d["3_bed_cost"])}</td><td>${safe(d.top_year)}</td><td>${safe(d.tenure)}</td>
    <td>${safe((d.alternative_schools_list||[]).slice(0,3).join("; "))}</td>
    <td class="score">${safe(d.overall_score_100)}</td>
  </tr>`).join(""):'<tr><td colspan="10" class="empty">No results.</td></tr>';
  $("resultsBody").querySelectorAll("tr[data-id]").forEach(tr=>tr.onclick=()=>openDetail(findById(tr.dataset.id)));
}
function findById(id){return state.data.find(d=>idOf(d)===id)}
function toggleCompare(id){
  if(state.compare.has(id))state.compare.delete(id);
  else{
    if(state.compare.size>=4){alert("Compare supports up to four pairings.");return}
    state.compare.add(id);
  }
  persist();renderAll();
}
function toggleShortlist(id){
  state.shortlist.has(id)?state.shortlist.delete(id):state.shortlist.add(id);
  persist();renderAll();
}
function renderCompare(){
  const items=[...state.compare].map(findById).filter(Boolean),box=$("compareContainer");
  if(!items.length){box.innerHTML='<div class="empty">No pairings selected. Add up to four from Explore.</div>';return}
  box.innerHTML=items.map(d=>`<article class="compare-card">
    <h3>${safe(d.target_school)}</h3>
    <div class="condo-name">${safe(d.condo)}</div>
    <div class="compare-metric"><span>Overall</span><strong>${safe(d.overall_score_100)}/100</strong></div>
    <div class="compare-metric"><span>Admission</span><strong>${safe(d.admission_chance_20)}/20</strong></div>
    <div class="compare-metric"><span>Admission risk</span><strong>${safe(d.admission_risk)}</strong></div>
    <div class="compare-metric"><span>Property</span><strong>${safe(d.property_investment_20)}/20</strong></div>
    <div class="compare-metric"><span>3-bed cost</span><strong>${safe(d["3_bed_cost"])}</strong></div>
    <div class="compare-metric"><span>TOP</span><strong>${safe(d.top_year)}</strong></div>
    <div class="compare-metric"><span>Tenure</span><strong>${safe(d.tenure)}</strong></div>
    <button class="btn btn-small details-btn" data-id="${idOf(d)}">Open details</button>
  </article>`).join("");
  bindCardActions(box);
}
function renderShortlist(){
  const items=[...state.shortlist].map(findById).filter(Boolean),box=$("shortlistContainer");
  box.innerHTML=items.length?items.map((d,i)=>cardHtml(d,i+1)).join(""):'<div class="empty">Your shortlist is empty.</div>';
  bindCardActions(box);
}
function detailItem(label,value){return`<div class="detail-item"><small>${label}</small><strong>${safe(value)}</strong></div>`}
function sourceLink(label,url){return url&&/^https?:/.test(url)?`<a href="${url}" target="_blank" rel="noopener">${label}</a>`:""}
function openDetail(d){
  const id=idOf(d),note=state.notes[id]||"";
  $("detailContent").innerHTML=`<div class="detail-head"><h2>${safe(d.target_school)}</h2><p>${safe(d.condo)}</p></div>
    <div class="detail-grid">
      ${detailItem("Overall",`${safe(d.overall_score_100)}/100`)}
      ${detailItem("Admission",`${safe(d.admission_chance_20)}/20`)}
      ${detailItem("Admission risk",d.admission_risk)}
      ${detailItem("School quality",`${safe(d.school_quality_30)}/30`)}
      ${detailItem("Property score",`${safe(d.property_investment_20)}/20`)}
      ${detailItem("3-bed cost",d["3_bed_cost"])}
      ${detailItem("TOP",d.top_year)}
      ${detailItem("Tenure",d.tenure)}
      ${detailItem("Estimated PSF",d.estimated_psf)}
      ${detailItem("Liquidity",d.liquidity)}
      ${detailItem("Transit",d.transit_mrt)}
      ${detailItem("Distance",d.estimated_evidenced_distance)}
    </div>
    <div class="detail-section"><h3>Alternative schools within 1 km</h3><p>${(d.alternative_schools_list||[]).join(" · ")||"None listed"}</p></div>
    <div class="detail-section"><h3>Assessment note</h3><p>${safe(d.key_property_pairing_note)}</p></div>
    <div class="detail-section"><h3>My note</h3><textarea id="noteInput" class="notes-input" placeholder="Viewing notes, concerns or follow-up questions">${note}</textarea><button id="saveNoteBtn" class="btn btn-primary">Save note</button></div>
    <div class="detail-section sources"><h3>Sources</h3>${sourceLink("Distance source",d.distance_source)}${sourceLink("P1 source",d.p1_source)}${sourceLink("Property source",d.property_source)}</div>`;
  $("saveNoteBtn").onclick=()=>{state.notes[id]=$("noteInput").value;persist();$("saveNoteBtn").textContent="Saved"};
  $("detailDrawer").classList.add("open");$("detailDrawer").setAttribute("aria-hidden","false");
}
function closeDrawer(){
  $("detailDrawer").classList.remove("open");$("detailDrawer").setAttribute("aria-hidden","true");
}
function setView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $(`${name}View`).classList.add("active");
}
function applyPreset(name){
  document.querySelectorAll(".chip").forEach(c=>c.classList.toggle("active",c.dataset.preset===name));
  $("tenureFilter").value="";$("topFilter").value="";$("sortFilter").value="overall_desc";
  if(name==="admission")$("sortFilter").value="admission_desc";
  if(name==="property")$("sortFilter").value="property_desc";
  if(name==="newer"){$("topFilter").value="2018";$("sortFilter").value="top_desc"}
  if(name==="freehold")$("tenureFilter").value="Freehold";
  applyFilters();
}
function exportCsv(){
  const fields=["target_school","condo","region","admission_risk","admission_chance_20","3_bed_cost","top_year","tenure","overall_score_100","alternative_schools_within_1km"];
  const lines=[fields.join(",")].concat(state.filtered.map(d=>fields.map(f=>`"${String(d[f]??"").replaceAll('"','""')}"`).join(",")));
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="filtered-pairings.csv";a.click();URL.revokeObjectURL(a.href);
}
async function init(){
  state.data=await(await fetch("data/pairings.json?v=2.2.0")).json();
  state.filtered=[...state.data];
  populateSelect("regionFilter",unique("region"));
  populateSelect("categoryFilter",unique("school_category"));
  populateSelect("riskFilter",unique("admission_risk"));
  populateSelect("tenureFilter",unique("tenure"));
  populateSearchSuggestions();

  ["searchInput","regionFilter","categoryFilter","riskFilter","tenureFilter","topFilter","scoreFilter","sortFilter","priceMin","priceMax"].forEach(id=>{
    $(id).addEventListener("input",()=>{if(id==="scoreFilter")$("scoreValue").textContent=$(id).value;applyFilters()});
  });
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>setView(b.dataset.view));
  document.querySelectorAll(".chip").forEach(c=>c.onclick=()=>applyPreset(c.dataset.preset));

  $("cardModeBtn").onclick=()=>{$("cardsContainer").classList.remove("hidden");$("tableContainer").classList.add("hidden");$("cardModeBtn").classList.add("active");$("tableModeBtn").classList.remove("active")};
  $("tableModeBtn").onclick=()=>{$("cardsContainer").classList.add("hidden");$("tableContainer").classList.remove("hidden");$("tableModeBtn").classList.add("active");$("cardModeBtn").classList.remove("active")};
  $("resetBtn").onclick=()=>{
    ["searchInput","regionFilter","categoryFilter","riskFilter","tenureFilter","topFilter"].forEach(id=>$(id).value="");
    $("scoreFilter").value=0;$("scoreValue").textContent="0";$("priceMin").value=1000000;$("priceMax").value=3000000;
    applyPreset("overall");
  };
  $("exportBtn").onclick=exportCsv;
  $("clearCompareBtn").onclick=()=>{state.compare.clear();persist();renderAll()};
  $("clearShortlistBtn").onclick=()=>{state.shortlist.clear();persist();renderAll()};
  $("closeDrawer").onclick=closeDrawer;$("drawerBackdrop").onclick=closeDrawer;
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer()});

  updateCounts();updatePriceRange();applyFilters();
}
init().catch(err=>document.body.innerHTML=`<main class="panel"><h1>Unable to load data</h1><p>${err.message}</p><p>Use GitHub Pages or a local HTTP server.</p></main>`);
