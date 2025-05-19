const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');

const app = express();
app.use(express.json());

let conectado = false;

const client = new Client();

client.on('qr', qr => {
    console.log('🟡 Escanea este QR con el celular (el número del bot):');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    conectado = true;
    console.log('🟢 Bot conectado a WhatsApp!');

    // Esperamos 5 segundos para asegurarnos que cargan los chats
    setTimeout(async () => {
        const chats = await client.getChats();
        console.log('\n📋 GRUPOS DONDE ESTÁS:\n');

        if (chats.length === 0) {
            console.log('⚠️ No se encontraron chats aún. Escribe o recibe un mensaje desde un grupo.');
        }

        for (const chat of chats) {
            if (chat.isGroup) {
                console.log(`🧾 Grupo: ${chat.name}`);
                console.log(`🆔 ID: ${chat.id._serialized}\n`);
            }
        }
    }, 5000);
});

client.on('disconnected', () => {
    conectado = false;
    console.log('🔴 Bot desconectado de WhatsApp.');
});

client.initialize();

// Escucha todos los mensajes recibidos
client.on('message', async msg => {
    console.log(`📨 Mensaje recibido de: ${msg.from}`);

    if (msg.from.endsWith('@g.us')) {
        const chat = await msg.getChat();
        console.log('📣 Mensaje recibido de grupo');
        console.log('🧾 Nombre del grupo:', chat.name);
        console.log('🆔 ID del grupo:', chat.id._serialized);
    } else {
        console.log('👤 Mensaje privado');
    }
});

// Endpoint para verificar si está online
app.get('/status', (req, res) => {
    res.json({ online: conectado });
});

// Endpoint para enviar mensaje (texto o imagen)
app.post('/send', async (req, res) => {
    let { to, message, imageUrl } = req.body;

    // Validar si es grupo o contacto
    if (!to.endsWith('@c.us') && !to.endsWith('@g.us')) {
        to += '@c.us'; // Asume que es número de contacto
    }

    try {
        if (imageUrl) {
            const media = await MessageMedia.fromUrl(imageUrl);
            await client.sendMessage(to, media, { caption: message });
        } else {
            await client.sendMessage(to, message);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('❌ Error al enviar mensaje:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Iniciar servidor en localhost:3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 API escuchando en http://localhost:${PORT}`);
});
