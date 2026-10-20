import { readFileSync } from "node:fs"; import { createSign } from "node:crypto";
const k = JSON.parse(readFileSync(process.env.HOME + "/.config/wren/wren-sender.json", "utf8"));
const now = Math.floor(Date.now()/1000);
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const unsigned = b64({alg:"RS256",typ:"JWT"}) + "." + b64({iss:k.client_email, scope:"https://www.googleapis.com/auth/spreadsheets", aud:k.token_uri, iat:now, exp:now+3600});
const sig = createSign("RSA-SHA256").update(unsigned).sign(k.private_key, "base64url");
const r = await fetch(k.token_uri, {method:"POST", headers:{"content-type":"application/x-www-form-urlencoded"}, body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned+"."+sig})});
const j = await r.json(); if (!j.access_token) { console.error(j); process.exit(1); } process.stdout.write(j.access_token);
