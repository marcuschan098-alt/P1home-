
const state={
  data:[],filtered:[],
  compare:new Set(JSON.parse(localStorage.getItem("p1_compare")||"[]")),
  shortlist:new Set(JSON.parse(localStorage.getItem("p1_shortlist")||"[]")),
  notes:JSON.parse(localStorage.getItem("p1_notes")||"{}"),
  coordinates:JSON.parse(localStorage.getItem("p1_coordinates")||"{}"),
  queue:JSON.parse(localStorage.getItem("p1_geocode_queue")||"[]"),
  token:sessionStorage.getItem("p1_onemap_token")||"",
  map:null,markerLayer:null,radius:null,baseLayer:null,
  activePairingId:"",compact:false
};
const $=id=>document.getElementById(id);
const safe=v=>(v===null||v===undefined||v==="")?"—":v;
const idOf=d=>d.id||d.pairing_id;
const key=(type,name)=>`${type}:${String(name||"").trim().toLowerCase()}`;
const coordinate=(type,name)=>state.coordinates[key(type,name)]||null;
const money=n=>`S$${(Number(n)/1e6).toFixed(2)}M`;
const riskClass=r=>/Extreme|Very High|High/.test(r||"")?"high":/Medium/.test(r||"")?"medium":"low";

function persist(){
  localStorage.setItem("p1_compare",JSON.stringify([...state.compare]));
  localStorage.setItem("p1_shortlist",JSON.stringify([...state.shortlist]));
  localStorage.setItem("p1_notes",JSON.stringify(state.notes));
  localStorage.setItem("p1_coordinates",JSON.stringify(state.coordinates));
  localStorage.setItem("p1_geocode_queue",JSON.stringify(state.queue));
  $("compareCount").textContent=state.compare.size;
  $("shortlistCount").textContent=state.shortlist.size;
}
function unique(field){return[...new Set(state.data.map(d=>d[field]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)))}
function populate(id,values){const el=$(id);values.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o)})}
function populateSuggestions(){
  const values=[...new Set(state.data.flatMap(d=>[d.target_school,d.condo,...(d.alternative_schools_list||[])]).filter(Boolean))].sort();
  $("searchSuggestions").innerHTML=values.map(v=>`<option value="${String(v).replaceAll('"','&quot;')}"></option>`).join("");
}
function selectedPriceRange(){
  const a=$("priceMin"),b=$("priceMax");let min=Number(a.value),max=Number(b.value);
  if(min>max-50000){if(document.activeElement===a)min=max-50000;else max=min+50000}
  min=Math.max(1e6,min);max=Math.min(3e6,max);a.value=min;b.value=max;return[min,max]
}
function updatePrice(){
  const[min,max]=selectedPriceRange(),span=2e6;
  $("priceRangeLabel").textContent=`${money(min)} – ${money(max)}`;$("priceMinLabel").textContent=money(min);$("priceMaxLabel").textContent=money(max);
  $("rangeFill").style.left=`${((min-1e6)/span)*100}%`;$("rangeFill").style.right=`${100-((max-1e6)/span)*100}%`
}
function applyFilters(){
  updatePrice();const[min,max]=selectedPriceRange(),q=$("globalSearch").value.trim().toLowerCase();
  const school=$("schoolFilter").value,region=$("regionFilter").value,cat=$("categoryFilter").value,risk=$("riskFilter").value,tenure=$("tenureFilter").value,top=Number($("topFilter").value||0),sort=$("sortFilter").value;
  state.filtered=state.data.filter(d=>{
    const hay=[d.target_school,d.condo,d.region,d.school_category,...(d.alternative_schools_list||[])].join(" ").toLowerCase();
    const low=Number(d.price_min),high=Number(d.price_max);
    return(!q||hay.includes(q))&&Number.isFinite(low)&&Number.isFinite(high)&&high>=min&&low<=max&&(!school||d.target_school===school)&&(!region||d.region===region)&&(!cat||d.school_category===cat)&&(!risk||d.admission_risk===risk)&&(!tenure||d.tenure===tenure)&&Number(d.top_year||0)>=top
  });
  state.filtered.sort((a,b)=>{
    if(sort==="admission_desc")return Number(b.admission_chance_20||0)-Number(a.admission_chance_20||0);
    if(sort==="property_desc")return Number(b.property_investment_20||0)-Number(a.property_investment_20||0);
    if(sort==="price_asc")return(a.price_min??Infinity)-(b.price_min??Infinity);
    if(sort==="top_desc")return Number(b.top_year||0)-Number(a.top_year||0);
    return Number(b.overall_score_100||0)-Number(a.overall_score_100||0)
  });
  renderSummary();renderResults();renderMap()
}
function renderSummary(){
  const d=state.filtered;$("visiblePairings").textContent=d.length;$("visibleSchools").textContent=new Set(d.map(x=>x.target_school)).size;$("visibleCondos").textContent=new Set(d.map(x=>x.condo)).size;
  $("averageScore").textContent=d.length?(d.reduce((s,x)=>s+Number(x.overall_score_100||0),0)/d.length).toFixed(1):"0";$("resultCount").textContent=`${d.length} shown`
}
function resultCard(d,i){
  const id=idOf(d),fav=state.shortlist.has(id),cmp=state.compare.has(id);
  return`<article class="result-card ${state.activePairingId===id?"active":""}" data-id="${id}">
    <div class="result-top"><div><h3>${safe(d.target_school)}</h3><div class="condo-name">${safe(d.condo)}</div></div><span class="score-badge">${safe(d.overall_score_100)}</span></div>
    <div class="result-meta"><span class="pill ${riskClass(d.admission_risk)}">${safe(d.admission_risk)}</span><span class="pill">${safe(d["3_bed_cost"])}</span><span class="pill">${safe(d.top_year)} · ${safe(d.tenure)}</span></div>
    <div class="result-actions"><button class="details" data-id="${id}">Details</button><button class="compare ${cmp?"selected":""}" data-id="${id}">${cmp?"Compared":"Compare"}</button><button class="save ${fav?"selected":""}" data-id="${id}">${fav?"Saved":"Save"}</button></div>
  </article>`
}
function renderResults(){
  const list=$("resultsList");list.classList.toggle("compact",state.compact);list.innerHTML=state.filtered.length?state.filtered.map(resultCard).join(""):'<p>No results match the filters.</p>';
  list.querySelectorAll(".result-card").forEach(el=>el.onclick=e=>{if(e.target.tagName==="BUTTON")return;focusPairing(el.dataset.id)});
  list.querySelectorAll(".details").forEach(b=>b.onclick=()=>openDetails(findById(b.dataset.id)));
  list.querySelectorAll(".compare").forEach(b=>b.onclick=()=>toggleCompare(b.dataset.id));
  list.querySelectorAll(".save").forEach(b=>b.onclick=()=>toggleSave(b.dataset.id))
}
function findById(id){return state.data.find(d=>idOf(d)===id)}
function toggleCompare(id){state.compare.has(id)?state.compare.delete(id):(state.compare.size>=4?alert("Compare supports up to four pairings."):state.compare.add(id));persist();renderResults();renderCompare()}
function toggleSave(id){state.shortlist.has(id)?state.shortlist.delete(id):state.shortlist.add(id);persist();renderResults();renderShortlist()}
function focusPairing(id){
  const d=findById(id);if(!d)return;state.activePairingId=id;
  if($("schoolFilter").value!==d.target_school){$("schoolFilter").value=d.target_school;applyFilters()}
  const c=coordinate("condo",d.condo);if(c&&state.map)state.map.setView([c.lat,c.lng],16);
  renderResults()
}
function setView(name){
  document.querySelectorAll(".app-view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".topnav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));$(`${name}View`).classList.add("active");
  if(name==="map"){ensureMap();setTimeout(()=>state.map&&state.map.invalidateSize(),100);renderMap()}if(name==="compare")renderCompare();if(name==="shortlist")renderShortlist()
}
function mapStatus(text,type=""){const el=$("mapStatus");el.textContent=text;el.className=`map-status ${type}`.trim()}
function showLoading(show,text="Loading map…"){$("mapLoadingMask").textContent=text;$("mapLoadingMask").classList.toggle("show",show)}
function createBase(){
  const layer=L.tileLayer(
    "https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png",
    {
      detectRetina:true,
      minZoom:11,
      maxZoom:19,
      attribution:"OneMap © contributors | Singapore Land Authority"
    }
  );

  layer.on("loading",()=>{
    showLoading(true,"Loading OneMap Default…");
    mapStatus("Loading OneMap Default basemap…","busy");
  });

  layer.on("load",()=>{
    showLoading(false);
    mapStatus("OneMap Default basemap loaded.","ok");
  });

  layer.on("tileerror",()=>{
    showLoading(false);
    mapStatus("A OneMap tile failed to load. Tap Reload to retry the official basemap.","error");
  });

  return layer;
}

function reloadBase(){
  if(!state.map)return;
  if(state.baseLayer)state.map.removeLayer(state.baseLayer);
  state.baseLayer=createBase().addTo(state.map);
  setTimeout(()=>state.map.invalidateSize(true),120);
}

function ensureMap(){
  if(state.map||!window.L)return;
  state.map=L.map("oneMap",{
    preferCanvas:true,
    zoomControl:true,
    zoomSnap:1
  }).setView([1.3521,103.8198],11);

  state.baseLayer=createBase().addTo(state.map);
  state.markerLayer=L.layerGroup().addTo(state.map);

  state.map.whenReady(()=>{
    setTimeout(()=>state.map.invalidateSize(true),80);
  });
}

function icon(type){const char=type==="school"?"S":type==="condo"?"C":"A",size=type==="school"?30:type==="condo"?25:21;return L.divIcon({className:"",html:`<div class="map-marker ${type}">${char}</div>`,iconSize:[size,size],iconAnchor:[size/2,size/2]})}
function updateMapKpis(){
  const schools=new Set(),condos=new Set();state.data.forEach(d=>{if(coordinate("school",d.target_school))schools.add(d.target_school);if(coordinate("condo",d.condo))condos.add(d.condo)});
  $("mappedSchoolCount").textContent=schools.size;$("mappedCondoCount").textContent=condos.size;$("cachedLocationCount").textContent=Object.keys(state.coordinates).length
}
function renderMap(){
  if(!$("mapView").classList.contains("active"))return;ensureMap();state.markerLayer.clearLayers();if(state.radius){state.map.removeLayer(state.radius);state.radius=null}
  const bounds=[],seenSchool=new Set(),seenCondo=new Set(),school=$("schoolFilter").value;
  state.filtered.forEach(d=>{
    if(!seenSchool.has(d.target_school)){seenSchool.add(d.target_school);const c=coordinate("school",d.target_school);if(c){L.marker([c.lat,c.lng],{icon:icon("school")}).addTo(state.markerLayer).bindPopup(`<strong>${d.target_school}</strong><br>Target school`).on("click",()=>{$("schoolFilter").value=d.target_school;applyFilters()});bounds.push([c.lat,c.lng])}}
    if(!seenCondo.has(d.condo)){seenCondo.add(d.condo);const c=coordinate("condo",d.condo);if(c){L.marker([c.lat,c.lng],{icon:icon("condo")}).addTo(state.markerLayer).bindPopup(`<strong>${d.condo}</strong><br>${d.target_school}<br>${d["3_bed_cost"]}`).on("click",()=>{state.activePairingId=idOf(d);renderResults();openDetails(d)});bounds.push([c.lat,c.lng])}}
  });
  if(school){
    const c=coordinate("school",school);if(c){state.radius=L.circle([c.lat,c.lng],{radius:1000,color:"#1e638e",weight:2,fillColor:"#68a9ca",fillOpacity:.11}).addTo(state.map);bounds.push([c.lat,c.lng])}
    if($("showAlternatives").checked){const names=[...new Set(state.filtered.flatMap(d=>d.alternative_schools_list||[]))];names.forEach(name=>{const a=coordinate("alternative",name)||coordinate("school",name);if(a){L.marker([a.lat,a.lng],{icon:icon("alternative")}).addTo(state.markerLayer).bindPopup(`<strong>${name}</strong><br>Alternative school`);bounds.push([a.lat,a.lng])}})}
  }
  updateMapKpis();
  if(bounds.length){state.map.fitBounds(bounds,{padding:[45,45],maxZoom:school?15:13});mapStatus(`${bounds.length} mapped locations shown.`,"ok")}
  else{state.map.setView([1.3521,103.8198],11);mapStatus("OneMap Default is ready. Open Coordinate setup to geocode schools and condos.","ok")}
}
function detailItem(l,v){return`<div class="detail-item"><small>${l}</small><strong>${safe(v)}</strong></div>`}
function sourceLink(l,u){return u&&/^https?:/.test(u)?`<a href="${u}" target="_blank" rel="noopener">${l}</a>`:""}
function openDetails(d){
  const id=idOf(d),note=state.notes[id]||"";$("detailContent").innerHTML=`<div class="detail-head"><h2>${safe(d.target_school)}</h2><p>${safe(d.condo)}</p></div>
  <div class="detail-grid">${detailItem("Overall",`${safe(d.overall_score_100)}/100`)}${detailItem("Admission",`${safe(d.admission_chance_20)}/20`)}${detailItem("Risk",d.admission_risk)}${detailItem("Property",`${safe(d.property_investment_20)}/20`)}${detailItem("3-bed cost",d["3_bed_cost"])}${detailItem("TOP",d.top_year)}${detailItem("Tenure",d.tenure)}${detailItem("PSF",d.estimated_psf)}${detailItem("Transit",d.transit_mrt)}${detailItem("Distance",d.estimated_evidenced_distance)}</div>
  <div class="detail-section"><h3>Alternative schools within 1 km</h3><p>${(d.alternative_schools_list||[]).join(" · ")||"None listed"}</p></div>
  <div class="detail-section"><h3>My note</h3><textarea id="noteInput" class="notes-input">${note}</textarea><button id="saveNoteBtn" class="btn primary">Save note</button></div>
  <div class="detail-section sources"><h3>Sources</h3>${sourceLink("Distance",d.distance_source)}${sourceLink("P1 evidence",d.p1_source)}${sourceLink("Property",d.property_source)}</div>`;
  $("saveNoteBtn").onclick=()=>{state.notes[id]=$("noteInput").value;persist();$("saveNoteBtn").textContent="Saved"};$("detailDrawer").classList.add("open");document.body.classList.add("drawer-open");setTimeout(()=>state.map&&state.map.invalidateSize(false),50)
}
function closeDrawer(){$("detailDrawer").classList.remove("open");document.body.classList.remove("drawer-open");setTimeout(()=>state.map&&state.map.invalidateSize(false),50)}
function standaloneCard(d){return`<article class="standalone-card"><h3>${safe(d.target_school)}</h3><div class="condo-name">${safe(d.condo)}</div><div class="metric"><span>Overall</span><strong>${safe(d.overall_score_100)}/100</strong></div><div class="metric"><span>Admission</span><strong>${safe(d.admission_chance_20)}/20</strong></div><div class="metric"><span>Risk</span><strong>${safe(d.admission_risk)}</strong></div><div class="metric"><span>Property</span><strong>${safe(d.property_investment_20)}/20</strong></div><div class="metric"><span>3-bed cost</span><strong>${safe(d["3_bed_cost"])}</strong></div><div class="metric"><span>TOP</span><strong>${safe(d.top_year)}</strong></div><button class="btn secondary details" data-id="${idOf(d)}">Details</button></article>`}
function renderCompare(){const items=[...state.compare].map(findById).filter(Boolean);$("compareContainer").innerHTML=items.length?items.map(standaloneCard).join(""):"<p>No pairings selected.</p>";$("compareContainer").querySelectorAll(".details").forEach(b=>b.onclick=()=>openDetails(findById(b.dataset.id)))}
function renderShortlist(){const items=[...state.shortlist].map(findById).filter(Boolean);$("shortlistContainer").innerHTML=items.length?items.map(standaloneCard).join(""):"<p>Your shortlist is empty.</p>";$("shortlistContainer").querySelectorAll(".details").forEach(b=>b.onclick=()=>openDetails(findById(b.dataset.id)))}
async function searchOneMap(name,token){
  const url=`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(name)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error(`OneMap Search HTTP ${response.status}`);const payload=await response.json(),results=payload.results||[];if(!results.length)return null;
  const lower=name.toLowerCase(),choice=results.find(r=>String(r.SEARCHVAL||"").toLowerCase()===lower)||results.find(r=>String(r.SEARCHVAL||"").toLowerCase().includes(lower))||results[0];const lat=Number(choice.LATITUDE),lng=Number(choice.LONGITUDE);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng,label:choice.SEARCHVAL,address:choice.ADDRESS}:null
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function tasks(scope){const src=scope==="visible"?state.filtered:state.data,out=[];[...new Set(src.map(d=>d.target_school))].forEach(n=>out.push(["school",n]));[...new Set(src.map(d=>d.condo))].forEach(n=>out.push(["condo",n]));[...new Set(src.flatMap(d=>d.alternative_schools_list||[]))].forEach(n=>out.push(["alternative",n]));return out}
async function runQueue(list){
  const token=($("tokenInput").value||state.token).trim();if(!token){alert("Paste a valid OneMap token for geocoding.");return}state.token=token;sessionStorage.setItem("p1_onemap_token",token);state.queue=[...list];persist();let found=0,failed=0,total=state.queue.length;
  try{while(state.queue.length){const[type,name]=state.queue[0],k=key(type,name);$("setupProgress").textContent=`Geocoding ${total-state.queue.length+1} of ${total}: ${name}`;if(!state.coordinates[k]){try{const result=await searchOneMap(name,token);if(result){state.coordinates[k]=result;found++}else failed++}catch(err){if(/401|403|token/i.test(err.message))throw err;failed++}}state.queue.shift();persist();updateMapKpis();await delay(160)}
    $("setupProgress").textContent=`Completed: ${found} new locations; ${failed} not found.`;$("setupDialog").close();renderMap()
  }catch(err){$("setupProgress").textContent=`${err.message}. ${state.queue.length} locations remain. Use Resume after refreshing the token.`}
}
function exportCache(){const blob=new Blob([JSON.stringify(state.coordinates,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="p1-onemap-coordinates.json";a.click();URL.revokeObjectURL(a.href)}
async function importCache(file){if(!file)return;try{const obj=JSON.parse(await file.text());state.coordinates={...state.coordinates,...obj};persist();updateMapKpis();renderMap();$("setupProgress").textContent=`Imported ${Object.keys(obj).length} cached locations.`}catch(e){alert("Invalid coordinate cache file.")}}
function exportCsv(){const fields=["target_school","condo","region","admission_risk","admission_chance_20","3_bed_cost","top_year","tenure","overall_score_100"],lines=[fields.join(",")].concat(state.filtered.map(d=>fields.map(f=>`"${String(d[f]??"").replaceAll('"','""')}"`).join(","))),blob=new Blob([lines.join("\n")],{type:"text/csv"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="filtered-pairings.csv";a.click();URL.revokeObjectURL(a.href)}
async function init(){
  state.data=await(await fetch("data/pairings-expanded.json?v=4.2.0")).json();state.filtered=[...state.data];
  populate("schoolFilter",unique("target_school"));populate("regionFilter",unique("region"));populate("categoryFilter",unique("school_category"));populate("riskFilter",unique("admission_risk"));populate("tenureFilter",unique("tenure"));populateSuggestions();
  ["globalSearch","schoolFilter","regionFilter","categoryFilter","riskFilter","tenureFilter","topFilter","sortFilter","priceMin","priceMax"].forEach(id=>$(id).addEventListener("input",applyFilters));
  document.querySelectorAll(".topnav-btn").forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $("resetFiltersBtn").onclick=()=>{["globalSearch","schoolFilter","regionFilter","categoryFilter","riskFilter","tenureFilter","topFilter"].forEach(id=>$(id).value="");$("sortFilter").value="overall_desc";$("priceMin").value=1e6;$("priceMax").value=3e6;applyFilters()};
  $("toggleResultsBtn").onclick=()=>{state.compact=!state.compact;$("toggleResultsBtn").textContent=state.compact?"Expanded":"Compact";renderResults()};
  $("fitMarkersBtn").onclick=renderMap;$("showAlternatives").onchange=renderMap;$("reloadMapBtn").onclick=reloadBase;
  $("oneMapSetupBtn").onclick=()=>{$("tokenInput").value=state.token;$("setupDialog").showModal()};$("closeSetupDialog").onclick=()=>$("setupDialog").close();$("saveTokenBtn").onclick=()=>{state.token=$("tokenInput").value.trim();sessionStorage.setItem("p1_onemap_token",state.token);$("setupProgress").textContent="Token saved for this session."};$("geocodeVisibleBtn").onclick=()=>runQueue(tasks("visible"));$("geocodeAllBtn").onclick=()=>runQueue(tasks("all"));$("resumeGeocodeBtn").onclick=()=>state.queue.length?runQueue(state.queue):$("setupProgress").textContent="No incomplete queue.";$("exportCoordinatesBtn").onclick=exportCache;$("importCoordinatesInput").onchange=e=>importCache(e.target.files[0]);$("clearCoordinatesBtn").onclick=()=>{state.coordinates={};state.queue=[];persist();updateMapKpis();renderMap();$("setupProgress").textContent="Coordinate cache cleared."};
  $("closeDrawer").onclick=closeDrawer;document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer()});$("clearCompareBtn").onclick=()=>{state.compare.clear();persist();renderCompare();renderResults()};$("clearShortlistBtn").onclick=()=>{state.shortlist.clear();persist();renderShortlist();renderResults()};$("exportBtn").onclick=exportCsv;
  persist();updatePrice();ensureMap();updateMapKpis();applyFilters()
}
init().catch(err=>document.body.innerHTML=`<main style="padding:30px"><h1>Unable to load application</h1><p>${err.message}</p></main>`);


/* Version 4.2 platform foundation and hidden Admin Mode */
const platform={schools:[],condos:[],pairings:[],manifest:{},coordinates:{}};
async function loadPlatformData(){
  const [s,c,p,m,co]=await Promise.all([
    fetch('data/schools.json?v=4.2.0').then(r=>r.json()),
    fetch('data/condos.json?v=4.2.0').then(r=>r.json()),
    fetch('data/pairings.json?v=4.2.0').then(r=>r.json()),
    fetch('data/manifest.json?v=4.2.0').then(r=>r.json()),
    fetch('data/coordinates.json?v=4.2.0').then(r=>r.json())
  ]);
  platform.schools=JSON.parse(localStorage.getItem('p1_platform_schools')||'null')||s;
  platform.condos=JSON.parse(localStorage.getItem('p1_platform_condos')||'null')||c;
  platform.pairings=JSON.parse(localStorage.getItem('p1_platform_pairings')||'null')||p;
  platform.manifest=m;
  platform.coordinates={...co,...(JSON.parse(localStorage.getItem('p1_onemap_coordinates')||'{}'))};
  renderAdminHealth(); refreshAdminBuilders();
}
function platformSave(){
  localStorage.setItem('p1_platform_schools',JSON.stringify(platform.schools));
  localStorage.setItem('p1_platform_condos',JSON.stringify(platform.condos));
  localStorage.setItem('p1_platform_pairings',JSON.stringify(platform.pairings));
}
function activateAdmin(){
  sessionStorage.setItem('p1_admin_mode','1');
  document.getElementById('adminPanel').classList.add('open');
  renderAdminHealth(); refreshAdminBuilders();
}
function closeAdmin(){document.getElementById('adminPanel').classList.remove('open')}
function renderAdminHealth(){
  if(!document.getElementById('adminHealth'))return;
  const coords={...platform.coordinates,...(JSON.parse(localStorage.getItem('p1_onemap_coordinates')||'{}'))};
  const has=(t,n)=>!!coords[`${t}:${String(n).trim().toLowerCase()}`];
  const ms=platform.schools.filter(x=>has('school',x.name)).length;
  const mc=platform.condos.filter(x=>has('condo',x.name)).length;
  const ready=platform.pairings.filter(p=>{
    const s=platform.schools.find(x=>x.school_id===p.school_id),c=platform.condos.find(x=>x.condo_id===p.condo_id);
    return s&&c&&has('school',s.name)&&has('condo',c.name);
  }).length;
  const values=[
    ['Schools',platform.schools.length],['Condos',platform.condos.length],['Pairings',platform.pairings.length],
    ['Mapped schools',`${ms}/${platform.schools.length}`],['Mapped condos',`${mc}/${platform.condos.length}`],
    ['Map-ready pairings',`${ready}/${platform.pairings.length}`]
  ];
  document.getElementById('adminHealth').innerHTML=values.map(([a,b])=>`<div class="admin-kpi"><strong>${b}</strong><span>${a}</span></div>`).join('');
  const missing=[...platform.schools.filter(x=>!has('school',x.name)).map(x=>`School: ${x.name}`),...platform.condos.filter(x=>!has('condo',x.name)).map(x=>`Condo: ${x.name}`)];
  document.getElementById('adminIssues').innerHTML=missing.length?missing.slice(0,100).map(x=>`<li>${x}</li>`).join(''):'<li>No missing school or condo coordinates.</li>';
}
function refreshAdminBuilders(){
  const s=document.getElementById('adminSchool'),c=document.getElementById('adminCondo'); if(!s||!c)return;
  s.innerHTML=platform.schools.map(x=>`<option value="${x.school_id}">${x.name}</option>`).join('');
  c.innerHTML=platform.condos.map(x=>`<option value="${x.condo_id}">${x.name}</option>`).join('');
}
function addAdminEntity(){
  const type=document.getElementById('adminEntityType').value,name=document.getElementById('adminEntityName').value.trim(),region=document.getElementById('adminEntityRegion').value.trim();
  if(!name)return alert('Enter an entity name.');
  const arr=type==='school'?platform.schools:platform.condos,idKey=type==='school'?'school_id':'condo_id',prefix=type==='school'?'SCH':'CON';
  if(arr.some(x=>x.name.toLowerCase()===name.toLowerCase()))return alert('Entity already exists.');
  arr.push({[idKey]:`${prefix}${String(arr.length+1).padStart(3,'0')}`,name,region,coverage_status:'mapped'}); platformSave(); refreshAdminBuilders(); renderAdminHealth();
  document.getElementById('adminEntityStatus').textContent=`Added ${name} as map-only ${type}.`;
}
function addAdminPairing(){
  const school_id=document.getElementById('adminSchool').value,condo_id=document.getElementById('adminCondo').value,coverage_status=document.getElementById('adminCoverage').value;
  if(platform.pairings.some(x=>x.school_id===school_id&&x.condo_id===condo_id))return alert('Pairing already exists.');
  platform.pairings.push({pairing_id:`PAIR${String(platform.pairings.length+1).padStart(3,'0')}`,school_id,condo_id,coverage_status,alternative_schools:[]});platformSave();renderAdminHealth();
  document.getElementById('adminPairingStatus').textContent='Pairing added locally.';
}
function exportPlatformBundle(){
  const bundle={manifest:{...platform.manifest,exported_at:new Date().toISOString()},schools:platform.schools,condos:platform.condos,pairings:platform.pairings,coordinates:{...platform.coordinates,...(JSON.parse(localStorage.getItem('p1_onemap_coordinates')||'{}'))}};
  const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='p1-home-platform-bundle.json';a.click();URL.revokeObjectURL(a.href);
}
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='a'){e.preventDefault();activateAdmin()}});
window.addEventListener('hashchange',()=>{if(location.hash==='#admin')activateAdmin()});
window.addEventListener('load',()=>{loadPlatformData();if(location.hash==='#admin'||sessionStorage.getItem('p1_admin_mode')==='1')activateAdmin();
  document.getElementById('closeAdmin').onclick=closeAdmin;
  document.getElementById('adminAddEntity').onclick=addAdminEntity;
  document.getElementById('adminAddPairing').onclick=addAdminPairing;
  document.getElementById('adminExportBundle').onclick=exportPlatformBundle;
  document.getElementById('adminCoordinateSetup').onclick=()=>document.getElementById('tokenDialog')?.showModal();
});
