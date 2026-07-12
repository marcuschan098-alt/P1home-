const $=id=>document.getElementById(id),safe=v=>v===null||v===undefined||v===""?"—":v,key=(t,n)=>`${t}:${String(n||"").trim().toLowerCase()}`;
const state={pairs:[],schools:[],developments:[],addresses:JSON.parse(localStorage.getItem("v6_addresses")||"[]"),kb:JSON.parse(localStorage.getItem("v6_kb")||"[]"),coordinates:{...JSON.parse(localStorage.getItem("p1_coordinates")||"{}"),...JSON.parse(localStorage.getItem("p1_onemap_coordinates")||"{}")},queue:JSON.parse(localStorage.getItem("v6_queue")||"[]"),token:sessionStorage.getItem("p1_onemap_token")||"",results:[],compare:new Set(JSON.parse(localStorage.getItem("v6_compare")||"[]")),shortlist:new Set(JSON.parse(localStorage.getItem("v6_shortlist")||"[]")),notes:JSON.parse(localStorage.getItem("v6_notes")||"{}"),profile:"balanced",active:null,map:null,base:null,clusters:null,focus:null,radius:null,compact:false,tolerance:Number(localStorage.getItem("v6_tolerance")||50)};
const profiles={balanced:{school:.20,admission:.22,property:.20,family:.18,transit:.12,value:.08},admission:{school:.30,admission:.40,property:.10,family:.08,transit:.07,value:.05},investment:{school:.08,admission:.08,property:.42,family:.10,transit:.12,value:.20},family:{school:.16,admission:.16,property:.12,family:.32,transit:.18,value:.06}};
function persist(){localStorage.setItem("v6_addresses",JSON.stringify(state.addresses));localStorage.setItem("v6_kb",JSON.stringify(state.kb));localStorage.setItem("p1_coordinates",JSON.stringify(state.coordinates));localStorage.setItem("v6_queue",JSON.stringify(state.queue));localStorage.setItem("v6_compare",JSON.stringify([...state.compare]));localStorage.setItem("v6_shortlist",JSON.stringify([...state.shortlist]));localStorage.setItem("v6_notes",JSON.stringify(state.notes));localStorage.setItem("v6_tolerance",String(state.tolerance));$("compareCount").textContent=state.compare.size;$("shortlistCount").textContent=state.shortlist.size}
async function loadJson(url,fallback=[]){try{const r=await fetch(url);if(!r.ok)throw 0;const text=await r.text();if(text.trim().startsWith("<"))throw 0;return JSON.parse(text)}catch{return fallback}}
function coord(t,n){return state.coordinates[key(t,n)]||null}function rad(x){return x*Math.PI/180}function distance(a,b){if(!a||!b)return null;const R=6371008.8,dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng),h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
function classify(m){if(!Number.isFinite(m))return{category:"missing",label:"Missing"};if(Math.abs(m-1000)<=state.tolerance||Math.abs(m-2000)<=state.tolerance)return{category:"boundary",label:"Boundary-sensitive"};if(m<1000)return{category:"within_1km",label:"Within 1 km"};if(m<2000)return{category:"within_2km",label:"1–2 km"};return{category:"outside_2km",label:"Outside 2 km"}}
function decision(p){if(p.generated)return null;const w=profiles[state.profile],v=(k,max)=>Number(p[k]||0)/max;return Math.round((v("school_quality_30",30)*w.school+v("admission_chance_20",20)*w.admission+v("property_investment_20",20)*w.property+v("family_living_15",15)*w.family+v("transit_10",10)*w.transit+v("value_5",5)*w.value)*1000)/10}
function buildKB(){const radius=Number($("matrixRadius").value),records=[];for(const s of state.schools){const sc=coord("school",s.name);if(!sc)continue;for(const d of state.developments){const points=state.addresses.filter(a=>a.condo_id===d.condo_id).map(a=>({label:a.label,query:a.query,c:coord("address",a.query)})).filter(x=>x.c);let evidence="exact_address";if(!points.length){const c=coord("condo",d.name);if(c){points.push({label:d.name,query:d.name,c});evidence="development_point"}}if(!points.length)continue;const ds=points.map(x=>({...x,m:distance(sc,x.c)})).filter(x=>Number.isFinite(x.m)).sort((a,b)=>a.m-b.m);if(!ds.length||ds[0].m>radius)continue;const best=ds[0],worst=ds[ds.length-1],bc=classify(best.m),wc=classify(worst.m);let cat=bc.category,label=bc.label,issue="";if(bc.category!==wc.category){cat="boundary";label="Mixed address result";issue="Different address points cross a category boundary"}else if(cat==="boundary")issue="Near a 1 km or 2 km threshold";records.push({id:`${s.school_id}|${d.condo_id}`,school_id:s.school_id,school_name:s.name,condo_id:d.condo_id,condo_name:d.name,best_m:Math.round(best.m),worst_m:Math.round(worst.m),best_label:best.label,worst_label:worst.label,point_count:ds.length,category:cat,label,evidence,confidence:evidence==="exact_address"&&cat!=="boundary"?"High":cat==="boundary"?"Medium":"Screening",issue,updated_at:new Date().toISOString()})}}state.kb=records;persist();renderKnowledge();apply();$("kbStatus").textContent=`Built ${records.length} records from available coordinates.`}
function kbFor(school,condo){return state.kb.find(x=>x.school_name===school&&x.condo_name===condo)||null}
function generatedForSchool(name){const entries=state.kb.filter(x=>x.school_name===name&&x.best_m<=2000).sort((a,b)=>a.best_m-b.best_m);return entries.map((x,i)=>{const d=state.developments.find(y=>y.condo_id===x.condo_id)||{};return{id:`GEN-${x.id}`,generated:true,target_school:name,school_id:x.school_id,condo:x.condo_name,condo_id:x.condo_id,region:d.region,top_year:d.top_year,tenure:d.tenure,"3_bed_cost":d.three_bed_cost,price_min:d.price_min,price_max:d.price_max,kb:x,overall_score_100:null,admission_risk:"Not assessed"}})}
function apply(){state.profile=$("profile").value;const q=$("search").value.trim(),schoolFilter=$("schoolFilter").value,region=$("regionFilter").value,evidence=$("evidenceFilter").value,dc=$("distanceFilter").value,risk=$("riskFilter").value,top=Number($("topFilter").value||0),min=Number($("priceMin").value),max=Number($("priceMax").value);$("priceText").textContent=`S$${(min/1e6).toFixed(2)}M – S$${(max/1e6).toFixed(2)}M`;let base=[...state.pairs],mode="Curated pairing search";const exactSchool=state.schools.find(s=>s.name.toLowerCase()===q.toLowerCase());if(exactSchool&&!base.some(p=>p.target_school===exactSchool.name)){base=generatedForSchool(exactSchool.name);mode=base.length?`Nearby homes generated for ${exactSchool.name}. These are unscored distance results.`:`${exactSchool.name} is known, but its coordinate or nearby knowledge-base records are missing.`}else if(q)base=base.filter(p=>[p.target_school,p.condo,...(p.alternative_schools_list||[])].join(" ").toLowerCase().includes(q.toLowerCase()));$("searchMode").textContent=mode;state.results=base.filter(p=>{const k=p.kb||kbFor(p.target_school,p.condo),low=Number(p.price_min),high=Number(p.price_max),priceOK=p.generated||!Number.isFinite(low)||!Number.isFinite(high)||(high>=min&&low<=max);return priceOK&&(!schoolFilter||p.target_school===schoolFilter)&&(!region||p.region===region)&&(!risk||p.admission_risk===risk)&&(!top||Number(p.top_year||0)>=top)&&(!evidence||(k?.evidence||"missing")===evidence)&&(!dc||(k?.category||"missing")===dc)});const sort=$("sort").value;state.results.sort((a,b)=>sort==="distance"?(a.kb||kbFor(a.target_school,a.condo))?.best_m-(b.kb||kbFor(b.target_school,b.condo))?.best_m:sort==="admission"?Number(b.admission_chance_20||0)-Number(a.admission_chance_20||0):sort==="property"?Number(b.property_investment_20||0)-Number(a.property_investment_20||0):(decision(b)||-1)-(decision(a)||-1));renderCards();renderMap();$("pairCount").textContent=state.results.length;$("schoolCount").textContent=new Set(state.results.map(x=>x.target_school)).size;$("condoCount").textContent=new Set(state.results.map(x=>x.condo)).size;$("kbCount").textContent=state.kb.length;$("shown").textContent=`${state.results.length} shown`}
function evidenceBadge(k){if(!k)return`<span class="badge missing">Distance missing</span>`;const cls=k.evidence==="exact_address"?"exact":"screen";return`<span class="badge ${cls}">${k.label} · ${k.best_m} m</span><span class="badge ${cls}">${k.evidence==="exact_address"?"Exact address":"Development screening"}</span>`}
function card(p){const k=p.kb||kbFor(p.target_school,p.condo),id=p.id,score=decision(p);return`<article class="card ${state.active?.id===id?"active":""}" data-id="${id}"><div class="cardtop"><div><h3>${safe(p.target_school)}</h3><div class="condo">${safe(p.condo)}</div></div><span class="score">${score??"—"}</span></div><div class="badges">${evidenceBadge(k)}<span class="badge">${safe(p.admission_risk)}</span><span class="badge">${safe(p["3_bed_cost"])}</span></div><div class="cardactions"><button class="detail">Details</button><button class="cmp ${state.compare.has(id)?"on":""}">Compare</button><button class="save ${state.shortlist.has(id)?"on":""}">Save</button></div></article>`}
function renderCards(){$("cards").classList.toggle("compact",state.compact);$("cards").innerHTML=state.results.map(card).join("")||"<p>No matching results.</p>";document.querySelectorAll(".card").forEach(el=>{const p=state.results.find(x=>x.id===el.dataset.id);el.onclick=e=>{if(e.target.tagName!=="BUTTON")focus(p)};el.querySelector(".detail").onclick=()=>details(p);el.querySelector(".cmp").onclick=()=>toggle(state.compare,p.id);el.querySelector(".save").onclick=()=>toggle(state.shortlist,p.id)})}
function toggle(set,id){set.has(id)?set.delete(id):set.add(id);persist();renderCards();renderCompare();renderShortlist()}
function ensureMap(){if(state.map)return;state.map=L.map("map").setView([1.3521,103.8198],11);state.base=L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png",{detectRetina:true,minZoom:11,maxZoom:19}).addTo(state.map);state.clusters=L.markerClusterGroup();state.focus=L.layerGroup();state.map.addLayer(state.clusters);state.map.addLayer(state.focus)}
function icon(t){const ch=t==="s"?"S":t==="c"?"C":"A",n=t==="s"?29:t==="c"?25:20;return L.divIcon({className:"",html:`<div class="marker ${t}">${ch}</div>`,iconSize:[n,n],iconAnchor:[n/2,n/2]})}
function renderMap(){ensureMap();state.clusters.clearLayers();state.focus.clearLayers();if(state.radius){state.map.removeLayer(state.radius);state.radius=null}const bounds=[];if(state.active){const p=state.active,s=coord("school",p.target_school),c=coord("condo",p.condo),k=p.kb||kbFor(p.target_school,p.condo);if(s){L.marker([s.lat,s.lng],{icon:icon("s")}).addTo(state.focus);state.radius=L.circle([s.lat,s.lng],{radius:1000,color:"#17628d",fillOpacity:.08}).addTo(state.map);bounds.push([s.lat,s.lng])}if(c){L.marker([c.lat,c.lng],{icon:icon("c")}).addTo(state.focus);bounds.push([c.lat,c.lng])}for(const a of state.addresses.filter(x=>x.condo_id===p.condo_id)){const ac=coord("address",a.query);if(ac){L.marker([ac.lat,ac.lng],{icon:icon("a")}).bindPopup(a.label).addTo(state.focus);bounds.push([ac.lat,ac.lng])}}if(bounds.length)state.map.fitBounds(bounds,{padding:[55,55],maxZoom:16});$("mapStatus").textContent=k?`${k.label}; ${k.evidence.replace("_"," ")}`:"Distance evidence missing";return}const seenS=new Set(),seenC=new Set();for(const p of state.results){if(!seenS.has(p.target_school)){seenS.add(p.target_school);const c=coord("school",p.target_school);if(c){state.clusters.addLayer(L.marker([c.lat,c.lng],{icon:icon("s")}));bounds.push([c.lat,c.lng])}}if(!seenC.has(p.condo)){seenC.add(p.condo);const c=coord("condo",p.condo);if(c){state.clusters.addLayer(L.marker([c.lat,c.lng],{icon:icon("c")}));bounds.push([c.lat,c.lng])}}}if(bounds.length)state.map.fitBounds(bounds,{padding:[45,45],maxZoom:13});$("mapStatus").textContent=bounds.length?`${bounds.length} mapped locations shown.`:"Coordinates missing. Open Knowledge Base admin."}
function focus(p){state.active=p;$("showAll").classList.remove("hidden");renderCards();renderMap()}
function clearFocus(){state.active=null;$("showAll").classList.add("hidden");$("drawer").classList.remove("open");renderCards();renderMap()}
function details(p){focus(p);const k=p.kb||kbFor(p.target_school,p.condo),score=decision(p);$("details").innerHTML=`<h2>${p.target_school}</h2><h3 class="condo">${p.condo}</h3><div class="detailhero"><b>${score??"Unscored"}</b><p>${p.generated?"This is a distance-only result. Admission and property scores have not been invented.":"Profile-specific decision score."}</p></div><div class="detailgrid"><div><small>Distance category</small><b>${safe(k?.label)}</b></div><div><small>Evidence</small><b>${k?.evidence==="exact_address"?"Exact residential address":"Development-level screening"}</b></div><div><small>Best point</small><b>${safe(k?.best_label)} · ${safe(k?.best_m)} m</b></div><div><small>Worst point</small><b>${safe(k?.worst_label)} · ${safe(k?.worst_m)} m</b></div><div><small>Confidence</small><b>${safe(k?.confidence)}</b></div><div><small>Updated</small><b>${k?new Date(k.updated_at).toLocaleDateString():"—"}</b></div></div><div class="evidence"><h3>Interpretation</h3><p>${k?.evidence==="exact_address"?`Based on ${k.point_count} exact residential address point(s).`:`Based on a development-level point. Add exact blocks or postal codes to upgrade confidence.`}</p>${k?.issue?`<p><b>Issue:</b> ${k.issue}</p>`:""}</div><label>My note<textarea id="note" style="width:100%;min-height:90px">${state.notes[p.id]||""}</textarea></label><button id="saveNote" class="btn gold">Save note</button>`;$("saveNote").onclick=()=>{state.notes[p.id]=$("note").value;persist()};$("drawer").classList.add("open")}
function compareCard(p){const k=p.kb||kbFor(p.target_school,p.condo);return`<article class="comparecard"><h3>${p.target_school}</h3><div class="condo">${p.condo}</div><div class="metric"><span>Decision</span><b>${decision(p)??"Unscored"}</b></div><div class="metric"><span>Distance</span><b>${safe(k?.label)} ${k?.best_m?`(${k.best_m} m)`:""}</b></div><div class="metric"><span>Evidence</span><b>${safe(k?.evidence)}</b></div><div class="metric"><span>Price</span><b>${safe(p["3_bed_cost"])}</b></div></article>`}
function findAny(id){return state.pairs.find(x=>x.id===id)||state.results.find(x=>x.id===id)}function renderCompare(){$("compareGrid").innerHTML=[...state.compare].map(findAny).filter(Boolean).map(compareCard).join("")||"<p>No comparisons selected.</p>"}function renderShortlist(){$("shortlistGrid").innerHTML=[...state.shortlist].map(findAny).filter(Boolean).map(compareCard).join("")||"<p>No saved options.</p>"}
function setView(n){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===n));$(n+"View").classList.add("active");if(n==="explore")setTimeout(()=>{state.map.invalidateSize();renderMap()},50);if(n==="compare")renderCompare();if(n==="shortlist")renderShortlist();if(n==="knowledge")renderKnowledge()}
function renderKnowledge(){$("hSchools").textContent=state.schools.length;$("hDevelopments").textContent=state.developments.length;$("hAddresses").textContent=state.addresses.length;$("hKB").textContent=state.kb.length;$("hExact").textContent=state.kb.filter(x=>x.evidence==="exact_address").length;$("hMissing").textContent=state.schools.filter(s=>!coord("school",s.name)).length+state.developments.filter(d=>!coord("condo",d.name)&&!state.addresses.some(a=>a.condo_id===d.condo_id&&coord("address",a.query))).length;$("addressCondo").innerHTML=state.developments.map(d=>`<option value="${d.condo_id}">${d.name}</option>`).join("");$("kbTable").innerHTML=state.kb.slice().sort((a,b)=>a.school_name.localeCompare(b.school_name)||a.best_m-b.best_m).map(x=>`<tr><td>${x.school_name}</td><td>${x.condo_name}</td><td>${x.best_label}<br>${x.best_m} m</td><td>${x.worst_label}<br>${x.worst_m} m</td><td>${x.label}</td><td>${x.evidence}</td><td>${x.confidence}</td><td>${safe(x.issue)}</td></tr>`).join("")}
function addAddress(){const condo_id=$("addressCondo").value,d=state.developments.find(x=>x.condo_id===condo_id),label=$("addressLabel").value.trim(),query=$("addressQuery").value.trim();if(!label||!query)return $("addressStatus").textContent="Enter a label and exact address or postal code.";state.addresses.push({address_id:`ADDR${String(state.addresses.length+1).padStart(5,"0")}`,condo_id,condo_name:d.name,label,query,created_at:new Date().toISOString()});persist();$("addressStatus").textContent=`Added ${label}. Run exact-address geocoding, then rebuild the KB.`;renderKnowledge()}
async function searchOneMap(n){const r=await fetch(`https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(n)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,{headers:{Authorization:`Bearer ${state.token}`}});if(!r.ok)throw new Error(`OneMap HTTP ${r.status}`);const p=await r.json(),a=p.results||[];if(!a.length)return null;const q=n.toLowerCase(),x=a.find(z=>String(z.SEARCHVAL||"").toLowerCase()===q)||a[0],lat=Number(x.LATITUDE),lng=Number(x.LONGITUDE);return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng,label:x.SEARCHVAL,address:x.ADDRESS,postal:x.POSTAL||"",checked_at:new Date().toISOString()}:null}
async function runQueue(tasks){if(!state.token)return alert("Paste a OneMap token first.");state.queue=[...tasks];persist();let done=0;while(state.queue.length){const[t,n]=state.queue[0],k=key(t,n);$("progress").textContent=`${done+1}/${tasks.length}: ${n}`;if(!state.coordinates[k]){try{const x=await searchOneMap(n);if(x)state.coordinates[k]=x}catch(e){$("progress").textContent=e.message;persist();return}}state.queue.shift();done++;persist();await new Promise(r=>setTimeout(r,160))}$("progress").textContent=`Completed ${done} searches.`;renderKnowledge();apply()}
function exportJson(name,obj){const a=document.createElement("a"),b=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href)}function exportCsv(){const f=["target_school","condo","distance_category","best_distance_m","evidence","decision_score","3_bed_cost"],lines=[f.join(",")].concat(state.results.map(p=>{const k=p.kb||kbFor(p.target_school,p.condo),o={...p,distance_category:k?.label,best_distance_m:k?.best_m,evidence:k?.evidence,decision_score:decision(p)};return f.map(x=>`"${String(o[x]??"").replaceAll('"','""')}"`).join(",")}));const a=document.createElement("a"),b=new Blob([lines.join("\n")],{type:"text/csv"});a.href=URL.createObjectURL(b);a.download="p1-home-v6-results.csv";a.click()}
function activateAdmin(){sessionStorage.setItem("v6_admin","1");$("kbNav").classList.remove("hidden");setView("knowledge")}

function entityInventory(){
  const schools=(state.platform.schools||[]).map(x=>({type:"school",name:x.name||x.school_name||x.target_school}));
  const condos=(state.platform.condos||[]).map(x=>({type:"condo",name:x.name||x.condo}));
  const blocks=(state.residentialBlocks||[]).map(x=>({type:"block",name:x.address||x.postal||x.label}));
  return [...schools,...condos,...blocks].filter(x=>x.name);
}
function coordinateRecordFor(item){return state.coordinates[key(item.type,item.name)]||null}
function buildCoordinateIssues(){
  const inventory=entityInventory(),issues=[],seen=new Map(),now=Date.now();
  inventory.forEach(item=>{
    const rec=coordinateRecordFor(item);
    if(!rec){issues.push({...item,status:"missing",match:"—",checked:"—"});return}
    if(rec.error){issues.push({...item,status:"failed",match:rec.error,checked:rec.checked_at||"—"});return}
    const age=rec.checked_at?Math.floor((now-Date.parse(rec.checked_at))/86400000):9999;
    if(age>180)issues.push({...item,status:"stale",match:rec.label||rec.address||"—",checked:rec.checked_at||"—"});
    const fingerprint=`${Number(rec.lat).toFixed(6)},${Number(rec.lng).toFixed(6)}`;
    if(seen.has(fingerprint))issues.push({...item,status:"duplicate",match:`Same point as ${seen.get(fingerprint)}`,checked:rec.checked_at||"—"});
    else seen.set(fingerprint,item.name);
  });
  return issues;
}
function coordinateCoverage(){
  const inv=entityInventory(),totals={school:0,condo:0,block:0},done={school:0,condo:0,block:0};
  inv.forEach(x=>{totals[x.type]++;if(coordinateRecordFor(x))done[x.type]++});
  const issues=buildCoordinateIssues();
  return{totals,done,issues,missing:issues.filter(x=>x.status==="missing").length,failed:issues.filter(x=>x.status==="failed").length,duplicates:issues.filter(x=>x.status==="duplicate").length};
}
function renderCoordinateManager(){
  if(!$("coordAuditBody"))return;
  const c=coordinateCoverage();
  $("coordSchoolsDone").textContent=`${c.done.school}/${c.totals.school}`;
  $("coordCondosDone").textContent=`${c.done.condo}/${c.totals.condo}`;
  $("coordBlocksDone").textContent=`${c.done.block}/${c.totals.block}`;
  $("coordMissingCount").textContent=c.missing;
  $("coordFailedCount").textContent=c.failed;
  $("coordDuplicateCount").textContent=c.duplicates;
  const rows=[
    ["Schools",c.done.school,c.totals.school],
    ["Condos",c.done.condo,c.totals.condo],
    ["Residential blocks",c.done.block,c.totals.block]
  ];
  $("coverageProgress").innerHTML=rows.map(([label,done,total])=>`<div class="coverage-row"><header><span>${label}</span><span>${done}/${total}</span></header><progress max="${Math.max(total,1)}" value="${done}"></progress></div>`).join("");
  const f=$("coordAuditFilter").value;
  const filtered=c.issues.filter(x=>!f||x.status===f);
  $("coordAuditBody").innerHTML=filtered.length?filtered.map(x=>`<tr><td>${x.type}</td><td>${safe(x.name)}</td><td><span class="coord-issue ${x.status}">${x.status}</span></td><td>${safe(x.match)}</td><td>${safe(x.checked)}</td><td><button class="btn small coord-retry" data-type="${x.type}" data-name="${String(x.name).replaceAll('"','&quot;')}">Queue</button></td></tr>`).join(""):'<tr><td colspan="6">No issues for this filter.</td></tr>';
  document.querySelectorAll(".coord-retry").forEach(b=>b.onclick=()=>queueOne(b.dataset.type,b.dataset.name));
  const complete=c.missing===0&&c.failed===0&&c.totals.school>0&&c.totals.condo>0;
  $("readinessGate").className=`readiness-gate ${complete?"ready":""}`;
  $("readinessGate").textContent=complete?"Coordinate coverage is ready for distance generation.":"Distance generation is locked until all required school and condo coordinates are present and failed records are resolved.";
  $("generateDistanceDbBtn").disabled=!complete;
}
function queueOne(type,name){
  if(!state.queue.some(x=>x[0]===type&&x[1]===name))state.queue.push([type,name]);
  persist();renderCoordinateManager();
}
function buildMissingQueue(){
  const issues=buildCoordinateIssues().filter(x=>x.status==="missing"||x.status==="failed");
  state.queue=issues.map(x=>[x.type,x.name]);
  persist();$("bulkProgressText").textContent=`Queued ${state.queue.length} missing or failed records.`;renderCoordinateManager();
}
function retryFailed(){
  state.queue=[...state.failedQueue];
  state.failedQueue=[];
  persist();$("bulkProgressText").textContent=`Queued ${state.queue.length} failed records for retry.`;renderCoordinateManager();
}
async function runBulkQueue(){
  const token=($("bulkTokenInput").value||state.token||"").trim();
  if(!token){$("bulkProgressText").textContent="Paste a valid OneMap token.";return}
  state.token=token;sessionStorage.setItem("p1_onemap_token",token);state.bulkPaused=false;
  const total=state.queue.length,bar=$("bulkProgressBar");
  if(!total){$("bulkProgressText").textContent="Queue is empty.";return}
  while(state.queue.length&&!state.bulkPaused){
    const [type,name]=state.queue[0];
    const done=total-state.queue.length;
    bar.value=Math.round(done/total*100);
    $("bulkProgressText").textContent=`${done+1}/${total}: ${name}`;
    try{
      const result=await searchOneMap(name,token);
      if(result)state.coordinates[key(type,name)]={...result,checked_at:new Date().toISOString(),source:"OneMap Search"};
      else{
        state.failedQueue.push([type,name]);
        state.coordinates[key(type,name)]={error:"No result",checked_at:new Date().toISOString()};
      }
    }catch(err){
      state.failedQueue.push([type,name]);
      state.coordinates[key(type,name)]={error:err.message,checked_at:new Date().toISOString()};
      if(/401|403|Failed to fetch/i.test(err.message)){persist();$("bulkProgressText").textContent=`Stopped: ${err.message}`;renderCoordinateManager();return}
    }
    state.queue.shift();persist();renderCoordinateManager();
    await new Promise(r=>setTimeout(r,220));
  }
  bar.value=state.queue.length?Math.round((total-state.queue.length)/total*100):100;
  $("bulkProgressText").textContent=state.bulkPaused?"Paused.":"Bulk geocoding complete.";
  renderCoordinateManager();updateMapKpis();renderMap();
}
async function importJsonFile(file,kind){
  if(!file)return;
  try{
    const obj=JSON.parse(await file.text());
    if(kind==="schools")state.platform.schools=Array.isArray(obj)?obj:(obj.schools||[]);
    if(kind==="condos")state.platform.condos=Array.isArray(obj)?obj:(obj.condos||[]);
    if(kind==="blocks")state.residentialBlocks=Array.isArray(obj)?obj:(obj.blocks||[]);
    if(kind==="coordinates")state.coordinates={...state.coordinates,...obj};
    persist();$("importStatus").textContent=`Imported ${kind}.`;renderCoordinateManager();populateSuggestions();
  }catch{$("importStatus").textContent=`Invalid ${kind} JSON.`}
}
function downloadJson(name,obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);
}
function exportIssueList(status){
  downloadJson(`p1-${status}-coordinates.json`,buildCoordinateIssues().filter(x=>x.status===status));
}
function generateDistanceDatabase(){
  if($("generateDistanceDbBtn").disabled)return;
  buildKnowledgeBase();
  alert("Distance database generated from the current validated coordinates.");
}

async function init(){[state.pairs,state.schools,state.developments]=await Promise.all([loadJson("data/pairings-expanded.json?v=6.1.0"),loadJson("data/schools-v6.json?v=6.1.0"),loadJson("data/developments-v6.json?v=6.1.0")]);const repoCoords=await loadJson("data/coordinates.json?v=6.1.0",{});state.coordinates={...repoCoords,...state.coordinates};if(!state.addresses.length)state.addresses=await loadJson("data/residential-address-points.json?v=6.1.0",[]);if(!state.kb.length)state.kb=await loadJson("data/distance-knowledge-base.json?v=6.1.0",[]);const uniq=(f)=>[...new Set(state.pairs.map(x=>x[f]).filter(Boolean))].sort();for(const [id,vals] of [["schoolFilter",uniq("target_school")],["regionFilter",uniq("region")],["riskFilter",uniq("admission_risk")]])for(const v of vals){const o=document.createElement("option");o.value=o.textContent=v;$(id).appendChild(o)}$("suggestions").innerHTML=[...state.schools.map(s=>s.name),...state.developments.map(d=>d.name)].sort().map(n=>`<option value="${n}"></option>`).join("");document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>setView(b.dataset.view));["search","profile","priceMin","priceMax","schoolFilter","regionFilter","evidenceFilter","distanceFilter","riskFilter","topFilter","sort"].forEach(id=>$(id).addEventListener("input",apply));$("reset").onclick=()=>{["search","schoolFilter","regionFilter","evidenceFilter","distanceFilter","riskFilter","topFilter"].forEach(id=>$(id).value="");$("priceMin").value=1e6;$("priceMax").value=3e6;clearFocus();apply()};$("fit").onclick=renderMap;$("showAll").onclick=clearFocus;$("reload").onclick=()=>{state.map.removeLayer(state.base);state.base=L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png",{detectRetina:true,minZoom:11,maxZoom:19}).addTo(state.map)};$("compact").onclick=()=>{state.compact=!state.compact;$("compact").textContent=state.compact?"Expanded":"Compact";renderCards()};$("closeDrawer").onclick=()=>$("drawer").classList.remove("open");$("clearCompare").onclick=()=>{state.compare.clear();persist();renderCompare()};$("clearShortlist").onclick=()=>{state.shortlist.clear();persist();renderShortlist()};$("exportBtn").onclick=exportCsv;$("openSetup").onclick=()=>{$("token").value=state.token;$("setup").showModal()};$("closeSetup").onclick=()=>$("setup").close();$("saveToken").onclick=()=>{state.token=$("token").value.trim();sessionStorage.setItem("p1_onemap_token",state.token)};$("geocodeKnown").onclick=()=>runQueue([...state.schools.map(s=>["school",s.name]),...state.developments.map(d=>["condo",d.name])]);$("geocodeAddresses").onclick=()=>runQueue(state.addresses.map(a=>["address",a.query]));$("resume").onclick=()=>runQueue(state.queue);$("exportCoords").onclick=()=>exportJson("p1-v6-coordinates.json",state.coordinates);$("importCoords").onchange=async e=>{const o=JSON.parse(await e.target.files[0].text());state.coordinates={...state.coordinates,...o};persist();renderKnowledge();apply()};$("addAddress").onclick=addAddress;$("buildKB").onclick=buildKB;$("exportKB").onclick=()=>exportJson("p1-v6-distance-knowledge-base.json",state.kb);$("tolerance").onchange=()=>{state.tolerance=Number($("tolerance").value);persist()};$("exitAdmin").onclick=()=>setView("explore");document.addEventListener("keydown",e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="a")activateAdmin();if(e.key==="Escape")$("drawer").classList.remove("open")});let taps=0,timer;$("brandTrigger").onclick=()=>{taps++;clearTimeout(timer);timer=setTimeout(()=>taps=0,1000);if(taps>=7)activateAdmin()};if(location.hash==="#admin"||sessionStorage.getItem("v6_admin")==="1")$("kbNav").classList.remove("hidden");persist();ensureMap();apply();renderKnowledge()}
init().catch(e=>document.body.innerHTML=`<main style="padding:30px"><h1>Unable to load Version 6</h1><p>${e.message}</p></main>`);