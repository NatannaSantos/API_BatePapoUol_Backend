import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();

const userSchema = joi.object({
    name: joi.string().required()
});


const server = express();
server.use(cors());
server.use(json());


server.post('/participants', async (req, res) => {
    const user = req.body;
    const validation = userSchema.validate(user, { abortEarly: false });
    if (validation.error) {
        res.status(422).send(validation.error.details.map(error => error.message));
        return;
    }

    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const dbNames = mongoClient.db('batepapouol');
        const namesCollection = dbNames.collection('names');
        const dbMessages = mongoClient.db('batepapouol');
        const MessagesCollection = dbMessages.collection('message');
        const listNames = await namesCollection.find({}).toArray();

        for (let i = 0; i < listNames.length; i++) {
            if (user.name === listNames[i].name) {
                res.status(409).send("usuário já existente");
                return;
            }
        }
        await namesCollection.insertOne({ name: user.name, laststatus: Date.now() });
        await MessagesCollection.insertOne({
            from: user.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format("HH:mm:ss")
        });

        res.sendStatus(201);
        mongoClient.close();
    } catch (error) {
        res.sendStatus(422);
    }

});

server.get('/participants', async (req, res) => {
    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const dbNames = mongoClient.db('batepapouol');
        const namesCollection = dbNames.collection('names');
        const names = await namesCollection.find({}).toArray();

        res.send(names);
        mongoClient.close();
    } catch (error) {
        res.send("Erro ao buscar usuários");
    }
});
server.post('/messages', async (req, res) => {
    const userMessage = req.body;
    const user = req.headers;



    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const dbMessages = mongoClient.db('batepapouol');
        const MessagesCollection = dbMessages.collection('message');
        const dbNames = mongoClient.db('batepapouol');
        const namesCollection = dbNames.collection('names');
        let from = null;

        const listNames = await namesCollection.find({}).toArray();

        for (let i = 0; i < listNames.length; i++) {
            if (user.user === listNames[i].name) {
                from = user.user;
            }
        }
        if (from === null) {
            res.sendStatus(422);
            return;
        }


        const messageSchema = joi.object({
            to: joi.string().required(),
            text: joi.string().required(),
            type: joi.string().required().valid("message", "private_message"),
            from: joi.string()
        });



        const validation = messageSchema.validate(userMessage, user, { abortEarly: false });

        if (validation.error) {
            res.status(422).send(validation.error.details.map(error => error.message));
            return;
        }



        await MessagesCollection.insertOne({ from: from, to: userMessage.to, text: userMessage.text, type: userMessage.type, time: dayjs().format("HH:mm:ss") });

        res.sendStatus(201);

    } catch (error) {
        res.sendStatus(422);
    }
});
server.get('/messages', async (req, res) => {
    const limit = parseInt(req.query.limit);
    const user = req.headers;


    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const dbMessages = mongoClient.db('batepapouol');
        const MessagesCollection = dbMessages.collection('message');

        const message = await MessagesCollection.find({
            $or: [
                { type: "message" },
                { type: "status" },
                { type: "private_message", from: user.user }
            ]
        }).sort({ _id: 1 }).toArray();

        res.send(message.slice(limit * -1));
        mongoClient.close();

    } catch (error) {
        res.send("Erro ao buscar mensagens");
    }
});
server.post('/status', async (req, res) => {
    const user = req.headers.user;
    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const dbNames = mongoClient.db('batepapouol');
        const namesCollection = dbNames.collection('names');
        const listNames = await namesCollection.find({}).toArray();


        for (let i = 0; i < listNames.length; i++) {

            if (user === listNames[i].name) {

                await namesCollection.updateOne({ _id: listNames[i]._id }, { $set: { laststatus: Date.now() } });
                res.sendStatus(200);
                return;
            }
        }
        res.sendStatus(404);
        mongoClient.close();


    } catch (error) {
        res.send(error);
    }
});

setInterval(async () => {
    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();

        const dbNames = mongoClient.db('batepapouol');
        const namesCollection = dbNames.collection('names');
        const dbMessages = mongoClient.db('batepapouol');
        const MessagesCollection = dbMessages.collection('message');
        const listNames = await namesCollection.find({}).toArray();

        for (let i = 0; i < listNames.length; i++) {

            if (listNames[i].laststatus < (Date.now() - 10000)) {

                await namesCollection.deleteOne({ _id: listNames[i]._id });
                await MessagesCollection.insertOne({
                    from: listNames[i].name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: dayjs().format("HH:mm:ss")
                });
            }
        }
        mongoClient.close();
    } catch (error) {
        console.log(error);
    }
}, 15000);

server.listen(5000, () => {
    console.log("rodando na porta 5000")
});
