import express, { json } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from "mongodb";
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
        // listNames.forEach(name => {
        //     // if (user.name === name.name) {
        //     //     res.status(409).send("usuário já existente");
        //     //     return;
        //     // }
        //     // });
        for (let i = 0; i < listNames.length; i++) {
            if (user.name === listNames[i].name) {
                res.status(409).send("usuário já existente");
                return;
            }
        }
        await namesCollection.insertOne({ name: user.name, laststatus: Date.now() });
        await MessagesCollection.insertOne({ from: user.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format("HH:mm:ss") });

        res.sendStatus(201);
        mongoClient.close();
    } catch (error) {
        res.sendStatus(422);
    }

});
server.delete('/participants/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const dbNames = mongoClient.db('batepapouol');
        const namesCollection = dbNames.collection('names');
        await namesCollection.deleteOne({ _id: new ObjectId(id) });
        //await namesCollection.deleteMany({ name: null });
        res.status(200).send("usuário deletado com sucesso");
        mongoClient.close();
    } catch (error) {
        res.status(500).send(error);
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
        console.log(from);

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
    console.log(limit);

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
        //res.send(message);
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
                await namesCollection.updateOne({ _id: listNames._id }, { $set: Date.now() });
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

server.listen(5000);
