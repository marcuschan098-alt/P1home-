
const state={
  data:[],filtered:[],compare:new Set(JSON.parse(localStorage.getItem("p1_compare")||"[]")),
  shortlist:new Set(JSON.parse(localStorage.getItem("p1_shortlist")||"[]")),
  notes:JSON.parse(localStorage.getItem("p1_notes")||"{}"),
  geo:JSON.parse(localStorage.getItem("p1_onemap_geo")||"{}"),
  token:sessionStorage.getItem("p1_onemap_token")||"",
  map:null,layers:null,circle:null,selectedSchool:""
};
const $=id=>document.getElementById(id);
const on=(id,event,fn)=>{const el=$(id);if(el)el.addEventListener(event,fn)};
const safe=v=>(v===null||v===undefined||v==="")?"—":v;
const riskClass=r=>/Extreme|Very High|High/.test(r||"")?"risk":/Medium/.test(r||"")?"warn":"good";
const idOf=d=>d.id||d.pairing_id;
const money=n=>`S$${(Number(n)/1000000).toFixed(2)}M`;
const geoKey=(type,name)=>`${type}:${String(name||"").trim().toLowerCase()}`;

function persist(){
  localStorage.setItem("p1_compare",JSON.stringify([...state.compare]));
  localStorage.setItem("p1_shortlist",JSON.stringify([...state.shortlist]));
  localStorage.setItem("p1_notes",JSON.stringify(state.notes));
  localStorage.setItem("p1_onemap_geo",JSON.stringify(state.geo));
  updateCounts();
}
function updateCounts(){if($("compareCount"))$("compareCount").textContent=state.compare.size;if($("shortlistCount"))$("shortlistCount").textContent=state.shortlist.size}
function unique(field){return[...new Set(state.data.map(d=>d[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)))}
function populateSelect(id,values){const el=$(id);if(!el)return;values.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o)})}
function selectedPrices(){
  let min=Number($("priceMin").value),max=Number($("priceMax").value);
  if(min>max-50000){if(document.activeElement===$("priceMin"))min=max-50000;else max=min+50000}
  min=Math.max(1000000,min);max=Math.min(3000000,max);
  $("priceMin").value=min;$("priceMax").value=max;
  return[min,max]
}
function updatePriceRange(){
  const[min,max]=selectedPrices(),span=2000000;
  $("priceRangeLabel").textContent=`${money(min)} – ${money(max)}`;
  $("rangeFill").style.left=`${((min-1000000)/span)*100}%`;
  $("rangeFill").style.right=`${100-((max-1000000)/span)*100}%`;
}
function priceOverlaps(d,min,max){
  const low=Number(d.price_min),high=Number(d.price_max);
  return Number.isFinite(low)&&Number.isFinite(high)&&high>=min&&low<=max
}
function applyFilters(){
  updatePriceRange();
  const q=$("searchInput").value.trim().toLowerCase(),region=$("regionFilter").value,cat=$("categoryFilter").value;
  const risk=$("riskFilter").value,tenure=$("tenureFilter").value,top=Number($("topFilter").value||0);
  const score=Number($("scoreFilter").value||0),sort=$("sortFilter").value,[priceMin,priceMax]=selectedPrices();
  state.filtered=state.data.filter(d=>{
    const hay=[d.target_school,d.condo,d.region,d.school_category,...(d.alternative_schools_list||[])].join(" ").toLowerCase();
    return(!q||hay.includes(q))&&priceOverlaps(d,priceMin,priceMax)&&(!region||d.region===region)&&(!cat||d.school_category===cat)&&
      (!risk||d.admission_risk===risk)&&(!tenure||d.tenure===tenure)&&Number(d.top_year||0)>=top&&Number(d.overall_score_100||0)>=score
  });
  state.filtered.sort((a,b)=>{
    if(sort==="admission_desc")return Number(b.admission_chance_20||0)-Number(a.admission_chance_20||0);
    if(sort==="property_desc")return Number(b.property_investment_20||0)-Number(a.property_investment_20||0);
    if(sort==="price_asc")return(a.price_min??Infinity)-(b.price_min??Infinity);
    if(sort==="top_desc")return Number(b.top_year||0)-Number(a.top_year||0);
    return Number(b.overall_score_100||0)-Number(a.overall_score_100||0)
  });
  renderExplore();refreshMapSchoolOptions();renderMap()
}
function renderExplore(){
  const d=state.filtered;
  $("kpiPairings").textContent=d.length;$("kpiSchools").textContent=new Set(d.map(x=>x.target_school)).size;
  $("kpiCondos").textContent=new Set(d.map(x=>x.condo)).size;
  $("kpiAvgScore").textContent=d.length?(d.reduce((s,x)=>s+Number(x.overall_score_100||0),0)/d.length).toFixed(1):"0";
  $("resultCount").textContent=`${d.length} pairing${d.length===1?"":"s"} shown`;renderCards(d);renderTable(d)
}
function cardHtml(d,rank){
  const id=idOf(d),fav=state.shortlist.has(id),cmp=state.compare.has(id);
  return`<article class="property-card"><div class="card-head"><span class="rank-badge">#${rank}</span><span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_risk)}</span></div>
  <h3>${safe(d.target_school)}</h3><div class="condo-name">${safe(d.condo)}</div><div class="score-line"><span class="big-score">${safe(d.overall_score_100)}</span><span class="score-label">overall /100</span></div>
  <div class="meta-grid"><div class="meta"><small>3-bed cost</small><strong>${safe(d["3_bed_cost"])}</strong></div><div class="meta"><small>TOP / tenure</small><strong>${safe(d.top_year)} · ${safe(d.tenure)}</strong></div><div class="meta"><small>Admission</small><strong>${safe(d.admission_chance_20)}/20</strong></div><div class="meta"><small>Property</small><strong>${safe(d.property_investment_20)}/20</strong></div></div>
  <div class="pill-row"><span class="pill">${safe(d.region)}</span><span class="pill">${safe(d.school_category)}</span></div>
  <div class="card-actions"><button class="icon-btn details-btn" data-id="${id}">Details</button><button class="icon-btn compare-btn ${cmp?"selected":""}" data-id="${id}">${cmp?"Compared":"Compare"}</button><button class="icon-btn fav-btn ${fav?"selected":""}" data-id="${id}">${fav?"Saved":"Shortlist"}</button></div></article>`
}
function bindCardActions(root=document){
  root.querySelectorAll(".details-btn").forEach(b=>b.onclick=()=>openDetail(findById(b.dataset.id)));
  root.querySelectorAll(".compare-btn").forEach(b=>b.onclick=()=>toggleCompare(b.dataset.id));
  root.querySelectorAll(".fav-btn").forEach(b=>b.onclick=()=>toggleShortlist(b.dataset.id))
}
function renderCards(items){const box=$("cardsContainer");box.innerHTML=items.length?items.map((d,i)=>cardHtml(d,i+1)).join(""):'<div class="empty">No pairings match the active filters.</div>';bindCardActions(box)}
function renderTable(items){$("resultsBody").innerHTML=items.length?items.map((d,i)=>`<tr data-id="${idOf(d)}"><td>${i+1}</td><td><strong>${safe(d.target_school)}</strong><br><span class="muted">${safe(d.school_category)}</span></td><td><strong>${safe(d.condo)}</strong></td><td>${safe(d.region)}</td><td><span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_chance_20)}/20 · ${safe(d.admission_risk)}</span></td><td>${safe(d["3_bed_cost"])}</td><td>${safe(d.top_year)}</td><td>${safe(d.tenure)}</td><td>${safe((d.alternative_schools_list||[]).slice(0,3).join("; "))}</td><td class="score">${safe(d.overall_score_100)}</td></tr>`).join(""):'<tr><td colspan="10" class="empty">No results.</td></tr>';$("resultsBody").querySelectorAll("tr[data-id]").forEach(tr=>tr.onclick=()=>openDetail(findById(tr.dataset.id)))}
function findById(id){return state.data.find(d=>idOf(d)===id)}
function toggleCompare(id){if(state.compare.has(id))state.compare.delete(id);else{if(state.compare.size>=4){alert("Compare supports up to four pairings.");return}state.compare.add(id)}persist();renderExplore();renderCompare()}
function toggleShortlist(id){state.shortlist.has(id)?state.shortlist.delete(id):state.shortlist.add(id);persist();renderExplore();renderShortlist()}
function renderCompare(){const items=[...state.compare].map(findById).filter(Boolean),box=$("compareContainer");if(!items.length){box.innerHTML='<div class="empty">No pairings selected. Add up to four from Explore.</div>';return}const rs=[["Target school","target_school"],["Condo","condo"],["Overall score","overall_score_100"],["Admission","admission_chance_20"],["Admission risk","admission_risk"],["Property score","property_investment_20"],["3-bed cost","3_bed_cost"],["TOP","top_year"],["Tenure","tenure"],["Transit","transit_mrt"],["Alternative schools","alternative_schools_within_1km"]];box.innerHTML=`<table class="compare-table"><thead><tr><th>Metric</th>${items.map(d=>`<th>${safe(d.condo)}</th>`).join("")}</tr></thead><tbody>${rs.map(([l,k])=>`<tr><td>${l}</td>${items.map(d=>`<td>${safe(d[k])}</td>`).join("")}</tr>`).join("")}</tbody></table>`}
function renderShortlist(){const items=[...state.shortlist].map(findById).filter(Boolean),box=$("shortlistContainer");box.innerHTML=items.length?items.map((d,i)=>cardHtml(d,i+1)).join(""):'<div class="empty">Your shortlist is empty.</div>';bindCardActions(box)}
function detailItem(l,v){return`<div class="detail-item"><small>${l}</small><strong>${safe(v)}</strong></div>`}
function sourceLink(l,u){return u&&/^https?:/.test(u)?`<a href="${u}" target="_blank" rel="noopener">${l}</a>`:""}
function openDetail(d){const id=idOf(d),note=state.notes[id]||"";$("detailContent").innerHTML=`<div class="detail-head"><h2>${safe(d.target_school)}</h2><p>${safe(d.condo)}</p></div><div class="detail-grid">${detailItem("Overall",`${safe(d.overall_score_100)}/100`)}${detailItem("Admission",`${safe(d.admission_chance_20)}/20`)}${detailItem("Risk",d.admission_risk)}${detailItem("School quality",`${safe(d.school_quality_30)}/30`)}${detailItem("Property",`${safe(d.property_investment_20)}/20`)}${detailItem("3-bed cost",d["3_bed_cost"])}${detailItem("TOP",d.top_year)}${detailItem("Tenure",d.tenure)}${detailItem("PSF",d.estimated_psf)}${detailItem("Liquidity",d.liquidity)}${detailItem("Transit",d.transit_mrt)}${detailItem("Distance",d.estimated_evidenced_distance)}</div><div class="detail-section"><h3>Alternative schools within 1 km</h3><p>${(d.alternative_schools_list||[]).join(" · ")||"None listed"}</p></div><div class="detail-section"><h3>My note</h3><textarea id="noteInput" class="notes-input">${note}</textarea><button id="saveNoteBtn" class="primary compact">Save note</button></div><div class="detail-section sources"><h3>Sources</h3>${sourceLink("Distance source",d.distance_source)}${sourceLink("P1 source",d.p1_source)}${sourceLink("Property source",d.property_source)}</div>`;$("saveNoteBtn").onclick=()=>{state.notes[id]=$("noteInput").value;persist();$("saveNoteBtn").textContent="Saved"};$("detailDialog").showModal()}

function setMapStatus(text,type=""){const el=$("mapStatus");el.textContent=text;el.className=`map-status ${type}`.trim()}
function ensureMap(){
  if(state.map||!window.L)return;
  state.map=L.map("oneMap",{zoomControl:true}).setView([1.3521,103.8198],11);
  L.tileLayer("https://www.onemap.gov.sg/maps/tiles/GreyLite/{z}/{x}/{y}.png",{maxZoom:19,attribution:"OneMap © contributors | Singapore Land Authority"}).addTo(state.map);
  state.layers=L.layerGroup().addTo(state.map)
}
function markerIcon(type){
  const label=type==="school"?"S":type==="condo"?"C":"A";
  return L.divIcon({className:"",html:`<div class="map-marker-${type}">${label}</div>`,iconSize:type==="alt"?[19,19]:type==="school"?[27,27]:[23,23],iconAnchor:type==="alt"?[10,10]:type==="school"?[14,14]:[12,12]})
}
function geoFor(type,name){return state.geo[geoKey(type,name)]}
function refreshMapSchoolOptions(){
  const el=$("mapSchoolFilter");if(!el)return;
  const current=el.value,schools=[...new Set(state.filtered.map(d=>d.target_school))].sort();
  el.innerHTML='<option value="">All visible schools</option>'+schools.map(s=>`<option value="${s.replaceAll('"','&quot;')}">${s}</option>`).join("");
  if(schools.includes(current))el.value=current;else{el.value="";state.selectedSchool=""}
}
function renderMap(){
  if(!$("mapView").classList.contains("active"))return;
  ensureMap();if(!state.map||!state.layers)return;
  setTimeout(()=>state.map.invalidateSize(),50);state.layers.clearLayers();if(state.circle){state.map.removeLayer(state.circle);state.circle=null}
  const schoolFilter=$("mapSchoolFilter").value;state.selectedSchool=schoolFilter;
  const visible=schoolFilter?state.filtered.filter(d=>d.target_school===schoolFilter):state.filtered;
  const bounds=[];
  const schools=[...new Set(visible.map(d=>d.target_school))];
  schools.forEach(name=>{const g=geoFor("school",name);if(!g)return;const m=L.marker([g.lat,g.lng],{icon:markerIcon("school")}).addTo(state.layers).bindPopup(`<strong>${name}</strong><br>Target school`);m.on("click",()=>{$("mapSchoolFilter").value=name;state.selectedSchool=name;renderMap()});bounds.push([g.lat,g.lng])});
  const seenCondos=new Set();
  visible.forEach(d=>{if(seenCondos.has(d.condo))return;seenCondos.add(d.condo);const g=geoFor("condo",d.condo);if(!g)return;L.marker([g.lat,g.lng],{icon:markerIcon("condo")}).addTo(state.layers).bindPopup(`<strong>${d.condo}</strong><br>${d.target_school}<br>${d["3_bed_cost"]}`).on("click",()=>renderMapResults(d.target_school,d.condo));bounds.push([g.lat,g.lng])});
  if(schoolFilter){
    const sg=geoFor("school",schoolFilter);if(sg){state.circle=L.circle([sg.lat,sg.lng],{radius:1000,color:"#1d5f8a",fillColor:"#4d9bc5",fillOpacity:.1,weight:2}).addTo(state.map);bounds.push([sg.lat,sg.lng])}
    if($("showAlternatives").checked){const altNames=[...new Set(visible.flatMap(d=>d.alternative_schools_list||[]))];altNames.forEach(name=>{const g=geoFor("alt",name)||geoFor("school",name);if(!g)return;L.marker([g.lat,g.lng],{icon:markerIcon("alt")}).addTo(state.layers).bindPopup(`<strong>${name}</strong><br>Alternative school`);bounds.push([g.lat,g.lng])})}
    renderMapResults(schoolFilter)
  } else renderMapResults();
  if(bounds.length&&$("fitMapBtn").dataset.manual!=="1")state.map.fitBounds(bounds,{padding:[35,35],maxZoom:14})
}
function renderMapResults(school="",condo=""){
  const box=$("mapResults");let items=school?state.filtered.filter(d=>d.target_school===school):state.filtered;
  if(condo)items=items.filter(d=>d.condo===condo);
  box.innerHTML=`<h3>${school||"Visible map pairings"}</h3><p>${items.length} pairing${items.length===1?"":"s"} represented.</p><div class="map-list-section">${items.slice(0,20).map(d=>`<div class="map-result-item" data-id="${idOf(d)}"><strong>${safe(d.condo)}</strong><span>${safe(d["3_bed_cost"])} · ${safe(d.overall_score_100)}/100</span></div>`).join("")}</div>`;
  box.querySelectorAll(".map-result-item").forEach(x=>x.onclick=()=>openDetail(findById(x.dataset.id)))
}
async function searchOneMap(name,token){
  const url=`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(name)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  if(!res.ok)throw new Error(`OneMap search failed (${res.status})`);
  const data=await res.json(),results=data.results||[];
  if(!results.length)return null;
  const exact=results.find(r=>String(r.SEARCHVAL||"").toLowerCase().includes(String(name).toLowerCase()))||results[0];
  const lat=Number(exact.LATITUDE),lng=Number(exact.LONGITUDE);
  return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng,label:exact.SEARCHVAL,address:exact.ADDRESS}:null
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function geocodeAll(){
  const token=$("tokenInput").value.trim()||state.token;if(!token){alert("Paste a OneMap access token first.");return}
  state.token=token;sessionStorage.setItem("p1_onemap_token",token);setMapStatus("Preparing unique schools and condos…","busy");
  const tasks=[],targetSchools=[...new Set(state.data.map(d=>d.target_school))],condos=[...new Set(state.data.map(d=>d.condo))],alts=[...new Set(state.data.flatMap(d=>d.alternative_schools_list||[]))];
  targetSchools.forEach(n=>tasks.push(["school",n]));condos.forEach(n=>tasks.push(["condo",n]));alts.forEach(n=>tasks.push(["alt",n]));
  let completed=0,found=0;
  try{
    for(const[type,name]of tasks){
      const key=geoKey(type,name);if(state.geo[key]){completed++;found++;continue}
      setMapStatus(`OneMap geocoding ${completed+1} of ${tasks.length}: ${name}`,"busy");
      const result=await searchOneMap(name,token);if(result){state.geo[key]=result;found++;persist()}
      completed++;await pause(120)
    }
    setMapStatus(`Geocoding completed: ${found} of ${tasks.length} locations available on the map.`,"ok");$("tokenDialog").close();renderMap()
  }catch(err){setMapStatus(`${err.message}. The token may be expired or OneMap may be temporarily unavailable.`,"error")}
}
function setView(name){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));$(`${name}View`).classList.add("active");if(name==="compare")renderCompare();if(name==="shortlist")renderShortlist();if(name==="map"){ensureMap();refreshMapSchoolOptions();renderMap()}}
function applyPreset(name){document.querySelectorAll(".chip").forEach(c=>c.classList.toggle("active",c.dataset.preset===name));$("tenureFilter").value="";$("topFilter").value="";$("sortFilter").value="overall_desc";if(name==="admission")$("sortFilter").value="admission_desc";if(name==="property")$("sortFilter").value="property_desc";if(name==="newer"){$("topFilter").value="2018";$("sortFilter").value="top_desc"}if(name==="freehold")$("tenureFilter").value="Freehold";applyFilters()}
function exportCsv(){const fields=["target_school","condo","region","admission_risk","admission_chance_20","3_bed_cost","top_year","tenure","overall_score_100","alternative_schools_within_1km"],lines=[fields.join(",")].concat(state.filtered.map(d=>fields.map(f=>`"${String(d[f]??"").replaceAll('"','""')}"`).join(","))),blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="filtered-pairings.csv";a.click();URL.revokeObjectURL(a.href)}
async function init(){
  state.data=await(await fetch("data/pairings.json?v=3.0.0")).json();state.filtered=[...state.data];
  populateSelect("regionFilter",unique("region"));populateSelect("categoryFilter",unique("school_category"));populateSelect("riskFilter",unique("admission_risk"));populateSelect("tenureFilter",unique("tenure"));
  ["searchInput","regionFilter","categoryFilter","riskFilter","tenureFilter","topFilter","scoreFilter","sortFilter","priceMin","priceMax"].forEach(id=>on(id,"input",()=>{if(id==="scoreFilter")$("scoreValue").textContent=$(id).value;applyFilters()}));
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll(".chip").forEach(c=>c.onclick=()=>applyPreset(c.dataset.preset));
  on("cardModeBtn","click",()=>{$("cardsContainer").classList.remove("hidden");$("tableContainer").classList.add("hidden");$("cardModeBtn").classList.add("active");$("tableModeBtn").classList.remove("active")});
  on("tableModeBtn","click",()=>{$("cardsContainer").classList.add("hidden");$("tableContainer").classList.remove("hidden");$("tableModeBtn").classList.add("active");$("cardModeBtn").classList.remove("active")});
  on("resetBtn","click",()=>{["searchInput","regionFilter","categoryFilter","riskFilter","tenureFilter","topFilter"].forEach(id=>$(id).value="");$("scoreFilter").value=0;$("scoreValue").textContent="0";$("priceMin").value=1000000;$("priceMax").value=3000000;applyPreset("overall")});
  on("exportBtn","click",exportCsv);on("closeDialog","click",()=>$("detailDialog").close());on("clearCompareBtn","click",()=>{state.compare.clear();persist();renderCompare();renderExplore()});on("clearShortlistBtn","click",()=>{state.shortlist.clear();persist();renderShortlist();renderExplore()});
  on("mapSetupBtn","click",()=>{$("tokenInput").value=state.token;$("tokenDialog").showModal()});on("closeTokenDialog","click",()=>$("tokenDialog").close());
  on("saveTokenBtn","click",()=>{state.token=$("tokenInput").value.trim();sessionStorage.setItem("p1_onemap_token",state.token);setMapStatus("Token saved for this browser session. Select Geocode schools and condos.","ok")});
  on("geocodeBtn","click",geocodeAll);on("clearGeoBtn","click",()=>{state.geo={};persist();setMapStatus("Cached coordinates cleared.","ok");renderMap()});
  on("mapSchoolFilter","change",()=>{state.selectedSchool=$("mapSchoolFilter").value;$("fitMapBtn").dataset.manual="";renderMap()});on("showAlternatives","change",renderMap);on("fitMapBtn","click",()=>{$("fitMapBtn").dataset.manual="";renderMap()});
  updateCounts();updatePriceRange();applyFilters();renderCompare();renderShortlist()
}
init().catch(err=>document.body.innerHTML=`<main class="panel"><h1>Unable to load data</h1><p>${err.message}</p><p>Use GitHub Pages or a local HTTP server.</p></main>`);
