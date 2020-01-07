const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client:'pg',
    connection:{
        host: process.env.DATABASE_URL,
        ssl: true
    }
});
app.use(bodyParser.json());
app.use(cors());
// we need to separate the tables of DB
/* CREATE TABLE users ( 
    id serial PRIMARY KEY, 
    name VARCHAR (100),
    email text UNIQUE NOT NULL,
    entries BIGINT DEFAULT 0, 
    joined TIMESTAMP NOT NULL
    );
   CREATE TABLE login ( 
    id serial PRIMARY KEY, 
    hash varchar (100) NOT NULL, 
    email text UNIQUE NOT NULL
    ); 
    in order to connect to the DB, we will use KNEX.js library
    npm install knex 
    npm install pg
    */

app.get('/',(req,res) => {
    res.send(db.users);
})
//sigin 
app.post('/signin', (req,res) => {
    db.select('email','hash').from('login')
        .where('email','=',req.body.email)
        .then(data => {
            if(data.length){
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
            if(isValid){
               return db.select('*').from('users')
                .where('email','=',req.body.email)
                .then(user =>{
                    user[0].success = 'success';
                    res.json(user[0])
                })
                .catch(err=> res.status(400).json('unable to get user'))
            }
            else {
                res.status(400).json('wrong credentials');
            }
        }
        else {
            res.status(400).json('Wrong Email, please try again')
        }
        })

})
app.listen(process.env.PORT || 3000);


//register - adding a new user to the database

app.post('/register', (req,res) => {
    const {email,name,password} = req.body;
    const hash = bcrypt.hashSync(password,3);
    db.transaction(trx => {
        trx.insert ({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0],
                name: name,
                joined: new Date()
            })
            .then(user => {
                user[0].success = 'success';
                res.json(user[0]);
        
            })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('Unable to register'))

})

//profile:

app.get('/profile/:id',(req,res) => {
    const {id} = req.params;
    db('users').select('*').from('users')
    .where({
        id: id
    })
    .then(
        user => {
            res.json(user);
        })
    .catch(err => res.status(400).json("error"))
})

//image - increasing the entries 

app.put('/image', (req,res) => {
    const {id} = req.body;
    db('users').where('id','=',id)
    .increment('entries',1)
    .returning('entries')
    .then(entries => res.json(entries)
    );
})

// Passwords

/*
    / --> res = this is working
    /signin --> POST = success/fail
    /register --> POST = user
    /profile/:userId --> GET = user
    /image --> PUT --> user
*/