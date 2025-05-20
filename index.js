const { Client, LocalAuth, MessageMedia} = require('whatsapp-web.js');
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
  const { number, message, imageUrl } = req.body;

  if (!number || !message) {
    return res.status(400).send('Faltan parámetros: number o message');
  }

  let fullNumber = number;
  if (!number.includes('@c.us') && !number.includes('@g.us')) {
    fullNumber = `${number}@c.us`; // por defecto
  }

  try {
    if (imageUrl) {
      const media = await MessageMedia.fromUrl(imageUrl);
      await client.sendMessage(fullNumber, media, { caption: message });
      console.log(`📤 Imagen enviada a ${fullNumber} con mensaje`);
    } else {
      await client.sendMessage(fullNumber, message);
      console.log(`📤 Mensaje enviado a ${fullNumber}: ${message}`);
    }

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
// Endpoint para listar todos los chats de grupo
app.get('/grupos', async (req, res) => {
  try {
    const chats = await client.getChats();
    const grupos = chats
      .filter(chat => chat.isGroup)
      .map(chat => ({
        nombre: chat.name,
        id: chat.id._serialized
      }));

    res.json(grupos);
  } catch (error) {
    console.error('❌ Error al obtener grupos:', error);
    res.status(500).send('Error al obtener grupos');
  }
});
// Endpoint para obtener todos los contactos
app.get('/contactos', async (req, res) => {
  try {
    const contactos = await client.getContacts();

    const lista = contactos.map(contacto => ({
      nombre: contacto.name || contacto.pushname || "Sin nombre",
      numero: contacto.number,
      id: contacto.id._serialized,
      esUsuarioWA: contacto.isMyContact || false,
      esGrupo: contacto.isGroup || false
    }));

    res.json(lista);
  } catch (error) {
    console.error('❌ Error al obtener contactos:', error);
    res.status(500).send('Error al obtener contactos');
  }
});
// Iniciar servidor Express
app.listen(port, '0.0.0.0',() => {
  console.log(`🚀 Servidor Express escuchando en puerto ${port}`);
});

const os = require('os');
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (let name in interfaces) {
    for (let iface of interfaces[name]) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        iface.address.startsWith("172.23")
      ) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

console.log(`🌐 Servidor accesible desde: http://${getLocalIp()}:${port}/status`);

// Iniciar cliente de WhatsApp
client.initialize();
