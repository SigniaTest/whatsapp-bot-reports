const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para leer JSON
app.use(bodyParser.json());

// Cliente WhatsApp con sesión persistente en carpeta local
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth/session', // 👈 esta carpeta será subida al repo
  }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

// Muestra QR por consola al iniciar (solo la 1ra vez)
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('📸 Escanea el QR para iniciar sesión');
});

client.on('ready', () => {
  console.log('✅ Cliente de WhatsApp listo y conectado');
});

client.on('authenticated', () => {
  console.log('🔐 Cliente autenticado');
});

client.on('auth_failure', msg => {
  console.error('❌ Fallo de autenticación:', msg);
});

client.on('disconnected', reason => {
  console.log('🔌 Cliente desconectado:', reason);
});

// Endpoint para recibir POST y enviar mensaje
app.post('/send', async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).send('Faltan parámetros: number o message');
  }

  // Asegurarse de que el número tenga formato internacional (con +)
  let fullNumber = number;
  if (!number.includes('@c.us') && !number.includes('@g.us')) {
  fullNumber = `${number}@c.us`; // por defecto
  }


  try {
    await client.sendMessage(fullNumber, message);
    console.log(`📤 Mensaje enviado a ${fullNumber}: ${message}`);
    res.send('✅ Mensaje enviado');
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error);
    res.status(500).send('Error al enviar mensaje');
  }
});

app.get('/status', (req, res) => {
  const isReady = client.info ? true : false;

  res.json({
    status: isReady ? '✅ Conectado a WhatsApp' : '⏳ No conectado aún',
    user: isReady ? client.info.wid.user : null,
    platform: isReady ? client.info.platform : null,
  });
});
// Iniciar servidor Express
app.listen(port, '0.0.0.0',() => {
  console.log(`🚀 Servidor Express escuchando en puerto ${port}`);
});

// Iniciar cliente de WhatsApp
client.initialize();
