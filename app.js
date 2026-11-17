const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(n||0)),day=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")},month=()=>day().slice(0,7),df=s=>s?new Date(s+"T12:00:00").toLocaleDateString("pt-BR"):"—",esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LOCAL_PROFILE_ID="financeiro-amigo-local-profile";
const cats=["Moradia","Alimentação","Transporte","Saúde","Educação","Lazer","Compras","Assinaturas","Salário","Freelance","Investimentos","Outros"],titles={dashboard:"Visão geral",transactions:"Lançamentos",cards:"Cartões e parcelas",bills:"Contas a pagar",goals:"Metas de economia",reports:"Relatórios"},tables={transaction:"transactions",card:"cards",installment:"installments",bill:"bills",goal:"goals"};
let db=null,user,rows={transactions:[],cards:[],installments:[],bills:[],goals:[]},edit=null,kind=null;
function parseMoney(value){const raw=String(value??"").trim().replace(/R\$|\s/g,"");if(!raw)return null;let normalized=raw;if(raw.includes(",")&&raw.includes(".")){normalized=raw.lastIndexOf(",")>raw.lastIndexOf(".")?raw.replace(/\./g,"").replace(",","."):raw.replace(/,/g,"")}else if(raw.includes(",")){normalized=raw.replace(",",".")}const number=Number(normalized);return Number.isFinite(number)?number:NaN}
function msg(id,s){const node=$(id);if(node)node.textContent=s||""}
function toast(s,err=false){const e=$("toast");if(!e)return;e.textContent=s;e.classList.toggle("error",err);e.classList.remove("hidden");window.setTimeout(()=>e.classList.add("hidden"),3500)}
function init(){
 if($("monthFilter"))$("monthFilter").value=month();
 $("navigation").onclick=e=>{const b=e.target.closest("[data-page]");if(b)go(b.dataset.page)};
 document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>go(b.dataset.goto));
 $("menuBtn").onclick=()=>$("app").querySelector(".sidebar").classList.toggle("open");
 $("monthFilter").onchange=render;
 $("quickAddBtn").onclick=$("addTransactionBtn").onclick=()=>open("transaction");
 $("addCardBtn").onclick=()=>open("card");
 $("addInstallmentBtn").onclick=()=>open("installment");
 $("addBillBtn").onclick=()=>open("bill");
 $("addGoalBtn").onclick=()=>open("goal");
 $("transactionSearch").oninput=renderTransactions;
 $("typeFilter").onchange=renderTransactions;
 $("closeModalBtn").onclick=$("cancelModalBtn").onclick=close;
 $("modalBackdrop").onclick=e=>{if(e.target===$("modalBackdrop"))close()};
 $("editorForm").onsubmit=save;
 document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
 $("exportBackupBtn").onclick=exportBackup;
 $("importBackupBtn").onclick=()=>$("backupFileInput").click();
 $("backupFileInput").onchange=restoreBackup;
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&user)load()});
 enterLocalSpace();
}
async function enterLocalSpace(){
 user={id:LOCAL_PROFILE_ID,email:"Salvo neste aparelho",offlineOnly:true};
 $("authScreen").classList.add("hidden");
 $("app").classList.remove("hidden");
 const todayLabel=$("todayLabel");if(todayLabel)todayLabel.textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
 await load();
}
async function refreshSyncStatus(){
 const badge=$("syncStatus");
 if(!badge)return;
 badge.classList.remove("hidden");
 badge.textContent="Salvo neste aparelho";
 badge.title="Os dados ficam neste navegador. Exporte um backup para guardá-los.";
}
async function exportBackup(){
 try{
  const contents=await FinanceOffline.exportBackup(user.id);
  const blob=new Blob([contents],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="financeiro-amigo-backup-"+day()+".json";
  document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("Backup baixado. Guarde o arquivo em um local seguro.");
 }catch(error){toast(error.message||"Não foi possível criar o backup.",true)}
}
async function restoreBackup(event){
 const file=event.target.files?.[0];
 if(!file)return;
 try{
  if(file.size>5*1024*1024)throw new Error("O arquivo é maior que o limite de 5 MB.");
  if(!window.confirm("Restaurar este backup substituirá os dados atuais deste aparelho. Exporte um backup atual antes de continuar. Deseja prosseguir?"))return;
  const result=await FinanceOffline.restoreBackup(user.id,await file.text());
  rows=await FinanceOffline.getRows(user.id);render();go("dashboard");
  const total=Object.values(result.counts).reduce((sum,value)=>sum+value,0);
  toast(total+" registro(s) restaurado(s) com sucesso.");
 }catch(error){toast(error.message||"Não foi possível restaurar este backup.",true)}
 finally{event.target.value=""}
}
function go(p){document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$(p+"Page").classList.remove("hidden");document.querySelectorAll(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===p));$("pageTitle").textContent=titles[p];$("app").querySelector(".sidebar").classList.remove("open");render();scrollTo({top:0,behavior:"smooth"})}
async function load(){
 if(!user||!window.FinanceOffline)return;
 try{
  rows=await FinanceOffline.getRows(user.id);
  render();
  await refreshSyncStatus();
 }catch(error){
  console.error("Falha ao abrir dados locais:",error);
  toast(error.message||"Não foi possível abrir os dados salvos neste aparelho.",true);
 }
}
function monthly(){let m=$("monthFilter").value||month();return rows.transactions.filter(t=>(t.date||"").startsWith(m))}function sum(a){return a.reduce((s,x)=>s+Number(x.amount||0),0)}function group(a){let g={};a.forEach(x=>g[x.category||"Outros"]=(g[x.category||"Outros"]||0)+Number(x.amount));return Object.entries(g).sort((a,b)=>b[1]-a[1])}
function bars(g,limit=99){let max=g[0]?.[1]||1;return g.length?g.slice(0,limit).map(([n,v])=>'<div class="category-line"><span class="cat-name">'+esc(n)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+(v/max*100)+'%"></div></div><strong>'+fmt(v)+'</strong></div>').join(""):'<div class="empty-state">Seus gastos aparecerão aqui quando você registrar lançamentos.</div>'}
function render(){dashboard();renderTransactions();renderCards();renderInstallments();renderBills();renderGoals();reports()}
function dashboard(){let a=monthly(),inc=sum(a.filter(x=>x.type==="income")),exp=sum(a.filter(x=>x.type==="expense"));$("balanceValue").textContent=fmt(inc-exp);$("incomeValue").textContent=fmt(inc);$("expenseValue").textContent=fmt(exp);let pending=rows.bills.filter(x=>!x.paid);$("categoryChart").innerHTML=bars(group(a.filter(x=>x.type==="expense")),6);let bills=pending.sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,4);$("upcomingBills").innerHTML=bills.length?bills.map(b=>'<div class="compact-item"><div><strong>'+esc(b.name)+'</strong><small>'+df(b.due_date)+' · '+(b.due_date<day()?"Vencida":"A vencer")+'</small></div><strong>'+fmt(b.amount)+'</strong></div>').join(""):'<div class="empty-state">Nenhuma conta pendente.</div>';$("recentTransactions").innerHTML=txTable([...a].sort((x,y)=>y.date.localeCompare(x.date)).slice(0,5),false)}
function txTable(a,actions=true){if(!a.length)return '<div class="empty-state">Nenhum lançamento encontrado.</div>';return '<div class="table-wrap"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th>'+(actions?"<th>Ações</th>":"")+'</tr></thead><tbody>'+a.map(t=>'<tr><td><strong>'+esc(t.description)+'</strong></td><td><span class="tag">'+esc(t.category||"Outros")+'</span></td><td>'+df(t.date)+'</td><td class="'+(t.type==="income"?"amount-income":"amount-expense")+'">'+(t.type==="income"?"+":"−")+' '+fmt(t.amount)+'</td>'+(actions?'<td><button class="mini-btn" data-edit="transaction" data-id="'+t.id+'">Editar</button> <button class="mini-btn danger" data-del="transaction" data-id="'+t.id+'">Excluir</button></td>':"")+'</tr>').join("")+'</tbody></table></div>'}
function renderTransactions(){let q=($("transactionSearch").value||"").toLowerCase(),t=$("typeFilter").value,a=[...rows.transactions].filter(x=>(!q||(x.description+" "+x.category).toLowerCase().includes(q))&&(!t||x.type===t)).sort((a,b)=>b.date.localeCompare(a.date));$("transactionsTable").innerHTML=txTable(a);actions($("transactionsTable"))}
function bankIdentity(bank){
 const words=String(bank||"Banco").trim().split(/\s+/).filter(Boolean);
 return {short:words.slice(0,2).map(word=>word[0]).join("").toUpperCase()||"CC",bg:"var(--color-accent-wash)",fg:"var(--color-accent)"};
}
function renderCards(){
 $("cardsList").innerHTML=rows.cards.length?rows.cards.map(c=>{
  let bi=bankIdentity(c.bank);
  return '<article class="bank-card"><div class="bank-card-head"><div class="bank-identity"><span class="institution-mark" style="--mark-bg:'+bi.bg+';--mark-color:'+bi.fg+'">'+esc(bi.short)+'</span><div class="bank-identity-text"><span class="bank-institution">'+esc(c.bank||"Instituição não informada")+'</span><strong>'+esc(c.name)+'</strong></div></div><div class="row-actions card-actions"><button class="mini-btn" data-edit="card" data-id="'+c.id+'">Editar</button> <button class="mini-btn danger" data-del="card" data-id="'+c.id+'">Excluir</button></div></div><div class="card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;'+esc(c.last_four||"••••")+'</div><div class="bank-card-foot"><div><span class="card-meta">LIMITE TOTAL</span><strong>'+fmt(c.limit_amount)+'</strong></div><span class="network-label">'+esc((c.network||"Visa").toUpperCase())+'</span></div><div class="card-cycle">Fecha '+esc(c.closing_day||"—")+' · Vence '+esc(c.due_day||"—")+'</div></article>';
 }).join(""):'<div class="panel empty-state">Cadastre seu primeiro cartão.</div>';
 actions($("cardsList"));
}
function renderInstallments(){$("installmentsTable").innerHTML=rows.installments.length?'<div class="table-wrap"><table><thead><tr><th>Compra</th><th>Cartão</th><th>Total</th><th>Parcela mensal</th><th>Progresso</th><th>Ações</th></tr></thead><tbody>'+rows.installments.map(i=>'<tr><td>'+esc(i.description)+'</td><td>'+esc(rows.cards.find(c=>c.id===i.card_id)?.name||"—")+'</td><td>'+fmt(i.total_amount)+'</td><td>'+fmt(Number(i.total_amount)/Number(i.installments_count))+'</td><td>'+i.paid_installments+'/'+i.installments_count+'</td><td><button class="mini-btn" data-edit="installment" data-id="'+i.id+'">Editar</button> <button class="mini-btn danger" data-del="installment" data-id="'+i.id+'">Excluir</button></td></tr>').join("")+'</tbody></table></div>':'<div class="empty-state">Nenhuma compra parcelada cadastrada.</div>';actions($("installmentsTable"))}
function renderBills(){$("billsTable").innerHTML=rows.bills.length?'<div class="table-wrap"><table><thead><tr><th>Conta</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+[...rows.bills].sort((a,b)=>a.due_date.localeCompare(b.due_date)).map(b=>'<tr><td><strong>'+esc(b.name)+'</strong><br><small class="muted">'+esc(b.category||"Conta")+'</small></td><td>'+df(b.due_date)+'</td><td>'+fmt(b.amount)+'</td><td><span class="tag '+(b.paid?"paid":b.due_date<day()?"overdue":"")+'">'+(b.paid?"Paga":b.due_date<day()?"Atrasada":"Pendente")+'</span></td><td><button class="mini-btn" data-toggle="'+b.id+'">'+(b.paid?"Reabrir":"Marcar paga")+'</button> <button class="mini-btn" data-edit="bill" data-id="'+b.id+'">Editar</button> <button class="mini-btn danger" data-del="bill" data-id="'+b.id+'">Excluir</button></td></tr>').join("")+'</tbody></table></div>':'<div class="empty-state">Nenhuma conta cadastrada.</div>';actions($("billsTable"));$("billsTable").querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>update("bills",b.dataset.toggle,{paid:!rows.bills.find(x=>x.id===b.dataset.toggle).paid}))}
function renderGoals(){$("goalsList").innerHTML=rows.goals.length?rows.goals.map(g=>{let pct=Math.min(100,Number(g.target_amount)?Number(g.saved_amount)/Number(g.target_amount)*100:0);return '<article class="goal-card"><div class="goal-top"><span class="goal-icon">◎</span><div class="row-actions"><button class="mini-btn" data-edit="goal" data-id="'+g.id+'">Editar</button> <button class="mini-btn danger" data-del="goal" data-id="'+g.id+'">Excluir</button></div></div><h3>'+esc(g.name)+'</h3><p class="muted" style="font-size:12px">'+(g.target_date?"Meta até "+df(g.target_date):"Sem data definida")+'</p><strong>'+fmt(g.saved_amount)+'</strong><div class="goal-numbers"><span>de '+fmt(g.target_amount)+'</span><strong>'+Math.round(pct)+'%</strong></div><div class="goal-progress"><span style="width:'+pct+'%"></span></div><div class="goal-actions"><button class="btn secondary" data-contribute="'+g.id+'">＋ Registrar economia</button></div></article>'}).join(""):'<div class="panel empty-state">Crie uma meta para começar a guardar dinheiro.</div>';actions($("goalsList"));$("goalsList").querySelectorAll("[data-contribute]").forEach(b=>b.onclick=()=>open("contribution",rows.goals.find(g=>g.id===b.dataset.contribute)))}
function reports(){let a=monthly(),inc=sum(a.filter(x=>x.type==="income")),exp=sum(a.filter(x=>x.type==="expense")),g=group(a.filter(x=>x.type==="expense"));$("savingRate").textContent=inc?Math.round((inc-exp)/inc*100)+"%":"Sem dados";$("topCategory").textContent=g[0]?.[0]||"Sem dados";$("reportCategories").innerHTML=bars(g)}
function actions(root){root.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>open(b.dataset.edit,find(b.dataset.edit,b.dataset.id)));root.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>remove(b.dataset.del,b.dataset.id))}
function find(k,id){return rows[tables[k]].find(x=>x.id===id)}
async function remove(k,id){
 if(!confirm("Excluir este registro? Essa ação não pode ser desfeita."))return;
 if(!user||!window.FinanceOffline)return toast("Não foi possível abrir o armazenamento local.",true);
 try{
  await FinanceOffline.remove(user.id,db,tables[k],id,!user.offlineOnly);
  rows=await FinanceOffline.getRows(user.id);
  render();refreshSyncStatus();
  toast("Registro excluído deste aparelho.");
 }catch(error){toast(error.message||"Não foi possível excluir o registro.",true)}
}
async function update(table,id,p){
 if(!user||!window.FinanceOffline)return toast("Entre na sua conta para alterar seus dados.",true);
 try{
  await FinanceOffline.update(user.id,db,table,id,p,!user.offlineOnly);
  rows=await FinanceOffline.getRows(user.id);
  render();refreshSyncStatus();
  toast("Alteração salva neste aparelho.");
 }catch(error){toast(error.message||"Não foi possível atualizar.",true)}
}
function field(n,l,t="text",o={}){
 const id="field-"+n;let c;
 if(t==="select")c='<select id="'+id+'" name="'+n+'" '+(o.required?"required":"")+'>'+o.options.map(x=>'<option value="'+esc(x.value)+'">'+esc(x.label)+'</option>').join("")+'</select>';
 else if(t==="textarea")c='<textarea id="'+id+'" name="'+n+'" rows="3"></textarea>';
 else if(t==="money")c='<input id="'+id+'" name="'+n+'" type="text" inputmode="decimal" autocomplete="off" data-money="true" '+(o.required?"required":"")+' placeholder="'+esc(o.placeholder||"0,00")+'">';
 else c='<input id="'+id+'" name="'+n+'" type="'+t+'" '+(o.required?"required":"")+(o.min!==undefined?' min="'+o.min+'"':"")+(o.step?' step="'+o.step+'"':"")+(o.placeholder?' placeholder="'+esc(o.placeholder)+'"':"")+'>';
 return '<div class="form-field'+(o.full?" full-field":"")+'"><label for="'+id+'">'+esc(l)+(o.required?' <span class="required-word">obrigatório</span>':'')+'</label>'+c+'</div>';
}
function open(k,rec=null){edit=rec;kind=k;msg("formMessage","");let f=[],add=(...a)=>f.push(field(...a)),sel=a=>a.map(x=>({value:x,label:x}));if(k==="transaction"){add("type","Tipo","select",{required:true,options:[{value:"expense",label:"Despesa"},{value:"income",label:"Entrada"}]});add("description","Descrição","text",{required:true});add("amount","Valor (R$)","money",{required:true});add("category","Categoria","select",{options:sel(cats)});add("date","Data","date",{required:true});add("payment_method","Forma de pagamento","select",{options:sel(["Pix","Dinheiro","Débito","Crédito","Transferência","Outro"])});add("notes","Observações","textarea",{full:true})}
if(k==="card"){add("name","Nome do cartão","text",{required:true});add("bank","Instituição / banco","text",{placeholder:"Ex.: Nubank, Itaú, Inter..."});add("network","Bandeira do cartão","select",{required:true,options:[{value:"Visa",label:"Visa"},{value:"Mastercard",label:"Mastercard"},{value:"Elo",label:"Elo"},{value:"Hipercard",label:"Hipercard"},{value:"American Express",label:"American Express"},{value:"Outra",label:"Outra"}]});add("last_four","Últimos 4 dígitos","text",{placeholder:"Opcional"});add("limit_amount","Limite total (R$)","money",{placeholder:"Opcional"});add("closing_day","Dia de fechamento","number",{min:"1",step:"1"});add("due_day","Dia de vencimento","number",{min:"1",step:"1"})}
if(k==="installment"){add("description","Descrição da compra","text",{required:true});add("card_id","Cartão","select",{required:true,options:rows.cards.map(c=>({value:c.id,label:c.name}))});add("total_amount","Valor total (R$)","money",{required:true});add("installments_count","Quantidade de parcelas","number",{required:true,min:"1",step:"1"});add("paid_installments","Parcelas já pagas","number",{required:true,min:"0",step:"1"});add("purchase_date","Data da compra","date",{required:true})}
if(k==="bill"){add("name","Nome da conta","text",{required:true});add("amount","Valor (R$)","money",{required:true});add("due_date","Vencimento","date",{required:true});add("category","Categoria","select",{options:sel(["Moradia","Água","Energia","Internet","Telefone","Assinatura","Saúde","Educação","Outros"])});add("paid","Já foi paga?","select",{options:[{value:"false",label:"Não, está pendente"},{value:"true",label:"Sim, foi paga"}]});add("notes","Observações","textarea",{full:true})}
if(k==="goal"){add("name","Nome da meta","text",{required:true});add("target_amount","Valor desejado (R$)","money",{required:true});add("saved_amount","Quanto já guardou (R$)","money",{required:true});add("target_date","Data desejada","date");add("notes","Por que essa meta importa?","textarea",{full:true})}
if(k==="contribution"){add("amount","Quanto você guardou? (R$)","money",{required:true});f.push('<p class="muted full-field">A contribuição será somada à meta “'+esc(rec.name)+'”.</p>')}
$("modalTitle").textContent=({transaction:rec?"Editar lançamento":"Novo lançamento",card:rec?"Editar cartão":"Novo cartão",installment:rec?"Editar compra parcelada":"Nova compra parcelada",bill:rec?"Editar conta":"Nova conta",goal:rec?"Editar meta":"Nova meta",contribution:"Registrar economia"})[k];$("modalFields").innerHTML=f.join("");let form=$("editorForm");if(rec)for(let [n,v] of Object.entries(rec)){let el=form.elements.namedItem(n);if(el)el.value=v??""}if(k==="transaction"&&!rec){form.elements.date.value=day();form.elements.type.value="expense";form.elements.category.value="Outros"}if(k==="bill"&&!rec){form.elements.due_date.value=day();form.elements.paid.value="false"}if(k==="installment"&&!rec){form.elements.purchase_date.value=day();form.elements.paid_installments.value="0";form.elements.card_id.value=rows.cards[0]?.id||""}if(k==="goal"&&!rec)form.elements.saved_amount.value="0";$("modalBackdrop").classList.remove("hidden")}
function close(){$("modalBackdrop").classList.add("hidden");edit=null;kind=null}
async function save(e){
 e.preventDefault();
 if(!kind)return;
 if(!user||!window.FinanceOffline)return msg("formMessage","Não foi possível abrir o armazenamento local.");
 let v=Object.fromEntries(new FormData(e.target).entries()),k=kind,table=tables[k],p={},num=n=>parseMoney(v[n]);
 if(k==="transaction")p={type:v.type,description:v.description.trim(),amount:num("amount"),category:v.category||"Outros",date:v.date,payment_method:v.payment_method||null,notes:v.notes||null};
 if(k==="transaction"&&!(p.amount>0))return msg("formMessage","Informe um valor válido maior que zero. Exemplo: 125,90.");
 if(k==="card"&&p.limit_amount!==null&&!(p.limit_amount>=0))return msg("formMessage","Informe um limite válido ou deixe o campo em branco.");

 if(k==="card")p={name:v.name.trim(),bank:v.bank?.trim()||null,network:v.network||"Visa",last_four:v.last_four?.trim()||null,limit_amount:num("limit_amount"),closing_day:num("closing_day"),due_day:num("due_day")};
 if(k==="installment"){
  if(!rows.cards.some(c=>c.id===v.card_id))return msg("formMessage","Cadastre um cartão antes de adicionar parcelas.");
  p={description:v.description.trim(),card_id:v.card_id,total_amount:num("total_amount"),installments_count:num("installments_count"),paid_installments:num("paid_installments"),purchase_date:v.purchase_date};
  if(!(p.total_amount>0))return msg("formMessage","Informe um valor total válido. Exemplo: 350,00.");
  if(p.paid_installments>p.installments_count)return msg("formMessage","As parcelas pagas não podem exceder o total.");
 }
 if(k==="bill"){p={name:v.name.trim(),amount:num("amount"),due_date:v.due_date,category:v.category||"Outros",paid:v.paid==="true",notes:v.notes||null};if(!(p.amount>0))return msg("formMessage","Informe um valor válido maior que zero. Exemplo: 125,90.");}
 if(k==="goal"){p={name:v.name.trim(),target_amount:num("target_amount"),saved_amount:num("saved_amount"),target_date:v.target_date||null,notes:v.notes||null};if(!(p.target_amount>0)||!(p.saved_amount>=0))return msg("formMessage","Confira os valores da meta. Use valores como 250,00.");}
 if(k==="contribution"){
  let amount=num("amount");
  if(!amount||amount<=0)return msg("formMessage","Informe um valor maior que zero.");
  try{
   await FinanceOffline.update(user.id,db,"goals",edit.id,{saved_amount:Number(edit.saved_amount)+amount},!user.offlineOnly);
   close();rows=await FinanceOffline.getRows(user.id);render();refreshSyncStatus();
   toast("Economia registrada neste aparelho.");
  }catch(error){msg("formMessage",error.message||"Não foi possível registrar a economia.");}
  return;
 }
 let btn=e.submitter;
 if(btn)btn.disabled=true;
 try{
  const id=edit?.id||undefined;
  const record={...(edit||{}),...p,...(id?{id}: {})};
  await FinanceOffline.save(user.id,db,table,record,!edit,!user.offlineOnly);
  close();
  rows=await FinanceOffline.getRows(user.id);
  render();refreshSyncStatus();
  toast("Registro salvo neste aparelho.");
 }catch(error){
  console.error("Falha ao salvar localmente:",error);
  msg("formMessage",error.message||"Não foi possível salvar neste aparelho.");
 }finally{if(btn)btn.disabled=false}
}
init();
