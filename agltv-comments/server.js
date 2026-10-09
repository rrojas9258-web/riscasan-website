"use strict";
const express=require("express");
const cors=require("cors");
const helmet=require("helmet");
const {rateLimit}=require("express-rate-limit");
const {Pool}=require("pg");
const crypto=require("crypto");
const app=express();
app.set("trust proxy",1);
const origins=(process.env.ALLOWED_ORIGINS||"https://agltv.onrender.com,https://agltv.com,https://www.agltv.com").split(",").map(x=>x.trim());
app.use(helmet());
app.use(cors({origin:(origin,cb)=>cb(null,!origin||origins.includes(origin))}));
app.use(express.json({limit:"10kb"}));
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DB_SSL==="true"?{rejectUnauthorized:true}:undefined});
const limiter=rateLimit({windowMs:600000,limit:5,standardHeaders:"draft-7",legacyHeaders:false,message:{error:"Twòp kòmantè. Eseye ankò pita."}});
const validId=x=>typeof x==="string"&&x.length>0&&x.length<=200&&/^[a-zA-Z0-9/_?.=&-]+$/.test(x);
app.get("/health",(_req,res)=>res.json({ok:true}));
app.get("/api/comments",async(req,res)=>{const article=req.query.article;if(!validId(article))return res.status(400).json({error:"Atik pa valab"});try{const r=await pool.query("SELECT id,name,body,created_at FROM comments WHERE article_id=$1 ORDER BY created_at DESC LIMIT 200",[article]);res.json(r.rows)}catch(e){console.error(e);res.status(503).json({error:"Kòmantè yo pa disponib"})}});
app.post("/api/comments",limiter,async(req,res)=>{const {article,name,body,website}=req.body||{};if(website)return res.json({ok:true});if(!validId(article)||typeof name!=="string"||typeof body!=="string"||name.trim().length<2||name.trim().length>50||body.trim().length<2||body.trim().length>1000)return res.status(400).json({error:"Verifye non ak kòmantè w."});if(/https?:\/\/|www\./i.test(body))return res.status(400).json({error:"Lyen pa pèmèt."});try{const r=await pool.query("INSERT INTO comments(article_id,name,body) VALUES($1,$2,$3) RETURNING id,name,body,created_at",[article,name.trim(),body.trim()]);res.status(201).json({ok:true,message:"Kòmantè w pibliye.",comment:r.rows[0]})}catch(e){console.error(e);res.status(503).json({error:"Pa ka sove kòmantè a"})}});
function admin(req,res,next){const key=process.env.ADMIN_KEY||"";const supplied=req.get("x-admin-key")||"";if(!key||supplied.length!==key.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(key)))return res.status(401).json({error:"Pa otorize"});next()}
app.get("/api/admin/comments",admin,async(req,res)=>{try{const r=await pool.query("SELECT id,article_id,name,body,created_at FROM comments ORDER BY created_at DESC LIMIT 300");res.set("Cache-Control","no-store");res.json(r.rows)}catch(e){console.error(e);res.status(503).json({error:"Pa ka chaje kòmantè yo"})}});
app.delete("/api/admin/comments/:id",admin,async(req,res)=>{if(!/^\d+$/.test(req.params.id))return res.status(400).json({error:"ID pa valab"});try{await pool.query("DELETE FROM comments WHERE id=$1",[req.params.id]);res.json({ok:true})}catch(e){res.status(503).json({error:"Erè sèvè"})}});
async function start(){await pool.query("CREATE TABLE IF NOT EXISTS comments(id BIGSERIAL PRIMARY KEY,article_id TEXT NOT NULL,name VARCHAR(50) NOT NULL,body VARCHAR(1000) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");await pool.query("CREATE INDEX IF NOT EXISTS comments_article_created_idx ON comments(article_id,created_at DESC)");app.listen(process.env.PORT||3000,()=>console.log("AGL comments API ready"))}
if(!process.env.DATABASE_URL){console.error("DATABASE_URL missing");process.exit(1)}start().catch(e=>{console.error(e);process.exit(1)});
