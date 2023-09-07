require('dotenv').config()
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const { Client } = require('pg')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const { getStorage, ref, getDownloadURL, uploadBytesResumable } = require('firebase/storage')
const {initializeApp} = require('firebase/app')
// const config = require('./config/firebase.config.js')
const multer = require('multer')
const getFormattedTimestamp = require('./helpers/dateformatter')
const { sendQuoteRequestEmail, sendCustomPlanReadyEmail, sendCompletedCaseEmail } = require('./helpers/email')
var http = require('http')


const PORT = process.env.PORT || 3001
const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
}

var server = http.createServer(app)
const socketIO = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    }
})

const cors = require('cors')
app.use(cors())
app.use(express.static('build'))


initializeApp(config);
const firsebaseStorage = getStorage();
console.log(`config here is ${JSON.stringify(config)}`)
var storage = multer.diskStorage({
    destination: function (req,file,cb){
        cb(null, 'case-docs')
    },
    filename: function (req, file, cb){
        const filename = file.originalname
        const currentTime = giveCurrentDateTime()
        let finalFileName = `${filename} - ${currentTime}.zip`
        cb(null, finalFileName)
    }
})

const giveCurrentDateTime = () => {
    const today = new Date();
    const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    const dateTime = date + ' ' + time;
    return dateTime;
}

const upload = multer({storage: multer.memoryStorage()})

const { 
    v1: uuidv1,
    v4: uuidv4,
  } = require('uuid');

let casedetails = {
    clientid: "",
    casetitle: "",
    caseoverview: "",
    caseplan: "",
    casefactual: "",
    caseobjectives: "",
    casedates: "",
    casearguments: "",
    caseopposition: "",
    documentslink: "",
}

let caseDoc;

//added secret

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// const client = new Client({
//     host: 'localhost',
//     user: 'postgres',
//     port: 5432,
//     password: process.env.DATABASE_PASS,
//     database: process.env.DATABASE
// })
const client = new Client({
    host: process.env.NEON_HOST,
    user: process.env.NEON_USER,
    port: 5432,
    password: process.env.NEON_PASS,
    database: process.env.NEON_NAME,
    ssl: {
        rejectUnauthorized: false, // Set this to false for self-signed certificates or when using SSL with invalid certificates. Do not use in production.
    }
})


console.log(`connecting to postgreSQL database...`)

client.connect()
        .then(() => {
            console.log('Connected to DB!')
        })
        .catch((err) => {
            console.log(`Error connecting to DB.: ${err}`)
        })


        

socketIO.on('connection', (socket) => {
    socket.emit("me", socket.id)
    console.log(`⚡: ${socket.id} user just connected!`);

    socket.on("join_room", (data) => {
        console.log(`joined room: ${data.room}`)
        socket.join(data.room)
    })

    socket.on('send_message', (data) => {
        console.log(`data here is ${JSON.stringify(data)}`)
        console.log(`data.room here is ${data.room}`)
        socketIO.to(data.room).emit("receive_message", data)
    })

    socket.on("callUser", (data) => {
        console.log(`trying to call: ${data.userToCall} ${data.from} ${data.name}`)
        socketIO.to(data.userToCall).emit("callUser", {signal: data.signalData, from: data.from, name: data.name})
    })

    socket.on("answerCall", (data) => {
        socketIO.to(data.to).emit("callAccepted", data.signal)
    })

    socket.on("hangUpCall", (data) => {
        socketIO.to(data.room).emit("endCall", data.room)
    })

    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
    })
})    


// app.use((req, res, next) => {
//     if (req.originalUrl === '/webhook') {
//       next();
//     } else {
//       express.json()(req, res, next);
//     }
//   });



// app.use(express.json())


app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
    const sig = request.headers['stripe-signature'];
  
    let event;
    let data;
    let eventType;
  
    try {
    //   event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
      event = stripe.webhooks.constructEvent(request.body.toString(), sig, endpointSecret);
      console.log('Webhook verified')
      data = event.data.object
      eventType = event.type
    } catch (err) {
      console.log(`Webhook Error: ${err.message}`)
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  
    // Handle the event
    console.log(`Unhandled event type ${event.type}`);

    if(eventType === 'payment_intent.succeeded'){
        console.log(`metadata part here is ${data.metadata.paymenttype}`)
        // let feeType = request.metadata.paymenttype
        let feeType = data.metadata.paymenttype
        // let feeAmount = request.metadata.paymentamount
        let feeAmount = data.metadata.paymentamount
        console.log(`payment amount part here is ${data.metadata.paymentamount}`)
        let caseid = uuidv4()

        if(feeType === 'Advance fee'){
            const addCaseBrief = async () => {
                try {
                    let dateTime = giveCurrentDateTime()
                    const storageRef = ref(firsebaseStorage, `files/${caseDoc.originalname + "-" + dateTime}`);
    
                    const metadata = {
                        contentType: caseDoc.mimetype,
                    }
    
                    console.log(`trying to send to firebase`)
                    console.log(`case plan below firebase is ${casedetails.caseplan}`)
    
                    const snapshot = await uploadBytesResumable(storageRef, caseDoc.buffer, metadata)
    
                    const downloadURL = await getDownloadURL(snapshot.ref)
                    console.log(`download url here is ${downloadURL}`)
    
                    
                    await client.query(`INSERT INTO casebrief(caseid, clientid, casestatus, caseplan, casetitle, caseoverview, casefactual, caseobjectives, casedates, casearguments, caseopposition, documentslink)
                    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, $12)
                    `,[caseid, casedetails.clientid, "in progress", casedetails.caseplan, casedetails.casetitle, casedetails.caseoverview, casedetails.casefactual, casedetails.caseobjectives, casedetails.casedates, casedetails.casearguments, casedetails.caseopposition, downloadURL])
    
                    let paymentTitle = 'Advance fee'
                    let paymentStatus = 'paid'
                    let clientid = data.metadata.clientid

                    await client.query(`INSERT INTO payment(caseid, paymenttitle, paymentstatus, clientid, paymentamount)
                    VALUES($1, $2, $3, $4, $5)`, [caseid, paymentTitle, paymentStatus, casedetails.clientid, feeAmount])
    
                    caseDoc = null
    
                    console.log(`Added new case brief!`)
                    response.status(200).json({Success: 'Added new case brief!'}).end()  
                    
                }
                catch(err){
                    console.log(`error creating new case brief: ${err}`)
                    response.status(400).json({Error: 'Could not create new case brief'}).end()  
                }
            }
            addCaseBrief()
        }
        else if(feeType === 'Final fee'){
            let paymentid = data.metadata.paymentid
            try {
                const payRemainingFee = async () => {
                // await client.query(`UPDATE payment
                //                     SET paymentstatus = $1
                //                     WHERE caseid = $2`, ['paid', caseid])
                await client.query(`UPDATE payment
                                    SET paymentstatus = $1
                                    WHERE paymentid = $2`, ['paid', paymentid])
                }
            payRemainingFee()
            console.log(`Paid final fee!`)
            response.status(200).json({Success: 'Paid final fee!'})
            }
            catch(err){
                console.log(`error paying final fee: ${err}`)
                response.status(400).json({Error: 'Could not pay final fee'})
            }
        }
    }
  });

app.use(express.json())



const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)




const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
})

// Sending confirmation email
const sendConfirmationEmail = (name, receiver, confirmationCode) => {
    try {
        transporter.sendMail({
            from: process.env.EMAIL,
            to: receiver,
            subject: 'Confirm Your Account - Amicus Law',
            html: `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
                    <p>Hello ${name},</p>
                    <p>Thank you for joining Amicus Law! Please confirm your account by clicking on the following link:</p>
                    <p style="margin: 24px 0;"><a href="http://localhost:3000/confirm/${confirmationCode}" style="background-color: #4CAF50; color: #ffffff; padding: 12px 24px; text-decoration: none;">Confirm My Account</a></p>
                    <p>If you did not sign up for this account, please disregard this email.</p>
                    <p>Best regards,</p>
                    <p>The Amicus Law Team</p>
                  </div>`
        });
        console.log('Sent email!')
        }
        catch(err){
            console.log(`Error sending email: ${err}`)
        }
    }

// routes

app.get('/', async (req, res) => {
    res.send('YESSIRR')
})

app.post('/login', async (req,res) => {
    const {email,password} = req.body
    let hashedPassword
    let result

    // Check if email exists
    try {
        result = await client.query(`SELECT *
                                      FROM users
                                      WHERE useremail = $1`, [email])
        hashedPassword = result.rows[0].userpassword

        let res2 = await bcrypt.compare(password, hashedPassword)
        
        const userToken = {
            email: email,
            id: result.rows[0].userid
        }
        const token = jwt.sign(userToken, process.env.JWT_SECRET)

        res.status(200).send({token, email, firstname: result.rows[0].userfirstname, id: result.rows[0].userid, usertype: result.rows[0].usertype})
        
    }
    catch(err){
        console.log(`Did not find user: ${err}`)
        res.status(400).json({Error: `Could not find user with that name.${err}`})
    }

})


// route for signing up
app.post('/signup', async (req,res) => {
    // let usertype = 1
    const {firstname, lastname, email, password, usertype} = req.body
    // Basically creating regular user
    if(usertype === 1){
        const hashedPassword = await bcrypt.hash(String(password), 10)
        const token = jwt.sign(email, process.env.JWT_SECRET)
    
        try {
            await client.query(`INSERT into users(usertype, userfirstname, userlastname, useremail, userpassword, active, confirmationtoken)
                                VALUES($1, $2, $3, $4, $5, $6, $7)`, [usertype, firstname, lastname, email, hashedPassword, false, token])
            sendConfirmationEmail(firstname, email, token)
            res.status(201).json({Success: 'User was successfully registered. Please check email to confirm your account.'})
            console.log(`success!`)
        }
        catch(err) {
            console.log(`error adding to db: ${err}`)
            res.status(400).json({Success: 'User was successfully registered. Please check email to confirm your account.'})
        }
    }
    // Creating adminstrator

    else if(usertype === 0){
        try {
            const hashedPassword = await bcrypt.hash(String(password), 10)
            const token = jwt.sign(email, process.env.JWT_SECRET)
            await client.query(`INSERT into users(usertype, userfirstname, userlastname, useremail, userpassword, active, confirmationtoken)
                                VALUES($1, $2, $3, $4, $5, $6, $7)`, [usertype, firstname, lastname, email, hashedPassword, true, 'no-token-for-admin'])
            res.status(201).json({Success: 'Admin was successfully registered.'})
            console.log(`success!`)
        }
        catch(err) {
            console.log(`error adding to db: ${err}`)
            res.status(400).json({Success: 'Admin account could not be created.', err})
        }
    }
    

})

app.post('/dashboard', async (req,res) => {
    const { id } = req.body

    try {
        // let result = await client.query(`SELECT "casestatus", "caseplan", "casetitle", "caseoverview", "documentslink"
        //                                 FROM "casebrief"
        //                                 WHERE "casebrief"."clientid" = $1`, [id])
        // res.status(200).send({casestatus: result.rows[0].casestatus, caseplan: result.rows[0].caseplan, casetitle: result.rows[0].casetitle, caseoverview: result.rows[0].caseoverview, documentslink: result.rows[0].documentslink})
        let allCases = await client.query(`SELECT * 
                                           FROM casebrief
                                           WHERE clientid = $1
                                           LIMIT 2`, [id])
        console.log(`allCases.rows here is ${allCases.rowCount}`)
        res.status(200).send({cases: allCases.rows, })

    }
    catch(err){
        console.log(`error getting user/case data: ${err}`)
        res.status(400).json({Error: 'Error getting client/case information.'})
    }
})

// Route for getting all user cases
app.post('/cases', async (req,res) => {
    const { id } = req.body
    console.log(`id here is $`)
    try {
        let result = await client.query(`SELECT casetitle, caseid, caseplan, casestatus, clientid
                                        FROM casebrief
                                        WHERE clientid = $1
                                        ORDER BY casebrief.created_at DESC`, [id])
        console.log(`result.rows here is ${result.rows}`)
        res.status(200).send({cases: result.rows})
    }
    catch(err){
        console.log(`Error while getting cases: ${err}`)
        res.send({Error: `Error trying to get cases: ${err}`})
    }
})

//Route for getting specific user case
app.get('/case/:caseid', async (req,res) => {
    const  caseid  = req.params.caseid
    console.log(`caseid here is ${caseid}`)

    try {
        // let result = await client.query(`SELECT *
        //                                  FROM casebrief
        //                                  WHERE caseid = $1`, [caseid])
        // let result = await client.query(`SELECT *
        //                                  FROM casebrief
        //                                  FULL OUTER JOIN caseassignment
        //                                  ON casebrief.caseid = caseassignment.caseid
        //                                  WHERE casebrief.caseid = $1`, [caseid])
        let result = await client.query(`SELECT *
                                        FROM casebrief
                                        FULL OUTER JOIN caseassignment ON casebrief.caseid = caseassignment.caseid
                                        WHERE casebrief.caseid = $1`, [caseid])
        res.status(200).send({case: result.rows[0]})
    }
    catch(err){
        console.log(`Error while getting specific case: ${err}`)
        res.status(400).send({Error: `Error while getting case details. ${err}`})
    }
})

//route for creating a new case brief
app.post('/create/casebrief', async (req,res) => {
    const { clientid, casetitle, caseoverview, casefactual, caseplan, caseobjectives, casedates, casearguments, caseopposition, documentslink } = req.body

    try {
        client.query(`INSERT INTO casebrief(clientid, casestatus, caseplan, casetitle, caseoverview, casefactual, caseobjectives, casedates, casearguments, caseopposition, documentslink)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `,[clientid, "complete", caseplan, casetitle, caseoverview, casefactual, caseobjectives, casedates, casearguments, caseopposition, documentslink])
        console.log(`Added new case brief!`)
        res.status(200).json({Success: 'Added new case brief!'})
    }
    catch(err){
        console.log(`error creating new case brief: ${err}`)
        res.status(400).json({Error: 'Could not create new case brief'})
    }
})


//route for activating account
app.get('/confirm/:confirmationCode', async (req, res) => {
    const token = req.params.confirmationCode

    try {
        await client.query(`UPDATE users
                            SET active = $1
                            WHERE confirmationtoken = $2`, [true, token])
        console.log('Successfully activated account.')
        res.status(200).json({Success: 'Successfully activated account.'})
    }
    catch(err){
        console.log('Error activating account.')
        res.status(400).json({Error: 'Error activating account.'})
    }
})

// Stripe payment session

app.post('/create-checkout-session', upload.single('zipFile'), async (req, res) => {
    // const { payment } = req.body
    const { paymentType } = req.body
    const { caseplan, clientid, casetitle, caseoverview, casefactual, caseobjectives, casearguments, caseopposition, documentslink, casedates } = req.body

    let customAmount
    if(caseplan === 'Custom'){
        console.log(`custom amount here is ${req.body.customAmount}`)
        customAmount = Number(req.body.customAmount)
    }


    let priceInCents
    let cost

    if(paymentType === 'Advance fee'){
        console.log('got in advance fee')
        console.log(`name of the pdf here is ${caseplan}`)
        console.log(`name of the pdf here is ${req.file.originalname}`)
        caseDoc = req.file

        casedetails = {
            clientid: clientid,
            casetitle: casetitle,
            caseoverview: caseoverview,
            caseplan: caseplan,
            casefactual: casefactual,
            caseobjectives: caseobjectives,
            casedates: casedates,
            casearguments: casearguments,
            caseopposition: caseopposition,
            documentslink: documentslink,
        }


        console.log(`casedetails here is ${JSON.stringify(casedetails)}`)
        
    
        if(caseplan === 'Starter'){
            cost = 0.2 * 100
        }
        else if(caseplan === 'Pro'){
            cost = 0.2 * 200
        }
        else if(caseplan === 'Enterprise'){
            cost = 0.2 * 300
        }
        else if(caseplan === 'Custom'){
            cost = 0.2 * customAmount
        }
    }

    else if(paymentType === 'Final fee'){
        console.log('got in final fee')
        if(caseplan === 'Starter'){
            cost = 0.8 * 100
        }
        else if(caseplan === 'Pro'){
            cost = 0.8 * 200
        }
        else if(caseplan === 'Enterprise'){
            cost = 0.8 * 300
        }
        else if(caseplan === 'Custom'){
            cost = 0.8 * customAmount
        }
    }

    priceInCents = cost * 100
    console.log(`cost here is ${cost}`)

    try {
        const line = {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `${paymentType} - ${casetitle} | Plan(${caseplan})`
                },
                unit_amount: priceInCents,
            },
            quantity: 1
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [line],
            // payment_intent_data: {
            // metadata: {
            //     paymenttype: paymentType,
            //     paymentamount: Number(cost)
            //     // clientid: clientid
            // }},
            payment_intent_data: {
                metadata: {
                    paymenttype: paymentType,
                    paymentamount: Number(cost)
                },
              },
            success_url: 'https://amicuslaw.onrender.com/client/cases',
            cancel_url: 'https://amicuslaw.onrender.com/client/error',
        })


        res.json({ url: session.url })
    }
    catch(err){
        console.log(`error here is ${err.message}`)
        res.status(500).json({ error: err.message })
    }
})

app.post('/billing/info', async (req, res) => {
    const { id } = req.body

    try {
        let payments = await client.query(`SELECT * 
                                           FROM payment
                                           FULL OUTER JOIN casebrief
                                           ON payment.caseid = casebrief.caseid
                                           WHERE payment.clientid = $1
                                           ORDER BY paymentdate DESC`, [id])
        console.log(`got billing info - ${JSON.stringify(payments.rows)}`)
        console.log('got billing info')
        res.status(200).json({payments: payments.rows})
    }
    catch(err){
        res.status(400).json({Error: "Could not retrieve billing information"})
    }
})

app.post('/add/documents', upload.single('zipFile'), async (req,res) => {
    const { caseid } = req.body
    const filename = `${caseid}.zip`
    console.log(`filename here is ${filename}`)
    try {
        if(!req.file){
            throw new Error('No file uploaded')
        }

        const storageRef = ref(firsebaseStorage, `files/${filename}`);

        const metadata = {
            contentType: req.file.mimetype,
          }

        const snapshot = await uploadBytesResumable(storageRef, req.file.buffer, metadata)

        const downloadURL = await getDownloadURL(snapshot.ref)
        console.log(`downloadURL here is ${downloadURL}`)
        res.status(200).json({Success: 'got zip'})


    }
    catch(err){
        res.status(400).json({Error: err})
        console.log(`Error while uploading file: ${file}`)
    }
})

// Endpoint to getting all cases for admin
app.get('/cases', async (req,res) => {
    try {
        // let result = await client.query(`SELECT * FROM casebrief`)
        let result = await client.query(`SELECT casebrief.casetitle, casebrief.caseid, casebrief.casestatus, casebrief.clientid, casebrief.caseplan, users.userfirstname, users.userlastname, users.useremail, users.userid
                                         FROM casebrief
                                         JOIN users ON casebrief.clientid = users.userid
                                         WHERE users.usertype = 1
                                         ORDER BY created_at DESC`)
        // console.log(`Error here is ${err}`)
        res.status(200).json({cases: result.rows})
    }
    catch(err){
        console.log(`Error here is ${err}`)
        res.status(400).json({Error: `Error while retrieving cases. ${err}`})
    }
})

app.post('/admin/cases/:caseid/submit', upload.single('zipFile'), async (req, res) => {
    const caseid = req.params.caseid
    const {clientid, caseplan, casetitle} = req.body
    const assignmenttext = req.body.assignmenttext
    const filename = `${caseid}-Assignment.zip`

    console.log(`assingmenttext here is ${assignmenttext}`)
    let paymountamount

    if(caseplan === 'Starter'){
        paymountamount = 0.8 * 100
    }
    else if(caseplan === 'Pro'){
        paymountamount = 0.8 * 200
    }
    if(caseplan === 'Enterprise'){
        paymountamount = 0.8 * 300
    }
    if(caseplan === 'Custom'){
        try {
            let result = await client.query(`SELECT * FROM payment
                                             WHERE caseid = $1`, [caseid])
            paymountamount = result.rows[0].paymentamount * 4
        }
        catch(err){
            console.log(`Error getting payment information`)
        }
    }


    console.log(`payment Amount after submitting case is ${paymountamount}`)
    try {
        if(!req.file){
            throw new Error('No file uploaded')
        }

        const storageRef = ref(firsebaseStorage, `assignments/${filename}`);

        const metadata = {
            contentType: req.file.mimetype,
          }

        const snapshot = await uploadBytesResumable(storageRef, req.file.buffer, metadata)

        const downloadURL = await getDownloadURL(snapshot.ref)

        await client.query(`INSERT INTO caseassignment(caseid, assignmentlink, assignmenttext)
                            VALUES($1, $2, $3)`, [caseid, downloadURL, assignmenttext])

        await client.query(`UPDATE casebrief
                            SET casestatus = $1
                            WHERE caseid = $2`, ['complete', caseid])

        await client.query(`INSERT INTO payment(caseid, paymenttitle, paymentstatus, clientid, paymentamount)
                            VALUES($1,$2,$3,$4,$5)`,[caseid, 'Final fee', 'not paid', clientid, paymountamount])

        let clientInfo = await client.query(`SELECT * FROM users
                            WHERE userid = $1 and usertype = 1`, [clientid])
                            // sendCompletedCaseEmail = (clientEmail, clientName, caseTitle, lawyerName)
        sendCompletedCaseEmail(clientInfo.rows[0].useremail, clientInfo.rows[0].userfirstname, casetitle, 'Reji Paul')
        console.log(`downloadURL here is ${downloadURL}`)
        res.status(200).json({Success: 'submitted zip'})

    }
    catch(err){
        res.status(400).json({Error: err})
        console.log(`Error while submitting assignment: ${err}`)
    }
})

app.get('/payment/:paymentid', async (req,res) => {
    const paymentid = req.params.paymentid

    try {
        // let result = await client.query(`SELECT * 
        //                                  FROM payment
        //                                  FULL OUTER JOIN casebrief
        //                                  ON payment.caseid = casebrief.caseid
        //                                  WHERE payment.paymentid = $1`, [paymentid])
        let result = await client.query(`SELECT payment.paymentid, payment.paymenttitle, payment.paymentdate, payment.paymentamount, payment.paymentstatus, casebrief.caseid, casebrief.casetitle, casebrief.clientid, users.userfirstname, users.userlastname, users.useremail
                                           FROM payment
                                           JOIN casebrief ON payment.caseid = casebrief.caseid
                                           JOIN users ON casebrief.clientid = users.userid
                                           WHERE users.usertype = 1 AND payment.paymentid = $1;`, [paymentid])
        console.log(`Success getting payment info`)
        res.status(200).json({paymentInfo: result.rows[0]})
    }
    catch(err){
        console.log(`Error retrieving payment info from db: ${err}`)
        res.status(400).json({Error: `Error retrieving payment info from db: ${err}`})
    }
})

app.post('/final-checkout-session', async (req, res) => {
    const { paymentid } = req.body

    try {

        let result = await client.query(`SELECT * FROM payment
                            FULL OUTER JOIN casebrief
                            ON payment.caseid = casebrief.caseid
                            WHERE payment.paymentid = $1`, [paymentid])
        let paymentType = result.rows[0].paymenttitle
        let casetitle = result.rows[0].casetitle
        let caseplan = result.rows[0].caseplan
        let cost = result.rows[0].paymentamount

        let priceInCents = cost * 100
        
        const line = {
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `${paymentType} - ${casetitle} | Plan(${caseplan})`
                },
                unit_amount: priceInCents,
            },
            quantity: 1
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [line],
            payment_intent_data: {
                metadata: {
                    paymenttype: paymentType,
                    paymentamount: Number(cost),
                    paymentid: paymentid
                },
              },
            success_url: 'http://localhost:3000/client/cases',
            cancel_url: 'http://localhost:3000/client/error',
        })


        res.json({ url: session.url })
    }
    catch(err){
        console.log(`error here is ${err.message}`)
        res.status(500).json({ error: err.message })
    }
})

app.post('/new/quote-request/', async (req, res) => {
    const { quoteDetails, sender } = req.body

    try {
        sendQuoteRequestEmail(sender, quoteDetails)
        console.log('Successfully sent the quote request email!')
        res.status(200).json({Success: 'Successfully sent the quote request email!'})

    }
    catch(err){
        console.log(`Error sending quote request email: ${err}`)
        res.status(400).json({ Error: `Error sending quote request email: ${err}` })
    }

})

app.get('/get_clients', async (req, res) => {
    try {
        let result = await client.query(`SELECT * FROM users
                                         WHERE usertype = 1`)
        console.log(`got all the clients`)
        res.status(200).json({clients: result.rows})
    }
    catch(err){
        console.log(`error getting all clients: ${err}`)
        res.status(400).json({Error: `error getting all clients: ${err}`})
    }
})

app.post('/custom-plan/new-quote', async (req, res) => {
    const { planpin, planamount, planinfo, clientemail, clientname } = req.body

    try {
        await client.query(`INSERT INTO planquote(planquotepin, planquoteamount)
                            VALUES($1, $2)`, [planpin, planamount])
                            // (clientEmail, clientName, casePin, planInfo, planAmount)
        sendCustomPlanReadyEmail(clientemail, clientname, planpin, planinfo, planamount)
        res.status(200).json({Success: 'Successfully added plan quote'})
    }
    catch(err){
        console.log(`Error adding plan quote: ${err}`)
        res.status(400).json({Error: `Error adding plan quote: ${err}`})
    }
})

app.post('/custom-plan/check-pin/:pin', async (req,res) => {
    const pin = req.params.pin

    try {
        let result = await client.query(`SELECT * FROM planquote
                                         WHERE planquotepin = $1`, [pin])
        console.log(`result.rows here is ${result.rows}`)
        if(result.rowCount > 0){
            res.status(200).json({case: result.rows})
        }
        else {
            res.status(422).json({Error: 'Incorrect case PIN'})
        }
    }
    catch(err){
        console.log(`Error getting custom case info: ${err}`)
        res.status(400).json({Error: `Error getting custom case info: ${err}`})
    }
})

app.get('/admin/get_dashboard', async (req, res) => {
    try {

        let engagementinfo = await client.query(`SELECT engagement.engagementdescription, engagement.engagementtitle, engagement.engagementduedate, casebrief.casestatus, casebrief.casetitle
                                                FROM engagement
                                                FULL OUTER JOIN casebrief
                                                ON engagement.engagementcaseid = casebrief.caseid
                                                WHERE engagement.engagementduedate > NOW() AND casebrief.casestatus = 'in progress'`, [])

        let engagementCount = engagementinfo.rowCount

        let cases = await client.query(`SELECT * FROM casebrief
                                        ORDER BY created_at DESC`)
        let caseid = cases.rows[0].caseid
        let adminCaseCount = cases.rowCount
        let latestCase = cases.rows[0]

        console.log(`caseid here is ${caseid}`)

        let newCases = await client.query(`SELECT * FROM casebrief
                                          WHERE readornot = $1`, [false])
        let newCasesCount = newCases.rowCount

        let adminID = '00e01d43-9571-4d1b-badd-b3cfdf4dcae7'
        let messageInfo = await client.query(`SELECT * FROM messages
                                              WHERE (senderid = $1 OR receiverid = $1) AND adminreadornot = $2`, [adminID, false])

        console.log(`newCasesCount here is ${newCasesCount}`)

        let payments = await client.query(`SELECT * FROM payment
                                           WHERE paymentstatus = $1`, ['paid'])
        let paymentCount = payments.rowCount
        console.log(`successfully got all admin dashboard widget info: ${paymentCount}`)
        res.status(200).json({casecount: adminCaseCount, caseid: caseid, newcases: newCasesCount, latestcase: latestCase, payments: paymentCount, unreadmessages: messageInfo.rowCount, engagements: engagementCount})
    }
    catch(err){
        console.log(`Error getting all admin dashboard info: ${err}`)
        res.status(400).json({Error: `Error getting dashboard info`})
    }
})

app.put('/read/cases/:caseid', async (req, res) => {
    try {
        const caseid  = req.params.caseid
        await client.query(`UPDATE casebrief
                            SET readornot = $1
                            WHERE caseid = $2`, [true, caseid])
        console.log(`case read`)
        res.status(200).json({Success: `case read successfully`})
    }
    catch(err){
        console.log(`case could not be read`)
        res.status(400).json({Error: `case not read: ${err}`})
    }
})

app.post('/add/engagement', async (req, res) => {
    const { title, description, date, caseid } = req.body

    try{
        await client.query(`INSERT INTO engagement(engagementtitle, engagementdescription, engagementcaseid, engagementduedate)
                            VALUES($1, $2, $3, $4)`, [title, description, caseid, date])
        console.log(`Engagement added successfully`)
    }
    catch(err){
        console.log(`Error adding engagement: ${err}`)
    }
})

app.get('/admin/engagements', async (req, res) => {
    try {
        let engagementinfo = await client.query(`SELECT engagement.engagementdescription, engagement.engagementtitle, engagement.engagementduedate, casebrief.casestatus, casebrief.casetitle
                                                FROM engagement
                                                FULL OUTER JOIN casebrief
                                                ON engagement.engagementcaseid = casebrief.caseid
                                                WHERE engagement.engagementduedate > NOW() AND casebrief.casestatus = 'in progress'`, [])
        console.log(`successfully retrieved engagements`)
        res.status(200).json({engagementinfo: engagementinfo.rows})
    }
    catch(err){
        console.log(`Error getting engagements: ${err}`)
        res.status(400).json({Error: `Error getting engagements: ${err}`})
    }
})

app.get('/enagements/:clientid', async (req, res) => {
    const clientid  = req.params.clientid
    
    try {
        let engagementinfo = await client.query(`SELECT engagement.engagementdescription, engagement.engagementtitle, engagement.engagementduedate, casebrief.casestatus, casebrief.casetitle
                            FROM engagement
                            FULL OUTER JOIN casebrief
                            ON engagement.engagementcaseid = casebrief.caseid
                            WHERE engagement.engagementduedate > NOW() AND casebrief.casestatus = 'in progress' AND casebrief.clientid = $1`, [clientid])
        console.log(`successfully retrieved engagements`)
        res.status(200).json({engagementinfo: engagementinfo.rows})
    }
    catch(err){
        console.log(`Error getting engagements: ${err}`)
        res.status(400).json({Error: `Error getting engagements: ${err}`})
    }
})

app.post(`/client/dashboard`, async (req,res) => {
    const { clientid } = req.body
    try {
        let engagementinfo = await client.query(`SELECT engagement.engagementdescription, engagement.engagementtitle, engagement.engagementduedate, casebrief.casestatus, casebrief.casetitle
                            FROM engagement
                            FULL OUTER JOIN casebrief
                            ON engagement.engagementcaseid = casebrief.caseid
                            WHERE engagement.engagementduedate > NOW() AND casebrief.casestatus = 'in progress' AND casebrief.clientid = $1`, [clientid])
        let engagementCount = engagementinfo.rowCount

        let caseInfo = await client.query(`SELECT casetitle, casestatus, caseplan, caseid FROM casebrief
                                             WHERE clientid = $1
                                             ORDER BY created_at DESC`, [clientid])
        let messageInfo = await client.query(`SELECT * FROM messages
                                              WHERE (senderid = $1 OR receiverid = $1) AND clientreadornot = $2`, [clientid, false])
            
        console.log(`clientid: ${clientid}`)                                      
        console.log(`case history: ${caseInfo.rowCount}`)
        console.log(`caseid here is ${caseInfo.rows[0].caseid}`)
        console.log(`unreadmessage count here is ${messageInfo.rowCount}`)
        console.log(`caseInfo here is ${JSON.stringify(caseInfo.rows[0])}`)
        let paymentInfo = await client.query(`SELECT * FROM payment
                                              WHERE clientid = $1 AND paymentstatus = $2`, [clientid, 'not paid'])
        console.log(`got client dashboard widget info!`)
        res.status(200).json({currentcasetitle: caseInfo.rows[0].casetitle, currentcaseplan: caseInfo.rows[0].caseplan, currentcaseid: caseInfo.rows[0].caseid, currentcasestatus: caseInfo.rows[0].casestatus, casehistory: caseInfo.rowCount,  unpaid: paymentInfo.rowCount, engagements: engagementCount, unreadmessages: messageInfo.rowCount})
    }

    catch(err){
        console.log(`error getting client dashboard!: ${err}`)
    }
})

app.post('/get_messages', async (req,res) => {
    const {sender, receiver, roomid, usertype} = req.body
    try{
        let firstMessageCheck = await client.query(`SELECT * FROM "roominfo"
        WHERE ("roominfo"."senderid" = $1 AND "roominfo"."receiverid" = $2 AND "roominfo"."room" = $3) OR ("roominfo"."senderid" = $2 AND "roominfo"."receiverid" = $1 AND "roominfo"."room" = $3)`, [sender, receiver, roomid])
        console.log(`firstMessageCheck here is ${firstMessageCheck.rowCount}`)

        if(usertype === 0){
            await client.query(`UPDATE messages
                                SET adminreadornot = $1
                                WHERE room = $2`, [true, roomid])
            console.log(`admin read messages`)
        }
        else if(usertype === 1){
            await client.query(`UPDATE messages
                                SET clientreadornot = $1
                                WHERE room = $2`, [true, roomid])
            console.log(`client read messages`)
        }

        console.log(`room here is ${roomid}`)
        console.log(`sender here is ${sender}`)
        console.log(`receiver here is ${receiver}`)

        if(firstMessageCheck.rowCount > 0){
        let result = await client.query(`SELECT * FROM "messages"
                                         WHERE "messages"."room" = $1
                                         ORDER BY timesent ASC`, [roomid])
        // console.log(`${JSON.stringify(result.rows)}`)
        res.json({messages: result.rows})

        }
        else {
        // await client.query(`INSERT INTO "roominfo"(room, senderid, receiverid)
        //                     VALUES ($1, $2, $3)`, [roomid, sender, receiver])
        // res.json({room: roomid, messages: []})
        throw new Error('Could not identify room information')
        }
    }
    catch(err){
        res.json({Error: `Error getting messages: ${err}.`})
    }
    
})

app.post('/new_message', async (req,res) => {
    const {sender, receiver, content, roomid, usertype} = req.body
    console.log(`usertype here is ${usertype}`)
    try {
        if(usertype === 0){
            console.log(`admin trying to send message`)
            await client.query(`INSERT INTO "messages" (senderid, receiverid, messagecontent, room, adminreadornot)
            VALUES ($1, $2, $3, $4, $5)`, [sender, receiver, content, roomid, true])
            console.log(`actually saved message`)
        }
        else if(usertype === 1){
            console.log(`client trying to send message`)
            await client.query(`INSERT INTO "messages" (senderid, receiverid, messagecontent, room, clientreadornot)
            VALUES ($1, $2, $3, $4, $5)`, [sender, receiver, content, roomid, true])
            console.log(`actually saved message`)
        }
        // await client.query(`INSERT INTO "messages" (senderid, receiverid, messagecontent, room)
        //                     VALUES ($1, $2, $3, $4)`, [sender, receiver, content, roomid])
        console.log(`Saved message`)
        res.json('Message successfully saved')
    }
    catch(err) {
        console.log(`Error saving message: ${err} `)
        res.json('Error saving message')
    }
})

app.put('/read/messages', async (req, res) => {
    const { usertype, senderid, receiverid, roomid } = req.body
    console.log(`usertype here is ${usertype}`)
    console.log(`senderid here is ${senderid}`)
    console.log(`receiverid here is ${receiverid}`)

    try {
        if(usertype === 0){
            await client.query(`UPDATE messages
                                SET adminreadornot = $1
                                WHERE room = $2`, [true, roomid])
            console.log(`admin read messages`)
        }
        else if(usertype === 1){
            await client.query(`UPDATE messages
                                SET clientreadornot = $1
                                WHERE room = $2`, [true, roomid])
            console.log(`client read messages`)
        }
        res.status(200).json({Success: `Successfully read messages`})
    }
    catch(err){
        console.log(`Error: error reading messages: ${err}`)
        res.status(400).json({Error: `Error trying to read messages. ${err}`})
    }

    
})

app.get('/admin/billing', async (req, res) => {

    try {
        let payments = await client.query(`SELECT payment.paymentid, payment.paymenttitle, payment.paymentdate, payment.paymentamount, payment.paymentstatus, casebrief.caseid, casebrief.casetitle, casebrief.clientid, users.userfirstname, users.userlastname, users.useremail
                                           FROM payment
                                           JOIN casebrief ON payment.caseid = casebrief.caseid
                                           JOIN users ON casebrief.clientid = users.userid
                                           WHERE users.usertype = 1
                                           ORDER BY paymentdate DESC;`, [])
        console.log(`got billing info - ${JSON.stringify(payments.rows)}`)
        console.log('got billing info')
        res.status(200).json({payments: payments.rows})
    }
    catch(err){
        console.log(`could not get billing info: ${err}`)
        res.status(400).json({Error: "Could not retrieve billing information"})
    }
})


server.listen(PORT, () => {
    console.log(`listening on PORT ${PORT}`)
})

    
    