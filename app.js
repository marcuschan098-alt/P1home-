
const state={
  data:[],filtered:[],
  compare:new Set(JSON.parse(localStorage.getItem("p1_compare")||"[]")),
  shortlist:new Set(JSON.parse(localStorage.getItem("p1_shortlist")||"[]")),
  notes:JSON.parse(localStorage.getItem("p1_notes")||"{}"),
  coordinates:JSON.parse(localStorage.getItem("p1_onemap_coordinates")||"{}"),
  oneMapToken:sessionStorage.getItem("p1_onemap_token")||"",
  map:null,
  mapLayer:null,
  radiusLayer:null,
  selectedMapSchool:""
};

const $=id=>document.getElementById(id);
const safe=v=>(v===null||v===undefined||v==="")?"—":v;
const idOf=d=>d.id||d.pairing_id;
const riskClass=r=>/Extreme|Very High|High/.test(r||"")?"risk":/Medium/.test(r||"")?"warn":"good";

function persist(){
  localStorage.setItem("p1_compare",JSON.stringify([...state.compare]));
  localStorage.setItem("p1_shortlist",JSON.stringify([...state.shortlist]));
  localStorage.setItem("p1_notes",JSON.stringify(state.notes));
  localStorage.setItem("p1_onemap_coordinates",JSON.stringify(state.coordinates));
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
  renderInsights();renderCards(state.filtered);renderTable(state.filtered);renderCompare();renderShortlist();refreshMapSchoolFilter();if($("mapView")?.classList.contains("active"))renderMap();
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
  if(name==="map"){
    ensureMap();
    refreshMapSchoolFilter();
    renderMap();
    setTimeout(()=>state.map&&state.map.invalidateSize(),80);
  }
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

function setMapStatus(message,type=""){
  const el=$("mapStatus");
  if(!el)return;
  el.textContent=message;
  el.className=`map-status ${type}`.trim();
}
function coordinateKey(type,name){
  return `${type}:${String(name||"").trim().toLowerCase()}`;
}
function getCoordinate(type,name){
  return state.coordinates[coordinateKey(type,name)]||null;
}
function ensureMap(){
  if(state.map||!window.L||!$("oneMap"))return;
  state.map=L.map("oneMap",{zoomControl:true}).setView([1.3521,103.8198],11);
  L.tileLayer("https://www.onemap.gov.sg/maps/tiles/GreyLite/{z}/{x}/{y}.png",{
    maxZoom:19,
    attribution:"OneMap © contributors | Singapore Land Authority"
  }).addTo(state.map);
  state.mapLayer=L.layerGroup().addTo(state.map);
}
function mapIcon(type){
  const letter=type==="school"?"S":type==="condo"?"C":"A";
  const size=type==="school"?29:type==="condo"?25:21;
  return L.divIcon({
    className:"",
    html:`<div class="map-marker ${type}">${letter}</div>`,
    iconSize:[size,size],
    iconAnchor:[size/2,size/2]
  });
}
function refreshMapSchoolFilter(){
  const el=$("mapSchoolFilter");
  if(!el)return;
  const current=el.value;
  const schools=[...new Set(state.filtered.map(d=>d.target_school))].sort();
  el.innerHTML='<option value="">All visible target schools</option>'+
    schools.map(s=>`<option value="${String(s).replaceAll('"','&quot;')}">${s}</option>`).join("");
  if(schools.includes(current))el.value=current;
  else{el.value="";state.selectedMapSchool=""}
}
function visibleMapPairings(){
  const selected=$("mapSchoolFilter")?.value||"";
  return selected?state.filtered.filter(d=>d.target_school===selected):state.filtered;
}
function renderMap(){
  if(!$("mapView")?.classList.contains("active"))return;
  ensureMap();
  if(!state.map||!state.mapLayer)return;

  state.mapLayer.clearLayers();
  if(state.radiusLayer){state.map.removeLayer(state.radiusLayer);state.radiusLayer=null}

  const selected=$("mapSchoolFilter").value;
  state.selectedMapSchool=selected;
  const items=visibleMapPairings();
  const bounds=[];
  const seenSchools=new Set(),seenCondos=new Set(),seenAlternatives=new Set();

  items.forEach(d=>{
    if(!seenSchools.has(d.target_school)){
      seenSchools.add(d.target_school);
      const c=getCoordinate("school",d.target_school);
      if(c){
        const marker=L.marker([c.lat,c.lng],{icon:mapIcon("school")})
          .addTo(state.mapLayer)
          .bindPopup(`<strong>${d.target_school}</strong><br>Target school`);
        marker.on("click",()=>{
          $("mapSchoolFilter").value=d.target_school;
          state.selectedMapSchool=d.target_school;
          renderMap();
        });
        bounds.push([c.lat,c.lng]);
      }
    }

    if(!seenCondos.has(d.condo)){
      seenCondos.add(d.condo);
      const c=getCoordinate("condo",d.condo);
      if(c){
        const marker=L.marker([c.lat,c.lng],{icon:mapIcon("condo")})
          .addTo(state.mapLayer)
          .bindPopup(`<strong>${d.condo}</strong><br>${d.target_school}<br>${d["3_bed_cost"]}`);
        marker.on("click",()=>renderMapResults(d.target_school,d.condo));
        bounds.push([c.lat,c.lng]);
      }
    }
  });

  if(selected){
    const schoolCoordinate=getCoordinate("school",selected);
    if(schoolCoordinate){
      state.radiusLayer=L.circle([schoolCoordinate.lat,schoolCoordinate.lng],{
        radius:1000,color:"#1e638e",weight:2,fillColor:"#4a9ac5",fillOpacity:.10
      }).addTo(state.map);
      bounds.push([schoolCoordinate.lat,schoolCoordinate.lng]);
    }

    if($("showAlternativeSchools").checked){
      const alternatives=[...new Set(items.flatMap(d=>d.alternative_schools_list||[]))];
      alternatives.forEach(name=>{
        if(seenAlternatives.has(name))return;
        seenAlternatives.add(name);
        const c=getCoordinate("alternative",name)||getCoordinate("school",name);
        if(c){
          L.marker([c.lat,c.lng],{icon:mapIcon("alternative")})
            .addTo(state.mapLayer)
            .bindPopup(`<strong>${name}</strong><br>Alternative school`);
          bounds.push([c.lat,c.lng]);
        }
      });
    }
  }

  renderMapResults(selected);

  if(bounds.length){
    state.map.fitBounds(bounds,{padding:[35,35],maxZoom:selected?15:13});
    setMapStatus(`${bounds.length} mapped locations shown.`, "ok");
  }else{
    state.map.setView([1.3521,103.8198],11);
    setMapStatus("No cached coordinates are available for the current selection. Open OneMap setup to geocode them.","error");
  }
}
function renderMapResults(school="",condo=""){
  const box=$("mapResults");
  if(!box)return;
  let items=school?state.filtered.filter(d=>d.target_school===school):state.filtered;
  if(condo)items=items.filter(d=>d.condo===condo);

  box.innerHTML=`<h3>${school||"Visible pairings"}</h3>
    <p>${items.length} pairing${items.length===1?"":"s"} in the current map selection.</p>
    ${items.slice(0,25).map(d=>`<div class="map-result" data-id="${idOf(d)}">
      <strong>${safe(d.condo)}</strong>
      <span>${safe(d.target_school)} · ${safe(d["3_bed_cost"])} · ${safe(d.overall_score_100)}/100</span>
    </div>`).join("")}
    <div class="map-legend">
      <span><i class="legend-dot school"></i>Target school</span>
      <span><i class="legend-dot condo"></i>Condo</span>
      <span><i class="legend-dot alternative"></i>Alternative school</span>
    </div>`;
  box.querySelectorAll(".map-result").forEach(el=>el.onclick=()=>openDetail(findById(el.dataset.id)));
}
async function oneMapSearch(name,token){
  const endpoint="https://www.onemap.gov.sg/api/common/elastic/search";
  const url=`${endpoint}?searchVal=${encodeURIComponent(name)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  const response=await fetch(url,{headers:{Authorization:token}});
  if(!response.ok)throw new Error(`OneMap Search returned HTTP ${response.status}`);
  const payload=await response.json();
  if(payload.error)throw new Error(payload.error);
  const results=payload.results||[];
  if(!results.length)return null;

  const lower=String(name).toLowerCase();
  const selected=results.find(r=>String(r.SEARCHVAL||"").toLowerCase()===lower)
    ||results.find(r=>String(r.SEARCHVAL||"").toLowerCase().includes(lower))
    ||results[0];

  const lat=Number(selected.LATITUDE),lng=Number(selected.LONGITUDE);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
  return{
    lat,lng,
    searchValue:selected.SEARCHVAL||name,
    address:selected.ADDRESS||"",
    postalCode:selected.POSTAL||""
  };
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function collectGeocodeTasks(scope="all"){
  const source=scope==="visible"?state.filtered:state.data;
  const tasks=[];
  [...new Set(source.map(d=>d.target_school))].forEach(name=>tasks.push(["school",name]));
  [...new Set(source.map(d=>d.condo))].forEach(name=>tasks.push(["condo",name]));
  [...new Set(source.flatMap(d=>d.alternative_schools_list||[]))].forEach(name=>tasks.push(["alternative",name]));
  return tasks;
}
async function geocode(scope){
  const token=($("tokenInput").value||state.oneMapToken||"").trim();
  if(!token){alert("Paste a current OneMap access token first.");return}

  state.oneMapToken=token;
  sessionStorage.setItem("p1_onemap_token",token);

  const tasks=collectGeocodeTasks(scope);
  let completed=0,found=0,failed=0;
  setMapStatus(`Preparing ${tasks.length} unique locations…`,"busy");

  try{
    for(const[type,name]of tasks){
      const key=coordinateKey(type,name);
      if(state.coordinates[key]){
        completed++;found++;
        continue;
      }
      setMapStatus(`Geocoding ${completed+1} of ${tasks.length}: ${name}`,"busy");
      try{
        const result=await oneMapSearch(name,token);
        if(result){state.coordinates[key]=result;found++}
        else failed++;
      }catch(error){
        if(/401|403|token|Forbidden/i.test(error.message))throw error;
        failed++;
      }
      completed++;
      persist();
      await delay(140);
    }
    $("tokenDialog").close();
    setMapStatus(`Geocoding completed: ${found} locations available; ${failed} not found.`,"ok");
    refreshMapSchoolFilter();
    renderMap();
  }catch(error){
    setMapStatus(`${error.message}. Check whether the token has expired.`,"error");
  }
}
function exportCoordinateCache(){
  const blob=new Blob([JSON.stringify(state.coordinates,null,2)],{type:"application/json"});
  const link=document.createElement("a");
  link.href=URL.createObjectURL(blob);
  link.download="onemap-coordinate-cache.json";
  link.click();
  URL.revokeObjectURL(link.href);
}
async function importCoordinateCache(file){
  if(!file)return;
  try{
    const imported=JSON.parse(await file.text());
    if(!imported||typeof imported!=="object"||Array.isArray(imported))throw new Error("Invalid coordinate file");
    state.coordinates={...state.coordinates,...imported};
    persist();
    setMapStatus(`${Object.keys(state.coordinates).length} cached locations available.`,"ok");
    renderMap();
  }catch(error){
    alert(`Could not import coordinate cache: ${error.message}`);
  }
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

  $("mapSetupBtn").onclick=()=>{
    $("tokenInput").value=state.oneMapToken;
    $("tokenDialog").showModal();
  };
  $("closeTokenDialog").onclick=()=>$("tokenDialog").close();
  $("saveTokenBtn").onclick=()=>{
    state.oneMapToken=$("tokenInput").value.trim();
    sessionStorage.setItem("p1_onemap_token",state.oneMapToken);
    setMapStatus("Token saved for this browser session. Choose a geocoding option.","ok");
  };
  $("geocodeVisibleBtn").onclick=()=>geocode("visible");
  $("geocodeAllBtn").onclick=()=>geocode("all");
  $("exportCoordinatesBtn").onclick=exportCoordinateCache;
  $("importCoordinatesInput").onchange=e=>importCoordinateCache(e.target.files[0]);
  $("clearCoordinatesBtn").onclick=()=>{
    state.coordinates={};
    persist();
    setMapStatus("Cached coordinates cleared.","ok");
    renderMap();
  };
  $("mapSchoolFilter").onchange=()=>{
    state.selectedMapSchool=$("mapSchoolFilter").value;
    renderMap();
  };
  $("showAlternativeSchools").onchange=renderMap;
  $("fitMarkersBtn").onclick=renderMap;

  updateCounts();updatePriceRange();applyFilters();
}
init().catch(err=>document.body.innerHTML=`<main class="panel"><h1>Unable to load data</h1><p>${err.message}</p><p>Use GitHub Pages or a local HTTP server.</p></main>`);
