import express from 'express';

import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason
} from '@whiskeysockets/baileys';

import P from 'pino';

import path from 'path';

import fs from 'fs';

const app = express();

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {

    res.sendFile(
        path.join(
            process.cwd(),
            'public/index.html'
        )
    );

});

app.post('/pair', async (req, res) => {

    const number = req.body.number;

    if (!number) {

        return res.json({
            status: false,
            message: 'Enter WhatsApp Number'
        });

    }

    try {

        const sessionPath =
            `./sessions/${number}`;

        if (!fs.existsSync('./sessions')) {

            fs.mkdirSync('./sessions');

        }

        const { state, saveCreds } =
            await useMultiFileAuthState(
                sessionPath
            );

        const sock = makeWASocket({

            logger: P({
                level: 'silent'
            }),

            auth: state,

            browser: [
                'sfkazi_pair_bot',
                'Chrome',
                '1.0.0'
            ]

        });

        sock.ev.on(
            'creds.update',
            saveCreds
        );

        sock.ev.on(
            'connection.update',
            async (update) => {

                const {
                    connection,
                    lastDisconnect
                } = update;

                if (connection === 'close') {

                    const shouldReconnect =
                        lastDisconnect?.error?.output?.statusCode !==
                        DisconnectReason.loggedOut;

                    if (shouldReconnect) {

                        console.log(
                            'Reconnecting...'
                        );

                    }

                }

                if (connection === 'open') {

                    console.log(
                        `Connected : ${number}`
                    );

                }

            }
        );

        setTimeout(async () => {

            const code =
                await sock.requestPairingCode(
                    number
                );

            return res.json({
                status: true,
                code
            });

        }, 3000);

    } catch (err) {

        console.log(err);

        return res.json({
            status: false,
            message: 'Failed To Generate Pair Code'
        });

    }

});

app.listen(PORT, () => {

    console.log(
        `Server Running On Port ${PORT}`
    );

});
