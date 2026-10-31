/**
 * HakkaBakka POS API — Cloudflare Worker
 * Bindings:
 *   DB      -> existing hakkabakka-admin D1 (admin_sessions, pos_tables, pos_order_counters)
 *   ORDERS  -> existing hb-orders D1 (orders)
 * Auth: requires an existing Admin session token (Bearer token or hb_admin_session cookie).
 * Does not expose payment credentials or mark online payments as paid.
 */
const cors = {
  "Access-Control-Allow-Origin": "https://hakkabakka.in",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Vary": "Origin"
};
const json = (data, status=200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type":"application/json; charset=utf-8", ...cors }
});
const sha256 = async value => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
};
function tokenFrom(request) {
  const auth=request.headers.get("Authorization")||"";
  if(auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookie=request.headers.get("Cookie")||"";
  const match=cookie.match(/(?:^|;\\s*)hb_admin_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}
async function authorized(request, env) {
  const token=tokenFrom(request);
  if(!token || !env.DB) return false;
  const hash=await sha256(token);
  const row=await env.DB.prepare("SELECT expires_at FROM admin_sessions WHERE token_hash=? LIMIT 1").bind(hash).first();
  return !!row && Number(row.expires_at)>Math.floor(Date.now()/1000);
}
const makeOrderNumber = async (env) => {
  const now=new Date();
  const ym=now.getFullYear().toString()+String(now.getMonth()+1).padStart(2,"0");
  await env.DB.prepare("INSERT OR IGNORE INTO pos_order_counters(year_month,last_number) VALUES(?,0)").bind(ym).run();
  await env.DB.prepare("UPDATE pos_order_counters SET last_number=last_number+1 WHERE year_month=?").bind(ym).run();
  const row=await env.DB.prepare("SELECT last_number FROM pos_order_counters WHERE year_month=?").bind(ym).first();
  return "HB-POS-"+ym+"-"+String(row.last_number).padStart(5,"0");
};
export default {
 async fetch(request,env) {
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  const url=new URL(request.url), path=url.pathname.replace(/\\/+$/,"")||"/";
  if(path==="/health") return json({ok:true,service:"hakkabakka-pos-api",mode:"cloudflare-d1"});
  if(!await authorized(request,env)) return json({error:"Admin session required"},401);
  try {
   if(path==="/api/tables" && request.method==="GET") {
    const rows=await env.DB.prepare("SELECT table_no,status,current_order_number,updated_at FROM pos_tables ORDER BY table_no").all();
    return json({tables:rows.results||[]});
   }
   if(path==="/api/orders" && request.method==="GET") {
    const rows=await env.ORDERS.prepare("SELECT order_number,customer_name,mobile,items_json,total_amount,payment_method,payment_status,order_status,created_at FROM orders ORDER BY id DESC LIMIT 100").all();
    return json({orders:(rows.results||[]).map(r=>({...r,details:safeJson(r.items_json)}))});
   }
   if(path==="/api/orders" && request.method==="POST") {
    const body=await request.json();
    const type=String(body.order_type||"").toUpperCase();
    if(!["DINE_IN","TAKEAWAY","DELIVERY"].includes(type)) return json({error:"Invalid order type"},400);
    const table=type==="DINE_IN"?Number(body.table_no):null;
    if(type==="DINE_IN" && (!Number.isInteger(table)||table<1||table>20)) return json({error:"Select a valid table"},400);
    const items=Array.isArray(body.items)?body.items.map(x=>({name:String(x.name||"").trim(),qty:Number(x.qty),price:Number(x.price)})): [];
    if(!items.length || items.some(x=>!x.name||!Number.isInteger(x.qty)||x.qty<1||!Number.isFinite(x.price)||x.price<0)) return json({error:"Invalid items"},400);
    const subtotal=items.reduce((s,x)=>s+x.qty*x.price,0);
    const delivery=type==="DELIVERY"?Math.max(0,Number(body.delivery_charges||0)):0;
    const total=Number((subtotal+delivery).toFixed(2));
    if(!Number.isFinite(total)||total<=0) return json({error:"Invalid total"},400);
    if(type==="DINE_IN") {
      const t=await env.DB.prepare("SELECT status FROM pos_tables WHERE table_no=?").bind(table).first();
      if(!t) return json({error:"Table not configured"},400);
      if(t.status==="OCCUPIED" && !body.allow_table_reuse) return json({error:"Table is occupied"},409);
    }
    const orderNo=await makeOrderNumber(env);
    const detail={source:"POS",order_type:type,table_no:table,items,food_total:subtotal,delivery_charges:delivery,special_instructions:String(body.special_instructions||"")};
    const insert=env.ORDERS.prepare("INSERT INTO orders(order_number,customer_name,mobile,items_json,total_amount,payment_method,payment_status,order_status) VALUES(?,?,?,?,?,?,?,?)")
      .bind(orderNo,String(body.customer_name||"Walk-in").slice(0,100),String(body.mobile||"").slice(0,20),JSON.stringify(detail),total,String(body.payment_method||"CASH").toUpperCase(),"PENDING","NEW");
    const statements=[insert];
    if(type==="DINE_IN") statements.push(env.DB.prepare("UPDATE pos_tables SET status='OCCUPIED',current_order_number=?,updated_at=datetime('now') WHERE table_no=?").bind(orderNo,table));
    await env.ORDERS.batch([insert]);
    if(type==="DINE_IN") await env.DB.prepare("UPDATE pos_tables SET status='OCCUPIED',current_order_number=?,updated_at=datetime('now') WHERE table_no=?").bind(orderNo,table).run();
    return json({success:true,order_number:orderNo,status:"NEW",payment_status:"PENDING",total},201);
   }
   const statusMatch=path.match(/^\\/api\\/orders\\/([^/]+)\\/status$/);
   if(statusMatch && request.method==="PATCH") {
    const status=String((await request.json()).status||"").toUpperCase();
    if(!["NEW","ACCEPTED","PREPARING","READY","OUT_FOR_DELIVERY","COMPLETED","CANCELLED"].includes(status)) return json({error:"Invalid status"},400);
    const result=await env.ORDERS.prepare("UPDATE orders SET order_status=? WHERE order_number=?").bind(status,decodeURIComponent(statusMatch[1])).run();
    if(!result.meta.changes) return json({error:"Order not found"},404);
    if(["COMPLETED","CANCELLED"].includes(status)) {
      const row=await env.ORDERS.prepare("SELECT items_json FROM orders WHERE order_number=?").bind(decodeURIComponent(statusMatch[1])).first();
      const details=safeJson(row?.items_json);
      if(details?.table_no) await env.DB.prepare("UPDATE pos_tables SET status='AVAILABLE',current_order_number=NULL,updated_at=datetime('now') WHERE table_no=? AND current_order_number=?").bind(details.table_no,decodeURIComponent(statusMatch[1])).run();
    }
    return json({success:true,status});
   }
   if(path==="/api/reports/daily" && request.method==="GET") {
    const rows=await env.ORDERS.prepare("SELECT COUNT(*) order_count,COALESCE(SUM(total_amount),0) gross_sales FROM orders WHERE date(created_at)=date('now','localtime') AND json_extract(items_json,'$.source')='POS'").first();
    return json({date:new Date().toISOString().slice(0,10),orders:rows?.order_count||0,gross_sales:rows?.gross_sales||0});
   }
   return json({error:"Not found"},404);
  } catch(error) { console.error("POS API error",error); return json({error:"POS request failed"},500); }
 }
};
function safeJson(value){try{return JSON.parse(value||"{}")}catch{return {}}}
