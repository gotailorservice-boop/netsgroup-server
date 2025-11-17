// server.js
import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

// Memorizziamo in memoria i pagamenti ricevuti (puoi sostituire con un DB)
let payments = [];

// Config test
const secretKey = "1234567890test";
const keyId = "TEST001";

// Funzione per generare TXID casuale
const generateTxId = () => Math.floor(100000 + Math.random() * 900000).toString();

// Funzione per generare HMAC-SHA256 in Base64
const computeHttpSignature = (secretKey, keyId, signingHeaders, messageHeaders) => {
  const signingBase = signingHeaders.map(h => `${h.toLowerCase()}: ${messageHeaders[h]}`).join("\n");
  const hmac = crypto.createHmac("sha256", secretKey).update(signingBase).digest("base64");
  return `Signature keyId="${keyId}",algorithm="hmac-sha256",headers="${signingHeaders.join(
    " "
  )}",signature="${hmac}"`;
};

// --- Endpoint di inizializzazione pagamento
app.post("/payment/init", (req, res) => {
  const body = req.body;

  // Generiamo TXID casuale
  const txId = generateTxId();
  body.txHead.txId = txId;

  // Creiamo digest SHA-256 del body
  const bodyString = JSON.stringify(body);
  const sha256digest = crypto.createHash("sha256").update(bodyString).digest("base64");
  const digest = `SHA-256=${sha256digest}`;

  // Headers fittizi
  const date = new Date().toUTCString();
  const url = "/MONEYNET_CG_SERVICES/pgw/payment/init";
  const messageHeaders = {
    host: "testapif.netsgroup.com",
    date,
    digest,
    "(request-target)": `post ${url}`,
  };
  const authorization = computeHttpSignature(secretKey, keyId, ["host", "date", "(request-target)", "digest"], messageHeaders);

  // Simuliamo la risposta della piattaforma
  const response = {
    txHead: {
      merId: keyId,
      txId,
      resultCode: "IGFS_000",
      errDescription: "",
    },
    paymentId: Math.floor(Math.random() * 1e15).toString(),
    redirectURL: `https://testpayf.netsgroup.com/MONEYNET_CG_WEB/app/cc/main/show?referenceData=${txId}`,
  };

  // Salviamo il pagamento in memoria
  payments.push({ ...body, response });

  res.json(response);
});

// --- Endpoint di notifica server-to-server
app.post("/payment/notify", (req, res) => {
  const notification = req.body;

  console.log("NOTIFICA RICEVUTA:", notification);

  // Salviamo la notifica in memoria
  payments.push({ notification });

  // Rispondiamo subito 200 OK
  res.sendStatus(200);
});

// --- Endpoint per recuperare pagamenti (facoltativo, per test frontend)
app.get("/payments", (req, res) => {
  res.json(payments);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
