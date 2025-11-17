import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import CryptoJS from "crypto-js";

const app = express();
app.use(cors());
app.use(express.json());

const secretKey = "1234567890test";
const keyId = "TEST001";
const statoOptions = ["libero", "checkin", "checkout", "annulato", "prenotato"];

function generateTxId() {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  const numbers = Math.floor(Math.random() * 90000 + 10000);
  return `${numbers}${letters}`;
}

function computeHttpSignature(secretKey, keyId, signingHeaders, messageHeaders) {
  let signingBase = signingHeaders.map(h => `${h.toLowerCase()}: ${messageHeaders[h]}`).join("\n");
  const signingHash = CryptoJS.HmacSHA256(signingBase, secretKey);
  const signatureOptions = {
    keyId,
    algorithm: "hmac-sha256",
    headers: signingHeaders,
    signature: CryptoJS.enc.Base64.stringify(signingHash),
  };
  let signature = 'Signature keyId="${keyId}",algorithm="${algorithm}",headers="${headers}",signature="${signature}"';
  Object.keys(signatureOptions).forEach(key => {
    const pattern = "${" + key + "}";
    const value = typeof signatureOptions[key] !== "string" ? signatureOptions[key].join(" ") : signatureOptions[key];
    signature = signature.replace(pattern, value);
  });
  return signature;
}

app.get("/init-payment", async (req, res) => {
  try {
    const url = "https://testapif.netsgroup.com/MONEYNET_CG_SERVICES/pgw/payment/init";
    const date = new Date().toGMTString();
    const body = JSON.stringify({
      txHead: {
        merId: keyId,
        txId: generateTxId()
      },
      txReq: {
        txOp: "SALE",
        amount: { value: 0, currency: "EUR" }
      },
      poiInfo: { pitype: "CC" },
      buyer: {
        email: "mario.rossi@email.com",
        language: "IT",
        name: "DAVIDE",
        lastName: "MONTAPERTO",
        msisdn: "+391231234567",
        homePhone: "+391231234567",
        workPhone: "+391231234567",
        account: "123455-0233939",
        imei: "356938035643809"
      },
      payer: { name: "DAVIDE", lastName: "MONTAPERTO" },
      callbackURL: "https://testeps.netswgroup.it/IGFS_CG_API/jsp/xml/notification/notify.jsp",
      errorURL: "https://www.merchant.com/error",
      notifyURL: "https://testeps.netswgroup.it/IGFS_CG_API/jsp/xml/notification/notify.jsp"
    });

    const sha256digest = CryptoJS.SHA256(body);
    const digest = "SHA-256=" + CryptoJS.enc.Base64.stringify(sha256digest);

    const uri = "/MONEYNET_CG_SERVICES/pgw/payment/init";
    const host = "testapif.netsgroup.com";
    const method = "post";

    const messageHeaders = { host, date, digest, "(request-target)": `${method} ${uri}` };
    const authorization = computeHttpSignature(secretKey, keyId, ["host","date","(request-target)","digest"], messageHeaders);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host,
        date,
        digest,
        authorization
      },
      body
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel server" });
  }
});

// Porta dinamica Fly.io
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in ascolto su port ${PORT}`));
