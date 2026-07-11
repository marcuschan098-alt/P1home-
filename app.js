
const state = { data: [], filtered: [] };
const $ = id => document.getElementById(id);
const fmtNum = n => Number.isFinite(Number(n)) ? Number(n).toFixed(0) : "—";
const fmtMoney = n => n ? new Intl.NumberFormat("en-SG",{style:"currency",currency:"SGD",maximumFractionDigits:0}).format(n) : "—";
const safe = v => (v === null || v === undefined || v === "") ? "—" : v;
const riskClass = risk => /Extreme|Very High|High/.test(risk||"") ? "risk" : /Medium/.test(risk||"") ? "warn" : "good";

function unique(field){
  return [...new Set(state.data.map(d=>d[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
}
function populateSelect(id, values){
  const el=$(id);
  values.forEach(v=>{ const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o); });
}
function matchesBudget(d, max){
  if(!max) return true;
  return d.price_min !== null && d.price_min <= Number(max);
}
function applyFilters(){
  const q=$("searchInput").value.trim().toLowerCase();
  const budget=$("budgetFilter").value;
  const region=$("regionFilter").value;
  const category=$("categoryFilter").value;
  const risk=$("riskFilter").value;
  const tenure=$("tenureFilter").value;
  const minScore=Number($("scoreFilter").value||0);
  const sort=$("sortFilter").value;

  state.filtered=state.data.filter(d=>{
    const hay=[
      d.target_school,d.condo,d.region,d.school_category,
      ...(d.alternative_schools_list||[])
    ].join(" ").toLowerCase();
    return (!q||hay.includes(q))
      && matchesBudget(d,budget)
      && (!region||d.region===region)
      && (!category||d.school_category===category)
      && (!risk||d.admission_risk===risk)
      && (!tenure||d.tenure===tenure)
      && Number(d.overall_score_100||0)>=minScore;
  });
  state.filtered.sort((a,b)=>{
    if(sort==="admission_desc") return Number(b.admission_chance_20||0)-Number(a.admission_chance_20||0);
    if(sort==="property_desc") return Number(b.property_investment_20||0)-Number(a.property_investment_20||0);
    if(sort==="price_asc") return (a.price_min??Infinity)-(b.price_min??Infinity);
    if(sort==="top_desc") return Number(b.top_year||0)-Number(a.top_year||0);
    return Number(b.overall_score_100||0)-Number(a.overall_score_100||0);
  });
  render();
}
function render(){
  const d=state.filtered;
  $("kpiPairings").textContent=d.length;
  $("kpiSchools").textContent=new Set(d.map(x=>x.target_school)).size;
  $("kpiCondos").textContent=new Set(d.map(x=>x.condo)).size;
  $("kpiAvgScore").textContent=d.length?(d.reduce((s,x)=>s+Number(x.overall_score_100||0),0)/d.length).toFixed(1):"0";
  $("resultCount").textContent=`${d.length} pairing${d.length===1?"":"s"} shown`;
  renderCards(d.slice(0,3));
  renderTable(d);
}
function renderCards(items){
  const box=$("topCards");
  box.innerHTML="";
  if(!items.length){box.innerHTML='<div class="empty">No pairings match the active filters.</div>';return;}
  items.forEach((d,i)=>{
    const card=document.createElement("article");
    card.className="result-card";
    card.innerHTML=`
      <h3>#${i+1} ${safe(d.target_school)}</h3>
      <div class="condo">${safe(d.condo)}</div>
      <div class="score-row">
        <span class="pill good">Overall ${safe(d.overall_score_100)}/100</span>
        <span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_risk)}</span>
        <span class="pill">${safe(d["3_bed_cost"])}</span>
      </div>`;
    card.addEventListener("click",()=>openDetail(d));
    box.appendChild(card);
  });
}
function renderTable(items){
  const body=$("resultsBody");body.innerHTML="";
  if(!items.length){body.innerHTML='<tr><td colspan="10" class="empty">No results.</td></tr>';return;}
  items.forEach((d,i)=>{
    const tr=document.createElement("tr");
    const alternatives=(d.alternative_schools_list||[]).slice(0,3).join("; ");
    tr.innerHTML=`
      <td>${i+1}</td>
      <td><strong>${safe(d.target_school)}</strong><br><span class="muted">${safe(d.school_category)}</span></td>
      <td><strong>${safe(d.condo)}</strong></td>
      <td>${safe(d.region)}</td>
      <td><span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_chance_20)}/20 · ${safe(d.admission_risk)}</span></td>
      <td>${safe(d["3_bed_cost"])}</td>
      <td>${safe(d.top_year)}</td>
      <td>${safe(d.tenure)}</td>
      <td class="alt-list">${safe(alternatives)}</td>
      <td class="score">${safe(d.overall_score_100)}</td>`;
    tr.addEventListener("click",()=>openDetail(d));
    body.appendChild(tr);
  });
}
function detailItem(label,value){return `<div class="detail-item"><small>${label}</small><strong>${safe(value)}</strong></div>`;}
function sourceLink(label,url){
  if(!url || !/^https?:/.test(url)) return "";
  return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
}
function openDetail(d){
  $("detailContent").innerHTML=`
    <div class="detail-head"><h2>${safe(d.target_school)}</h2><p>${safe(d.condo)}</p></div>
    <div class="detail-grid">
      ${detailItem("Overall score",`${safe(d.overall_score_100)}/100`)}
      ${detailItem("Admission chance",`${safe(d.admission_chance_20)}/20`)}
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
    <div class="detail-section"><h3>2025 P1 evidence</h3>
      <div class="detail-grid">
        ${detailItem("Phase 2A",`${safe(d["2025_phase_2a_applicants"])} applicants / ${safe(d["2025_phase_2a_vacancies"])} vacancies`)}
        ${detailItem("Phase 2B",`${safe(d["2025_phase_2b_applicants"])} applicants / ${safe(d["2025_phase_2b_vacancies"])} vacancies`)}
        ${detailItem("Phase 2C",`${safe(d["2025_phase_2c_applicants"])} applicants / ${safe(d["2025_phase_2c_vacancies"])} vacancies`)}
        ${detailItem("Phase 2C ratio",d["2025_phase_2c_ratio"])}
      </div>
    </div>
    <div class="detail-section"><h3>Alternative schools within 1 km</h3>
      <p>${(d.alternative_schools_list||[]).length ? d.alternative_schools_list.join(" · ") : "None listed"}</p>
    </div>
    <div class="detail-section"><h3>Assessment note</h3><p>${safe(d.key_property_pairing_note)}</p></div>
    <div class="detail-section sources"><h3>Sources</h3>
      ${sourceLink("Distance source",d.distance_source)}
      ${sourceLink("P1 source",d.p1_source)}
      ${sourceLink("Property source",d.property_source)}
    </div>`;
  $("detailDialog").showModal();
}
function exportCsv(){
  const fields=["target_school","condo","region","admission_risk","admission_chance_20","3_bed_cost","top_year","tenure","overall_score_100","alternative_schools_within_1km"];
  const lines=[fields.join(",")].concat(state.filtered.map(d=>fields.map(f=>`"${String(d[f]??"").replaceAll('"','""')}"`).join(",")));
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="filtered-pairings.csv";a.click();URL.revokeObjectURL(a.href);
}
async function init(){
  const res=await fetch("data/pairings.json");
  state.data=await res.json();
  state.filtered=[...state.data];
  populateSelect("regionFilter",unique("region"));
  populateSelect("categoryFilter",unique("school_category"));
  populateSelect("riskFilter",unique("admission_risk"));
  populateSelect("tenureFilter",unique("tenure"));
  ["searchInput","budgetFilter","regionFilter","categoryFilter","riskFilter","tenureFilter","scoreFilter","sortFilter"].forEach(id=>{
    $(id).addEventListener("input",()=>{if(id==="scoreFilter")$("scoreValue").textContent=$(id).value;applyFilters();});
  });
  $("resetBtn").addEventListener("click",()=>{
    ["searchInput","budgetFilter","regionFilter","categoryFilter","riskFilter","tenureFilter"].forEach(id=>$(id).value="");
    $("scoreFilter").value=0;$("scoreValue").textContent="0";$("sortFilter").value="overall_desc";applyFilters();
  });
  $("exportBtn").addEventListener("click",exportCsv);
  $("closeDialog").addEventListener("click",()=>$("detailDialog").close());
  $("columnBtn").addEventListener("click",()=>$("guideDialog").showModal());
  $("closeGuide").addEventListener("click",()=>$("guideDialog").close());
  applyFilters();
}
init().catch(err=>{
  document.body.innerHTML=`<main class="panel"><h1>Unable to load data</h1><p>${err.message}</p><p>Run this folder through GitHub Pages or a local HTTP server rather than opening it with file://.</p></main>`;
});
