const express = require('express');
const cors = require('cors');
const { createServer } = require("http");
const multer = require('multer');
const { Server } = require("socket.io");
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
var usernames = {};
const appServer = new createServer(app);
const io = new Server(appServer);
app.use(cors());
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
io.on('connection', function(socket) {
    console.log('User Connected...');
    socket.on('message', (msg) => {
        socket.to(socket.group).emit('message', msg);
    });
    socket.on('adduser', function(username, groupname) {
        if (usernames[username + "_" + groupname]) {
            socket.emit('error', { message: 'Username already exists in this group!' });
            return;
        }
        socket.join(groupname);
        socket.group = groupname;
        socket.username = username;
        usernames[username + "_" + groupname] = username;
        io.sockets.in(socket.group).emit('updateusers', usernames);
        socket.emit('greeting', username);
    });
    socket.on('uploadImage', function(data, username) {
        socket.to(socket.group).emit('publishImage', data, username);
    });
    socket.on('uploadFile', (data, username, fileName) => {
        socket.to(socket.groupName).emit('publishFile', data, username, fileName);
    });
    socket.on('disconnect', function() {
        console.log("User Disconnected");
        delete usernames[socket.username + '_' + socket.group];
        socket.leave(socket.group);
        io.sockets.in(socket.group).emit('updateusers', usernames);
        socket.to(socket.group).emit('message', { user: "Server", message: socket.username + " has left the group." });
    });
});
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });
const uri = "mongodb+srv://mdsamaul843:G8SyFz8Bi1Z0OVwZ@giftshop.opz02.mongodb.net/?retryWrites=true&w=majority&appName=GiftShop";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        await client.connect();
        const productAddedCollection = client.db('GiftShopDb').collection('Products'); 
        const orderCollection = client.db('GiftShopDb').collection('order');
        app.get('/upload', async (req, res) => {
            try {
                const getProduct = await productAddedCollection.find().toArray();
                console.log(getProduct);
                res.send(getProduct);
            } catch (error) {
                console.log(error.message);
                res.send(error.message);
            }
        });
        app.post('/upload', upload.single('productImage'), async (req, res) => {
            if (req.file) {
                const productName = req.body.productName;
                const productPrice = req.body.productPrice;
                const addedProduct = {
                    ProductName: productName,
                    ProductPrice: productPrice,
                    ProductImage: req.file.filename,
                    ProductImagePath: req.file.path
                };
                console.log('Added Product:', addedProduct);
                const result = await productAddedCollection.insertOne(addedProduct);
                res.status(201).json({
                    message: 'Product uploaded successfully!',
                    addedProduct: addedProduct,
                    status: req.status
                });
            } else {
                res.status(400).json({ message: 'File upload failed!' });
            }
        });
        app.get('/order', async (req, res) => {
            const userOrder = await orderCollection.find().toArray();
            console.log(userOrder);
            res.send(userOrder);
        });
        app.post('/order', upload.none(), async (req, res) => {
            const cartData = JSON.parse(req.body.cart);
            const userInfo = req.body;

            const allOrderData = {
                ...userInfo,
                cart: cartData
            };
            const result = await orderCollection.insertOne(allOrderData);
            console.log(allOrderData);
            res.json({ message: "Order received successfully!", orderData: allOrderData, mongoDbResult: result });
        });
    } finally {     
    }
}
run().catch(console.dir);
appServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
