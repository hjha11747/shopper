const express = require("express");
const app = express();

const mongoose = require("mongoose");

const jwt = require("jsonwebtoken");

const multer = require("multer");

const path = require("path");

const cors = require("cors");

require('dotenv').config();

const port = process.env.PORT;

app.use(express.json()); //we can take any data in json format
app.use(cors());//using this our website will connect to port 4000


//DATABASE CONNECTION WITH MONGODB

mongoose.connect(process.env.MONGO_URL);




//API CREATION


app.get("/", (req, res) => {
    res.send("Express app is running")
})


//IMAGE STORAGE INGINE

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});


const upload = multer({ storage: storage })

//CREATING UPLOAD ENDPOINTS FOR FOR IMAGES
app.use('/images', express.static('upload/images'))


app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

//SCHEMA FOR CRETATING PRODUCT

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        require: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    availabe: {
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else {
        id = 1;
    }

    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    await product.save();
    console.log("saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})


app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name
    })
})


//CREATING API FOR GET GETTING ALL PRODUCTS
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("All product fetched");
    res.send(products);
})


const Users = mongoose.model('User', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    cartDatas: {
        type:Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }

})

//Creating endpoint for regestering the user

app.post('/signup', async (req, res) => {

    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, error: "Existing User Found" })
    }
    let cart = {}
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
        console.log(cart)
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartDatas: cart,
    })

    await user.save()

    const data = {
        user: {
            id: user.id
        }
    }


    const token = jwt.sign(data, process.env.SECRET_KEY);
    res.json({ success: true, token });
})

app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id
                }
            }
            const token = jwt.sign(data, process.env.SECRET_KEY)
            res.json({ success: true, token })
        }
        else {
            res.json({
                success: false, error: "Wrong password"
            })
        }
    }
    else {
        res.json({ success: false, error: "wrong email id" })
    }
})


app.get('/newcollectioned', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("new collectionfound");
    res.send(newcollection);
})

//popular in women section

app.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" });
    let popular_in_women = products.slice(0, 4);
    console.log("popular in women found");
    res.send(popular_in_women);
})

// creating middleware to fetch user
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        res.status(401), send({ error: "Plese authenticate using valid token" });
    }
    else {
        try {
            const data = jwt.verify(token, process.env.SECRET_KEY);
            req.user = data.user;
            next();
        }
        catch (error) {
            res.status(401), send({ error: "Plese authenticate using valid token" })
        }
    }
}

// endpoint for addtocart
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log("Added",req.body.itemId);
    let userData = await Users.findOne({ _id:req.user.id});
    userData.cartDatas[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id:req.user.id}, {cartDatas:userData.cartDatas});
    res.send("Added")
});

//creating endpoint toget cartDatas

app.post('/getdata',fetchUser,async(req,res)=> {
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartDatas);
    console.log("Getcart");
})


app.post('/removefromcart',fetchUser,async(req,res)=> {
    let userData = await Users.findOne({ _id:req.user.id});
    console.log("removed",req.body.itemId);
    if( userData.cartDatas[req.body.itemId]>0)
    userData.cartDatas[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({ _id:req.user.id}, {cartDatas:userData.cartDatas});
    console.log("removed", userData.cartDatas[req.body.itemId]);
    res.send("removed")
})

//TEXT SHCEMA FOR CREATING PRODUCTS
app.listen(port, (error) => {
    if (!error) {
        console.log("Server is running on port : " + port)
    }
    else {
        console.log("ERROR :" + error)
    }
})