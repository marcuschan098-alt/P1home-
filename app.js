const $=id=>document.getElementById(id),safe=v=>v===null||v===undefined||v===""?"—":v,key=(t,n)=>`${t}:${String(n||"").trim().toLowerCase()}`;
const state={pairs:[],schools:[],developments:[],addresses:[],coordinates:{},kb:[],registry:[],results:[],compare:new Set(JSON.parse(localStorage.getItem("v7_compare")||"[]")),shortlist:new Set(JSON.parse(localStorage.getItem("v7_shortlist")||"[]")),notes:JSON.parse(localStorage.getItem("v7_notes")||"{}"),profile:"balanced",active:null,map:null,base:null,markers:null,focus:null,radius:null,compact:false};
const profiles={balanced:{school:.20,admission:.22,property:.20,family:.18,transit:.12,value:.08},admission:{school:.30,admission:.40,property:.10,family:.08,transit:.07,value:.05},investment:{school:.10,admission:.10,property:.42,family:.10,transit:.13,value:.15},family:{school:.20,admission:.15,property:.12,family:.30,transit:.18,value:.05}};
const load=async(url,fallback)=>{try{const r=await fetch(url);if(!r.ok)throw new Error();const t=await r.text();if(t.trim().startsWith("<"))throw new Error();return JSON.parse(t)}catch{return fallback}};
const coord=(t,n)=>state.coordinates[key(t,n)]||null;
const persist=()=>{localStorage.setItem("v7_compare",JSON.stringify([...state.compare]));localStorage.setItem("v7_shortlist",JSON.stringify([...state.shortlist]));localStorage.setItem("v7_notes",JSON.stringify(state.notes));$("compareCount").textContent=state.compare.size;$("shortlistCount").textContent=state.shortlist.size};
function val(p,k){return Number(p[k]||0)}
function decision(p){if(!p.overall_score_100)return null;const w=profiles[state.profile];return Math.round((val(p,"school_quality_30")/30*w.school+val(p,"admission_chance_20")/20*w.admission+val(p,"property_investment_20")/20*w.property+val(p,"family_living_15")/15*w.family+val(p,"transit_score_10")/10*w.transit+val(p,"value_5")/5*w.value)*1000)/10}
function kbFor(s,c){return state.kb.find(x=>x.school_name===s&&x.condo_name===c)}
function range(){let a=Number($("priceMin").value),b=Number($("priceMax").value);if(a>b)[a,b]=[b,a];$("priceText").textContent=`S$${(a/1e6).toFixed(2)}M – S$${(b/1e6).toFixed(2)}M`;return[a,b]}

function registryFor(name){
  return state.registry.find(r=>r.school_name===name||(r.legacy_names||[]).includes(name))||null
}
function canonicalSchool(name){
  const r=registryFor(name);
  return r?.replacement_school||r?.school_name||name
}
function schoolStatus(name){
  return registryFor(name)?.status||"active"
}

function generatedForSchool(name){
  const reg=registryFor(name),canonical=canonicalSchool(name);
  return state.kb.filter(k=>k.school_name===canonical).map(k=>{
    const d=state.developments.find(x=>x.name===k.condo_name)||{};
    return{id:`GEN:${k.school_id}:${k.condo_id}:${name}`,target_school:canonical,
      searched_school:name,legacy_redirect:reg?.status==="merged",registry:reg,
      condo:k.condo_name,condo_id:k.condo_id,school_id:k.school_id,region:d.region||"",
      top_year:d.top_year,tenure:d.tenure,"3_bed_cost":d.three_bed_cost,
      price_min:d.price_min,price_max:d.price_max,kb:k,generated:true}
  })
}
function apply(){
  state.profile=$("profile").value;
  const[a,b]=range(),q=$("search").value.trim(),school=$("schoolFilter").value,
    region=$("regionFilter").value,evidence=$("evidenceFilter").value,
    dist=$("distanceFilter").value,risk=$("riskFilter").value,
    status=$("statusFilter")?.value||"active",top=Number($("topFilter").value||0),
    sort=$("sort").value;
  let base=state.pairs.map(p=>({...p,kb:kbFor(p.target_school,p.condo),registry:registryFor(p.target_school)}));
  if(status==="active")base=base.filter(p=>schoolStatus(p.target_school)!=="merged");
  const knownSchool=state.schools.find(s=>s.name.toLowerCase()===q.toLowerCase())||
    state.registry.find(r=>(r.legacy_names||[]).some(n=>n.toLowerCase()===q.toLowerCase())||r.school_name.toLowerCase()===q.toLowerCase());
  const searchName=knownSchool?.name||knownSchool?.school_name;
  if(q&&searchName)base=generatedForSchool(searchName);
  state.results=base.filter(p=>{
    const k=p.kb,hay=`${p.target_school} ${p.searched_school||""} ${p.condo}`.toLowerCase(),
      priceOk=p.generated||(!Number.isFinite(Number(p.price_min))||!Number.isFinite(Number(p.price_max))||
      (Number(p.price_max)>=a&&Number(p.price_min)<=b));
    return(!q||hay.includes(q.toLowerCase()))&&priceOk&&(!school||p.target_school===school)&&
      (!region||p.region===region)&&(!risk||p.admission_risk===risk)&&
      (!top||Number(p.top_year||0)>=top)&&(!evidence||(k?.evidence||"missing")===evidence)&&
      (!dist||k?.category===dist)
  });
  state.results.sort((x,y)=>sort==="distance"?(x.kb?.best_m??Infinity)-(y.kb?.best_m??Infinity):
    sort==="admission"?val(y,"admission_chance_20")-val(x,"admission_chance_20"):
    sort==="property"?val(y,"property_investment_20")-val(x,"property_investment_20"):
    (decision(y)??-1)-(decision(x)??-1));
  if(q&&searchName){
    const reg=registryFor(searchName);
    $("searchMode").innerHTML=reg?.status==="merged"
      ? `<b>${searchName}</b> merged into <b>${reg.replacement_school}</b>. Showing current nearby homes for the replacement school.`
      : `${canonicalSchool(searchName)}: static distance records loaded.`;
  }else $("searchMode").textContent="Curated pairing search";
  renderStats();renderCards();renderMap()
}
function renderStats(){$("pairCount").textContent=state.results.length;$("schoolCount").textContent=new Set(state.results.map(x=>x.target_school)).size;$("condoCount").textContent=new Set(state.results.map(x=>x.condo)).size;$("kbCount").textContent=state.kb.length;$("shown").textContent=`${state.results.length} shown`}
function badge(k){if(!k)return'<span class="badge missing">Distance missing</span>';return`<span class="badge ${k.category}">${k.label}${k.best_m?` · ${k.best_m} m`:""}</span>`}

function stars(score){
  const n=Math.max(1,Math.min(5,Math.round((Number(score)||0)/20)));
  return "★".repeat(n)+"☆".repeat(5-n)
}
function intelligenceFor(p){
  const score=decision(p),k=p.kb||{},pros=[],cons=[],distance=Number(k.best_m);
  const label=String(k.label||"").toLowerCase();
  if(label.includes("within 1 km")||k.category==="within1km")pros.push("Within 1 km of the target school");
  else if(label.includes("boundary"))cons.push("Boundary-sensitive distance; treat the 1 km classification cautiously");
  else if(Number.isFinite(distance)&&distance<=2000)pros.push("Within 2 km of the target school");
  else cons.push("No verified distance record is available");

  const risk=String(p.admission_risk||"").toLowerCase();
  if(risk==="low")pros.push("Relatively lower admission risk");
  if(["high","very high","extreme"].includes(risk))cons.push("Admission demand is competitive");
  if(Number(p.top_year)>=2018)pros.push("Newer development");
  else if(Number(p.top_year)>0&&Number(p.top_year)<2005)cons.push("Older development");
  if(String(p.tenure||"").toLowerCase().includes("freehold"))pros.push("Freehold tenure");
  if(Number(p.property_investment_20||0)>=16)pros.push("Strong property fundamentals");
  if(Number(p.family_living_15||0)>=12)pros.push("Good family-living fit");
  if(Number(p.transit_10||0)>=8)pros.push("Good transport access");
  if(Number(p.value_5||0)<=2)cons.push("Weaker value score");
  if(Number(p.property_investment_20||0)<=10)cons.push("Property fundamentals are less compelling");

  const alternatives=state.results.filter(x=>x.id!==p.id&&x.target_school===p.target_school)
    .sort((a,b)=>(decision(b)||0)-(decision(a)||0)).slice(0,3);

  let recommendation="Balanced option requiring a closer look at admission evidence, distance confidence and property trade-offs.";
  if(score>=80&&pros.length>=3)recommendation="Strong all-round option for families balancing school access, property quality and day-to-day liveability.";
  else if(score>=70)recommendation="Credible option with several strengths, although the highlighted trade-offs should be checked before purchase.";
  else recommendation="Secondary option. Consider stronger alternatives unless this location or development meets a specific family need.";

  return {score,pros:pros.slice(0,5),cons:cons.slice(0,4),alternatives,recommendation}
}

function showActionFeedback(message){
  let el=$("actionFeedback");
  if(!el){
    el=document.createElement("div");
    el.id="actionFeedback";
    el.className="action-feedback";
    document.body.appendChild(el);
  }
  el.textContent=message;
  el.classList.add("show");
  clearTimeout(showActionFeedback.timer);
  showActionFeedback.timer=setTimeout(()=>el.classList.remove("show"),1800);
}
function closeIntelligence(){
  $("intelligencePanel").classList.remove("open");
  $("intelligencePanel").setAttribute("aria-hidden","true");
}

function openIntelligence(p){
  if(!p)return;
  const intel=intelligenceFor(p),k=p.kb||{};
  $("intelligenceContent").innerHTML=`
    <div class="intel-eyebrow">Decision brief</div>
    <h2>${p.target_school}</h2>
    <h3>${p.condo}</h3>
    <div class="intel-score-row">
      <div><strong>${intel.score==null?"—":Number(intel.score).toFixed(1)}</strong><span>Decision score</span></div>
      <div class="intel-stars">${stars(intel.score)}</div>
      <div><strong>${Number.isFinite(Number(k.best_m))?`${Math.round(Number(k.best_m))} m`:"—"}</strong><span>Best verified distance</span></div>
    </div>
    <section><h4>Overall recommendation</h4><p>${intel.recommendation}</p></section>
    <section><h4>Why it stands out</h4><ul class="intel-pros">${intel.pros.length?intel.pros.map(x=>`<li>✓ ${x}</li>`).join(""):"<li>No clear strengths identified from the current data.</li>"}</ul></section>
    <section><h4>Key trade-offs</h4><ul class="intel-cons">${intel.cons.length?intel.cons.map(x=>`<li>• ${x}</li>`).join(""):"<li>No major concerns identified from the current data.</li>"}</ul></section>
    <section><h4>Alternative condos for the same school</h4><div class="intel-alternatives">${intel.alternatives.length?intel.alternatives.map(x=>`<button data-alt="${x.id}"><b>${x.condo}</b><span>${decision(x)?.toFixed(1)||"—"} score</span></button>`).join(""):"<p>No additional alternatives in the current result set.</p>"}</div></section>
    <div class="intel-actions">
      <button id="intelDetails">Full details</button>
      <button id="intelCompare">Add to compare</button>
      <button id="intelSave">${state.shortlist.has(p.id)?"Saved":"Save"}</button>
    </div>`;
  $("intelligencePanel").classList.add("open");
  $("intelligencePanel").setAttribute("aria-hidden","false");
  document.querySelectorAll("[data-alt]").forEach(b=>b.onclick=()=>openIntelligence(findAny(b.dataset.alt)));
  $("intelDetails").onclick=()=>{
    closeIntelligence();
    openDetails(p);
  };
  $("intelCompare").onclick=()=>{
    state.compare.add(p.id);
    persist();
    renderCompare();
    showActionFeedback("Added to Compare");
    closeIntelligence();
    setView("compare");
  };
  $("intelSave").onclick=()=>{
    const wasSaved=state.shortlist.has(p.id);
    if(wasSaved)state.shortlist.delete(p.id);else state.shortlist.add(p.id);
    persist();
    renderShortlist();
    renderCards();
    showActionFeedback(wasSaved?"Removed from Shortlist":"Saved to Shortlist");
    openIntelligence(p);
  };
}


function scoreBreakdown(p){
  return [
    ["School quality",Number(p.school_quality_30||0),30],
    ["Admission",Number(p.admission_chance_20||0),20],
    ["Property",Number(p.property_investment_20||0),20],
    ["Family living",Number(p.family_living_15||0),15],
    ["Transit",Number(p.transit_10||0),10],
    ["Value",Number(p.value_5||0),5]
  ].filter(x=>x[1]>0)
}
function evidenceLabel(k){
  const e=String(k?.evidence||"").toLowerCase();
  if(e==="development_point")return "Representative development point";
  if(e==="exact_address")return "Exact residential address";
  if(e==="multiple_points")return "Multiple verified points";
  return k?.evidence||"No verified evidence"
}
function distanceDisplay(k){
  if(!k||!Number.isFinite(Number(k.best_m)))return {title:"Distance unavailable",sub:"No verified static record"};
  const best=Math.round(Number(k.best_m)),worst=Math.round(Number(k.worst_m));
  if(Number.isFinite(worst)&&worst!==best)return {title:`${best}–${worst} m`,sub:"Nearest to farthest verified point"};
  return {title:`${best} m`,sub:evidenceLabel(k)}
}
function explainScore(p){
  const out=[];
  for(const [name,val,max] of scoreBreakdown(p)){
    const pct=val/max;
    if(pct>=.8)out.push({type:"positive",text:`${name} contributes strongly (${val}/${max})`});
    else if(pct<=.5)out.push({type:"negative",text:`${name} is a weaker contributor (${val}/${max})`});
  }
  const label=String(p.kb?.label||"").toLowerCase();
  if(label.includes("within 1 km"))out.push({type:"positive",text:"Verified within 1 km"});
  if(label.includes("boundary"))out.push({type:"negative",text:"Distance is boundary-sensitive"});
  if(String(p.tenure||"").toLowerCase().includes("freehold"))out.push({type:"positive",text:"Freehold tenure"});
  if(Number(p.top_year)>=2018)out.push({type:"positive",text:"Newer development"});
  return out.slice(0,6)
}
function openReport(p){
  if(!p)return;
  const k=p.kb||{},dist=distanceDisplay(k),why=explainScore(p),bars=scoreBreakdown(p);
  const alts=state.results.filter(x=>x.id!==p.id&&x.target_school===p.target_school)
    .sort((a,b)=>(decision(b)||0)-(decision(a)||0)).slice(0,4);
  $("reportContent").innerHTML=`
    <div class="report-eyebrow">Property intelligence report</div>
    <h2>${p.target_school}</h2><h3>${p.condo}</h3>
    <div class="report-hero">
      <div><strong>${decision(p)?.toFixed(1)||"—"}</strong><span>Decision score</span></div>
      <div><strong>${dist.title}</strong><span>${dist.sub}</span></div>
      <div><strong>${p["3_bed_cost"]||"—"}</strong><span>Estimated 3-bedroom value</span></div>
    </div>
    <section><h4>Why this recommendation?</h4>
      <div class="report-explanations">${why.length?why.map(x=>`<div class="${x.type}">${x.type==="positive"?"✓":"•"} ${x.text}</div>`).join(""):"<p>No detailed score explanation is available.</p>"}</div>
    </section>
    <section><h4>Score contribution</h4>
      <div class="report-bars">${bars.map(([name,val,max])=>`<div><span>${name}</span><i><b style="width:${Math.min(100,(val/max)*100)}%"></b></i><em>${val}/${max}</em></div>`).join("")}</div>
    </section>
    <section><h4>Property profile</h4>
      <div class="report-grid">
        <div><span>Admission risk</span><b>${p.admission_risk||"—"}</b></div>
        <div><span>TOP</span><b>${p.top_year||"—"}</b></div>
        <div><span>Tenure</span><b>${p.tenure||"—"}</b></div>
        <div><span>Transit</span><b>${p.transit||"—"}</b></div>
        <div><span>Distance evidence</span><b>${evidenceLabel(k)}</b></div>
        <div><span>Confidence</span><b>${k.confidence||"—"}</b></div>
      </div>
    </section>
    <section><h4>Alternative condos for the same school</h4>
      <div class="report-alternatives">${alts.length?alts.map(x=>`<button data-report-alt="${x.id}"><span><b>${x.condo}</b><small>${x["3_bed_cost"]||"—"}</small></span><em>${decision(x)?.toFixed(1)||"—"}</em></button>`).join(""):"<p>No additional alternatives in the current filtered result set.</p>"}</div>
    </section>
    <div class="report-actions"><button id="reportCompare">Add to compare</button><button id="reportSave">${state.shortlist.has(p.id)?"Saved":"Save"}</button></div>`;
  $("reportPanel").classList.add("open");
  $("reportPanel").setAttribute("aria-hidden","false");
  document.querySelectorAll("[data-report-alt]").forEach(b=>b.onclick=()=>openReport(findAny(b.dataset.reportAlt)));
  $("reportCompare").onclick=()=>{state.compare.add(p.id);persist();renderCompare();showActionFeedback("Added to Compare")};
  $("reportSave").onclick=()=>{const s=state.shortlist.has(p.id);s?state.shortlist.delete(p.id):state.shortlist.add(p.id);persist();renderCards();renderShortlist();showActionFeedback(s?"Removed from Shortlist":"Saved to Shortlist");openReport(p)}
}

function card(p){
  const id=p.id,k=p.kb,score=decision(p),saved=state.shortlist.has(id),reg=p.registry||registryFor(p.searched_school||p.target_school),dist=distanceDisplay(k);
  return `<article class="card ${state.compact?"compact-card":"expanded-card"} ${state.active===id?"active":""}" data-id="${id}">
    <div class="cardtop"><div><h3>${p.target_school}</h3><div class="condo">${p.condo}</div></div><b class="score">${score??"—"}</b></div>
    <div class="pills">${p.legacy_redirect?`<span class="badge merged">Merged → ${reg?.replacement_school}</span>`:""}${badge(k)}${p.admission_risk?`<span>${p.admission_risk}</span>`:""}${p["3_bed_cost"]?`<span>${p["3_bed_cost"]}</span>`:""}${p.generated?'<span>Unscored nearby result</span>':""}</div>
    <div class="compact-summary"><span>${dist.title}</span><span>${p.top_year||"—"} · ${p.tenure||"—"}</span></div>
    ${state.compact?"":`<div class="expanded-metrics">
      <div><span>Admission</span><b>${p.admission_chance_20??"—"}/20</b></div>
      <div><span>Property</span><b>${p.property_investment_20??"—"}/20</b></div>
      <div><span>Family</span><b>${p.family_living_15??"—"}/15</b></div>
      <div><span>Evidence</span><b>${evidenceLabel(k)}</b></div>
    </div>`}
    <div class="cardactions"><button data-act="insight">Insight</button><button data-act="report">Report</button><button data-act="details">Details</button><button data-act="compare">Compare</button><button data-act="save">${saved?"Saved":"Save"}</button></div>
  </article>`
}
function renderCards(){$("cards").innerHTML=state.results.length?state.results.map(card).join(""):"<p>No matching results.</p>";document.querySelectorAll(".card").forEach(el=>el.onclick=e=>{const p=state.results.find(x=>x.id===el.dataset.id);if(!p)return;if(e.target.dataset.act==="insight")openIntelligence(p);else if(e.target.dataset.act==="report")openReport(p);else if(e.target.dataset.act==="details")openDetails(p);else if(e.target.dataset.act==="compare"){
  state.compare.add(p.id);persist();renderCompare();showActionFeedback("Added to Compare");setView("compare")
}else if(e.target.dataset.act==="save"){
  const wasSaved=state.shortlist.has(p.id);
  if(wasSaved)state.shortlist.delete(p.id);else state.shortlist.add(p.id);
  persist();renderCards();renderShortlist();
  showActionFeedback(wasSaved?"Removed from Shortlist":"Saved to Shortlist")
}else focus(p)})}
function ensureMap(){if(state.map)return;state.map=L.map("map",{zoomControl:false}).setView([1.3521,103.8198],11);L.control.zoom({position:"bottomright"}).addTo(state.map);state.base=L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png",{detectRetina:true,minZoom:11,maxZoom:19}).addTo(state.map);state.markers=L.layerGroup().addTo(state.map);state.focus=L.layerGroup().addTo(state.map)}
function marker(type,label){return L.divIcon({className:"",html:`<div class="marker ${type}">${label}</div>`,iconSize:[28,28],iconAnchor:[14,14]})}
function renderMap(){
  ensureMap();state.markers.clearLayers();state.focus.clearLayers();
  if(state.radius){state.map.removeLayer(state.radius);state.radius=null}
  const bounds=[],seenS=new Set(),seenC=new Set();
  for(const p of state.results){
    const s=coord("school",p.target_school),c=coord("condo",p.condo);
    if(s&&!seenS.has(p.target_school)){
      seenS.add(p.target_school);
      const related=state.results.filter(r=>r.target_school===p.target_school).slice(0,3).map(r=>r.condo);
      L.marker([s.lat,s.lng],{icon:marker("school","S")}).addTo(state.markers)
        .bindPopup(`<div class="marker-popup"><b>${p.target_school}</b><small>School</small>${related.map(x=>`<span>${x}</span>`).join("")}</div>`);
      bounds.push([s.lat,s.lng])
    }
    if(c&&!seenC.has(p.condo)){
      seenC.add(p.condo);
      const related=state.results.filter(r=>r.condo===p.condo).slice(0,3).map(r=>r.target_school);
      L.marker([c.lat,c.lng],{icon:marker("condo","C")}).addTo(state.markers)
        .bindPopup(`<div class="marker-popup"><b>${p.condo}</b><small>Condo</small>${related.map(x=>`<span>${x}</span>`).join("")}</div>`);
      bounds.push([c.lat,c.lng])
    }
  }
  if(bounds.length){state.map.fitBounds(bounds,{padding:[35,35],maxZoom:13});$("mapStatus").textContent=`${bounds.length} static coordinate points shown.`}
  else $("mapStatus").textContent="No static coordinates loaded for the current results."
}
function focus(p){state.active=p.id;const s=coord("school",p.target_school),c=coord("condo",p.condo);state.focus.clearLayers();if(state.radius){state.map.removeLayer(state.radius);state.radius=null}const b=[];if(s){L.marker([s.lat,s.lng],{icon:marker("school","S")}).addTo(state.focus);state.radius=L.circle([s.lat,s.lng],{radius:1000,color:"#246b91",fillOpacity:.08}).addTo(state.map);b.push([s.lat,s.lng])}if(c){L.marker([c.lat,c.lng],{icon:marker("condo","C")}).addTo(state.focus);b.push([c.lat,c.lng])}if(b.length)state.map.fitBounds(b,{padding:[80,80],maxZoom:16});$("showAll").classList.remove("hidden");renderCards()}
function clearFocus(){state.active=null;$("showAll").classList.add("hidden");renderMap();renderCards()}
function openDetails(p){
  const k=p.kb,dist=distanceDisplay(k),single=Number(k?.best_m)===Number(k?.worst_m);
  $("details").innerHTML=`<h2>${p.target_school}</h2><h3>${p.condo}</h3>
    <div class="detailgrid">
      <div><small>Decision score</small><b>${decision(p)??"Unscored"}</b></div>
      <div><small>Distance category</small><b>${safe(k?.label)}</b></div>
      <div><small>${single?"Measured point":"Nearest point"}</small><b>${safe(k?.best_label)} · ${safe(k?.best_m)} m</b></div>
      ${single?"":`<div><small>Farthest point</small><b>${safe(k?.worst_label)} · ${safe(k?.worst_m)} m</b></div>`}
      <div><small>Evidence</small><b>${evidenceLabel(k)}</b></div>
      <div><small>Confidence</small><b>${safe(k?.confidence)}</b></div>
    </div>
    <p>${p.legacy_redirect?`${p.searched_school} is a legacy school record. Distances shown are for ${p.target_school}; legacy admission and school-quality scores are not transferred.`:(p.generated?"This is a nearby unscored result generated from the static distance database.":"This is a curated pairing with full decision data.")}</p>
    <label>My note<textarea id="note">${state.notes[p.id]||""}</textarea></label><button id="saveNote" class="btn gold">Save note</button>`;
  $("saveNote").onclick=()=>{state.notes[p.id]=$("note").value;persist()};
  $("drawer").classList.add("open")
}
function compareCard(p){const k=p.kb||kbFor(p.target_school,p.condo);return`<article class="comparecard"><h3>${p.target_school}</h3><div class="condo">${p.condo}</div><div class="metric"><span>Decision</span><b>${decision(p)??"Unscored"}</b></div><div class="metric"><span>Distance</span><b>${safe(k?.label)} ${k?.best_m?`(${k.best_m} m)`:""}</b></div><div class="metric"><span>Evidence</span><b>${safe(k?.evidence)}</b></div><div class="metric"><span>Price</span><b>${safe(p["3_bed_cost"])}</b></div></article>`}
function findAny(id){return state.pairs.find(x=>x.id===id)||state.results.find(x=>x.id===id)}
function renderCompare(){$("compareGrid").innerHTML=[...state.compare].map(findAny).filter(Boolean).map(compareCard).join("")||"<p>No comparisons selected.</p>"}
function renderShortlist(){$("shortlistGrid").innerHTML=[...state.shortlist].map(findAny).filter(Boolean).map(compareCard).join("")||"<p>No saved options.</p>"}
function setView(n){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===n));$(n+"View").classList.add("active");if(n==="explore")setTimeout(()=>{state.map.invalidateSize();renderMap()},50);if(n==="compare")renderCompare();if(n==="shortlist")renderShortlist()}
function exportCsv(){const f=["target_school","condo","distance_category","best_distance_m","evidence","decision_score","3_bed_cost"],lines=[f.join(",")].concat(state.results.map(p=>{const k=p.kb||kbFor(p.target_school,p.condo),o={...p,distance_category:k?.label,best_distance_m:k?.best_m,evidence:k?.evidence,decision_score:decision(p)};return f.map(x=>`"${String(o[x]??"").replaceAll('"','""')}"`).join(",")}));const a=document.createElement("a"),b=new Blob([lines.join("\n")],{type:"text/csv"});a.href=URL.createObjectURL(b);a.download="p1-home-v12-results.csv";a.click()}
async function init(){[state.pairs,state.schools,state.developments,state.addresses,state.coordinates,state.kb,state.registry]=await Promise.all([load("data/pairings-expanded.json?v=12.0.0",[]),load("data/schools-v6.json?v=12.0.0",[]),load("data/developments-v6.json?v=12.0.0",[]),load("data/residential-address-points.json?v=12.0.0",[]),load("data/coordinates.json?v=12.0.0",{}),load("data/distance-knowledge-base.json?v=12.0.0",[]),load("data/school-registry.json?v=12.0.0",[])]);const uniq=f=>[...new Set(state.pairs.map(x=>x[f]).filter(Boolean))].sort();for(const [id,vals] of [["schoolFilter",state.schools.map(x=>x.name).sort()],["regionFilter",uniq("region")],["riskFilter",uniq("admission_risk")]])for(const v of vals){const o=document.createElement("option");o.value=o.textContent=v;$(id).appendChild(o)}$("suggestions").innerHTML=[...state.schools.map(s=>s.name),...state.developments.map(d=>d.name)].sort().map(n=>`<option value="${n}"></option>`).join("");document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>setView(b.dataset.view));["search","profile","priceMin","priceMax","schoolFilter","regionFilter","evidenceFilter","distanceFilter","riskFilter","statusFilter","topFilter","sort"].forEach(id=>$(id).addEventListener("input",apply));$("reset").onclick=()=>{["search","schoolFilter","regionFilter","evidenceFilter","distanceFilter","riskFilter","topFilter"].forEach(id=>$(id).value="");$("priceMin").value=1e6;$("priceMax").value=3e6;if($("statusFilter"))$("statusFilter").value="active";clearFocus();apply()};$("fit").onclick=renderMap;$("showAll").onclick=clearFocus;$("reload").onclick=()=>{state.map.removeLayer(state.base);state.base=L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png",{detectRetina:true,minZoom:11,maxZoom:19}).addTo(state.map)};$("compact").onclick=()=>{state.compact=!state.compact;$("compact").textContent=state.compact?"Expanded":"Compact";renderCards()};$("compact").textContent=state.compact?"Expanded":"Compact";$("closeDrawer").onclick=()=>$("drawer").classList.remove("open");$("clearCompare").onclick=()=>{state.compare.clear();persist();renderCompare()};$("clearShortlist").onclick=()=>{state.shortlist.clear();persist();renderShortlist()};$("exportBtn").onclick=exportCsv;persist();ensureMap();const coordinateCount=Object.keys(state.coordinates).length;$("dataStatus").className=`data-status ${coordinateCount&&state.kb.length?"ok":"warn"}`;$("dataStatus").textContent=coordinateCount&&state.kb.length?`${coordinateCount} static coordinates and ${state.kb.length} distance records loaded. No live geocoding is used.`:"Static data is incomplete. Run the Coordinate Builder, then copy its output files into public-app/data.";apply()}
init().catch(e=>document.body.innerHTML=`<main style="padding:30px"><h1>Unable to load Version 12</h1><p>${e.message}</p></main>`);
$("closeIntelligence").onclick=closeIntelligence;
$("fit").classList.add("primary-action");

$("closeReport").onclick=()=>{$("reportPanel").classList.remove("open");$("reportPanel").setAttribute("aria-hidden","true")};
