import express,{json} from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);


const server=express();
server.use(cors());
server.use(json());


server.post('/participants',async (req,res)=>{
const name=req.body;
try{
    await mongoClient.connect();
    const dbNames=mongoClient.db('batepapouol');
    const namesCollection = dbNames.collection('names');
    const names = await namesCollection.insertOne(name);
    res.send(names);
    mongoClient.close();
}catch(error){
    res.sendStatus(422);
}
});
server.get('/participants',async (req,res)=>{
try{
    await mongoClient.connect();
    const dbNames=mongoClient.db('batepapouol');
    const namesCollection = dbNames.collection('names');
    const names = await namesCollection.find({}).toArray();
    res.send(names);
    mongoClient.close();
}catch(error){
    res.sendStatus("Erro ao buscar usuários");
    mongoClient.close();
}
});
server.post('/messages',(req,res)=>{

});
server.get('/messages',(req,res)=>{

});
server.post('/status',(req,res)=>{

});

server.listen(5000);
