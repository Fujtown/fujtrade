require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const ejs = require('ejs');  // Add this line
const serviceAccount = require('./firebase-credentials.json');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const engine = require('ejs-mate'); // Import ejs-mate
const passport = require('passport');
const session = require('express-session');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
// const createPdf = require('./pdfGenerator');
const dbConnection =require('./db_connection');
const { OAuth2Client } = require('google-auth-library');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// Define the auth object
const auth = admin.auth();

const isProduction = process.env.NODE_ENV === 'production';

require('./passport-setup')

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.secretAccessKey,
  region:'ap-south-1'
});

// Create an S3 instance
const s3 = new AWS.S3();


const db = admin.firestore();

const app = express();
const port = 5000;
app.use(cors());
app.use((req, res, next) => {
  const host = req.headers.host;
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isHttps !== 'https' && process.env.NODE_ENV === 'production') {
  // Check if it's not HTTPS or doesn't start with www
  if (!isHttps || !host.startsWith('www.')) {
      const wwwHost = 'www.' + host.replace(/^www\./, ''); // Ensure www is added
      const redirectUrl = `https://${wwwHost}${req.url}`;
      return res.redirect(301, redirectUrl);
  }

}
next();
});


// Serve the public folder statically
app.get('/uploads/:filename', (req, res) => {
  res.sendFile(path.join(__dirname + '/uploads/' + req.params.filename));
});
app.use(express.static(path.join(__dirname, 'public')));
const currencySymbolMap = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'AED': 'AED',
  // Add more currency code to symbol mappings as needed
};

// Define the getCurrencySymbol function
app.locals.getCurrencySymbol = function(currencyCode) {
  return currencySymbolMap[currencyCode] || currencyCode;
};

app.set('view engine', 'ejs');  // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set the views directory
// Use express-session middleware
app.use(cookieSession({
  name:'fujtrade-session',
  keys:['key1','key2']
}))

app.use(session({
  secret: 'c91f60bca9fc56d7dc2884428cce1fca9aa972cea16f440200e6bbd2726131ee', // Replace with a strong secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set secure to true if using HTTPS
}));
// Middleware to check session
app.use((req, res, next) => {
  if (!req.session.views) {
    req.session.views = 1;
  } else {
    req.session.views += 1;
  }
  next();
});
app.use(passport.initialize())
app.use(passport.session())
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('public'));


app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5000/');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(cors());
// app.use(express.bodyParser());
// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/index.html');
// });

app.get('/', (req, res) => {
    // Check if the app is running in a production environment
  // const isProduction = process.env.NODE_ENV === 'production';
  // res.send(`This app is running ${isProduction ? 'live' : 'locally'}`);
  if (req.session.user && Object.keys(req.session.user).length !== 0) {
    const isAuthenticated = req.session.user;
    let users_info=req.session.user;
    // console.log(users_info);
    const user_photo=users_info.photo;
    res.render('home',{isAuthenticated,user_photo});
  } else {
    const isAuthenticated = false;
    const user_photo='default';
    res.render('home',{isAuthenticated,user_photo});
  }

});
app.get('/home', (req, res) => {
  if (req.session.user && Object.keys(req.session.user).length !== 0) {
    const isAuthenticated = req.session.user;
    let users_info=req.session.user;
    // console.log(users_info);
    const user_photo=users_info.photo;
    res.render('home',{isAuthenticated,user_photo});
  } else {
    const isAuthenticated = false;
    const user_photo='default';
    res.render('home',{isAuthenticated,user_photo});
  }
});
// Set up a route
app.get('/coffee/dashboard', (req, res) => {
  if (req.session.admin_session) {
  res.render('coffee/dashboard');
  }
  else{
    res.redirect('/coffee/login');
  }
});
// Set up a route
app.get('/coffee/all_payments', (req, res) => {
  if (req.session.admin_session) {
    
  res.render('coffee/all_payments');
  }
  else{
    res.redirect('/coffee/login');
  }
});
// Set up a route
app.get('/coffee/all_links', (req, res) => {
  if (req.session.admin_session) {
    
  res.render('coffee/all_links');
  }
  else{
    res.redirect('/coffee/login');
  }
});
app.get('/get_tap_payments', async (req, res) => {
  try {
      const firestore  = admin.firestore();
      const minDateStr = req.query.min_date; // Expecting date as 'YYYY-MM-DD'
      const maxDateStr = req.query.max_date; // Expecting date as 'YYYY-MM-DD'
      const status     = req.query.status; 
      // console.log(status)
      if(minDateStr && maxDateStr)
      {
                const minDate = new Date(minDateStr + 'T00:00:00Z')
                const maxDate = new Date(maxDateStr + 'T23:59:59Z')
                const maxTimestampStr = maxDate.getTime().toString();
                const minTimestampStr = minDate.getTime().toString();
                // console.log(maxTimestampStr)
        const query = firestore.collection('all_tap_payment')
        .where('date', '>=', minTimestampStr)  // Use the actual value from the '>= string' field
        .where('date', '<=', maxTimestampStr); // Use the actual value from the '<= string' field

      query.get().then((querySnapshot) => {
        if (querySnapshot.empty) {
          console.log('No matching documents.');
          return;
        }
       
        let payments = [];
        querySnapshot.forEach(doc => {
        
            payments.push(doc.data());
        });
        res.json(payments);

      }).catch((error) => {
        res.status(500).send('Error getting documents: ', error);
      });
      }
      else if(status)
      {
        
        const query = firestore.collection('all_tap_payment')
        .where('status', '>=', status);

      query.get().then((querySnapshot) => {
        if (querySnapshot.empty) {
          console.log('No Record Found.');
          return;
        }
       
        let payments = [];
        querySnapshot.forEach(doc => {
        
            payments.push(doc.data());
        });
        res.json(payments);

      }).catch((error) => {
        res.status(500).send('Error getting documents: ', error);
      });
      }
      else{
        let query = firestore.collection('all_tap_payment');
        const snapshot = await query.get();
        // console.log(snapshot)
      
        let payments = [];
        snapshot.forEach(doc => {
        
            payments.push(doc.data());
        });
        res.json(payments);
      }
     
      
  } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).send('Error fetching data');
  }
});




app.get('/get_all_links', async (req, res) => {
  try {
      const firestore = admin.firestore();
      const snapshot = await firestore.collection('links').get();

      let links = [];
      snapshot.forEach(doc => {
          let link = doc.data();
          link.id = doc.id;
          links.push(link);
      });

      res.json(links);
  } catch (error) {
      console.error('Error fetching links:', error);
      res.status(500).json({ error: 'Error fetching data' });
  }
});




app.get('/coffee/login', (req, res) => {
  res.render('coffee/admin_login');
});

// Route for user login
app.post('/admin_login_request', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists in Firestore
    const userSnapshot = await admin.firestore().collection('admin_user').where('email', '==', email).get();

    if (userSnapshot.empty) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify the password (this is a simple example, you should use a secure authentication method)
    const user = userSnapshot.docs[0].data();
    const userId = userSnapshot.docs[0].id;
    if (user.password !== password) {
      return res.status(401).json({ message: 'Incorrect Password' });
    }

    req.session.admin_session = {
      id:userId,
      username:user.username,
      email:user.email,
  };
    // Authentication successful
    return res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


app.get('/signin', (req, res) => {
  res.render('signin');
});
app.get('/settings', (req, res) => {
  res.render('settings');
});
app.get('/signup', (req, res) => {
  res.render('signup');
});
app.get('/success', (req, res) => {
  const tapId = req.query.tap_id;
  // Render your success page and pass tapId as a variable
  res.render('success', { tapId });
  // res.render('success');
});
// app.get('/logout', (req, res) => {
//   // Destroy the current session
//   req.session.destroy((err) => {
//     if (err) {
//       console.error('Error destroying session:', err);
//       return res.status(500).send('Internal Server Error');
//     }

//     // Redirect or respond after destroying session
//     res.send('Logged out successfully!');
//   });
// });

// Initialize the OAuth2 client
const oAuth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Function to revoke the access token
async function revokeToken(token) {
  try {
    await oAuth2Client.revokeToken(token);
    console.log('Token revoked successfully');
  } catch (error) {
    console.error('Error revoking token:', error.message);
  }
}

// Example route for logging out
app.get('/logout', async (req, res) => {
 req.session=null;
 req.logout();
  res.redirect('/'); // Change '/' to the actual route of your home page
});



app.get('/get_last_payment', async (req, res) => {
  const tapId = req.query.tap_id;

  // Fetch charge details from Tappayments API
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: 'Bearer sk_test_oRBMv8F1guXLipzY0VhI9Pkr'
    }
  };

  try {
    const response = await fetch(`https://api.tap.company/v2/charges/${tapId}`, options);
    const data = await response.json();

      res.json({ success: true, data });
}
catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/save_payment_data', async (req, res) => {
  const tapId = req.query.tap_id;

  // Fetch charge details from Tappayments API
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: 'Bearer sk_test_oRBMv8F1guXLipzY0VhI9Pkr'
    }
  };

  try {
    const response = await fetch(`https://api.tap.company/v2/charges/${tapId}`, options);
    const data = await response.json();
    // console.log(parsedData)
    // Check if chr_id already exists in the collection
    const chrIdExists = await doesChrIdExist(tapId);

    if (!chrIdExists) {
      succss_saveDataToFile(data);
      res.json({ success: true, data });
    } else {
      res.json({ success: false, error: 'Record with chr_id already exists.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function doesChrIdExist(chrId) {
  // Check if chr_id already exists in the collection
  const snapshot = await db.collection('recieved_payments').where('chr_id', '==', chrId).get();
  return !snapshot.empty;
}

function succss_saveDataToFile(data) {
  const content = JSON.stringify(data, null, 2);
  const parsedData = JSON.parse(content);
      // console.log(parsedData.id);
    const created=parsedData.transaction.created;
    const chr_id=parsedData.id;
    const status=parsedData.status;
    const amount=parsedData.amount;
    const currency=parsedData.currency;
    const description=parsedData.description;
    const card=parsedData.source.payment_method;
    const fname=parsedData.customer.first_name;
    const lname=parsedData.customer.last_name;
    const email=parsedData.customer.email;
    const phone=parsedData.customer.phone.country_code+' '+parsedData.customer.phone.number;
    const transaction=parsedData.reference.transaction;
    const order=parsedData.reference.order;
    const payment=parsedData.reference.payment;
     // Save to Firebase Firestore
     // Save to Firebase Firestore
  const datas={
    created,
    chr_id,
    status,
    amount,
    currency,
    description,
    card,
    fname,
    lname,
    email,
    phone,
    transaction,
    order,
    payment
  };

  if(status=='CAPTURED')
  {
    db.collection('recieved_payments').add(datas);

    fs.writeFileSync('charge_data.txt', content);
  }else{
    db.collection('failed_payments').add(datas);

    fs.writeFileSync('charge_failed_data.txt', content);
  }

}

app.get('/chargePage', (req, res) => {
  res.render('chargePage');
});

app.get('/forgot-password', (req, res) => {
  res.render('forgotPassword');
});

// Endpoint to handle webhook notifications
app.post('/webhook', (req, res) => {
  const paymentData = req.body;

  // Save the JSON data to a text file
  saveDataToFile(paymentData);

  // Respond to the webhook request
  res.status(200).json({ success: true });
});

function saveDataToFile(data) {
  const content = JSON.stringify(data, null, 2);

  // Append to a file or customize the file name as needed
  fs.appendFileSync('webhook_data.txt', content + '\n');
}


app.post('/createCharge', async (req, res) => {
  try {
    const tappaymentsApiResponse = await fetch('https://api.tap.company/v2/charges/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk_test_oRBMv8F1guXLipzY0VhI9Pkr'
        // Add any necessary headers for authentication or other purposes
      },
      body: JSON.stringify(req.body),
    });

    const responseData = await tappaymentsApiResponse.json();
    res.json(responseData);
  } catch (error) {
    console.error('Error creating charge:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function getLastInsertedDocument(req) {
  const firestore = admin.firestore();
  const lastDoc = await firestore.collection('all_tap_payment')
      .orderBy('tr_id', 'desc')
      .limit(1)
      .get();

  if (lastDoc.empty) {
    return '';
  }

  const lastInsertedDoc = lastDoc.docs[0].data();

  // console.log(lastInsertedDoc);
  // process.exit(1);
  return lastInsertedDoc.ch_id;
}


app.post('/fetch-and-save-data', async (req, res) => {
  const ch_id = await getLastInsertedDocument(req);
  const now = new Date();
  req.session.ch_id = ch_id;
  let requestBody = {
      period: { date: { from: '', to: '' }, type: '1' },
      limit: '50'
  };

  if (req.session.ch_id && req.session.ch_id.trim() !== '') {
      requestBody.starting_after = req.session.ch_id;
  }

  const options = {
      method: 'POST',
      headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          Authorization: 'Bearer sk_live_LKysFd5ZAueoOrhkCzmMDnRE'
      },
      body: JSON.stringify(requestBody)
  };

  try {
      const response = await fetch('https://api.tap.company/v2/charges/list', options);
      const apiData = await response.json();

      if (!apiData || !apiData.charges || !Array.isArray(apiData.charges)) {
          return res.status(500).send("Invalid data format received from API");
      }

      const firestore = admin.firestore();
      let maxTrId = 0;

      const lastDoc = await firestore.collection('all_tap_payment')
          .orderBy('tr_id', 'desc')
          .limit(1)
          .get();

      if (!lastDoc.empty) {
          maxTrId = lastDoc.docs[0].data().tr_id || 0;
      }

      for (const charge of apiData.charges) {
          const docRef = firestore.collection('all_tap_payment').doc(charge.id);
          const doc = await docRef.get();
          if (!doc.exists) {
              maxTrId++; // Increment tr_id for each new document
              const formattedRecord = {
                tr_id: maxTrId,
                date: charge.transaction?.created,
                ch_id: charge.id,
                track: charge.reference?.track || 'defaultTrack',
                payment: charge.reference?.payment || '0',
                receipt: charge.receipt?.id,
                amount: charge.amount,
                currency: charge.currency,
                status: charge.status,
                code: charge.response?.code,
                message: charge.response?.message,
                brand: charge.card?.brand || 'defaultBrand',
                first_name: charge.customer?.first_name,
                last_name: charge.customer?.last_name || charge.customer?.first_name,
                customer_id: charge.customer?.id || '---',
                email: charge.customer?.email,
                country_code: charge.customer?.phone?.country_code,
                number: charge.customer?.phone?.number,
                invoice_id: charge.metadata?.invoice_id || '0',
                createdAt: admin.firestore.Timestamp.fromDate(now)
            };
              await docRef.set(formattedRecord);
          }
      }

      return res.send('Data fetched and saved/updated successfully');
  } catch (err) {
      console.error('Error fetching or saving data:', err);
      return res.status(500).send('Error fetching or saving data');
  }
});




app.post('/save_account', (req, res) => {
    const { fname, lname, email, phone, password,country_code } = req.body;

    // Create a new document in the 'users' collection with the form data
    const data={
      fname,
      lname,
      email,
      country_code,
      phone,
      password,
    }
     db.collection('site_users').add(data)
    .then(() => {
      res.status(200).json({ success: true, message: "Data received and saved successfully." });
    })
    .catch(error => {
      res.status(500).json({ success: false, error: "Internal Server Error" });
    });

    
  
});

app.get('/payment/:linkId', async (req, res) => {
  const linkId = parseInt(req.params.linkId);
    const db = admin.firestore();

    const citiesRef = db.collection('links');
    const snapshot = await citiesRef.where('number', '==', linkId).get();
    if (snapshot.empty) {
      res.render('404');
      return;
    }  
    
    snapshot.forEach(doc => {
      const userData = doc.data();
      res.render('payment', { userData });
      // console.log(doc.id, '=>', doc.data());
    });
});

app.get('/google',passport.authenticate('google',{scope:['profile','email']}))


// Set up Multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Set the destination folder for uploads
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // Rename the file with a unique name (timestamp + original extension)
  },
});

const upload = multer({ storage: storage });

// Google login route
app.get('/callback',
  upload.single('profilePhoto'), // Use the 'profilePhoto' field name specified in the form
  passport.authenticate('google', { failureRedirect: '/failed' }),
  async (req, res) => {
    try {
      // Check if the user already exists in Firestore
      const { id, displayName, emails, photos } = req.user;
      // const { fname, lname, email, phone, password,country_code } = req.body;
      const email = emails[0].value;
        // Split displayName into fname and lname
        const [fname, ...lnameArray] = displayName.split(' ');
        const lname = lnameArray.join(' ');
      const userSnapshot = await db.collection('site_users').where('email', '==', email).get();

      if (userSnapshot.empty) {
        // User doesn't exist, insert details into Firestore
        const userDoc = {
          googleId: id,
          fname,
          lname,
          email,
          country:'',
          phone:'',
          country_code:'',
          googleUser:'yes',
          password:'',
          photo: req.file ? `uploads/${req.file.filename}` : photos[0].value,
          // Add other user details as needed
        };

        await db.collection('site_users').doc(id).set(userDoc);
      }

      // Set the user details in the session
      req.session.user = {
        id,
        fname,
        lname,
        email,
        country,
        country_code:'',
        phone:'',
        googleUser:'yes',
        photo: req.file ? `uploads/${req.file.filename}` : photos[0].value,
        // Add other user details as needed
      };

      res.redirect('/profile'); // Redirect to the home page
    } catch (error) {
      console.error('Error processing Google login:', error);
      res.redirect('/signup'); // Redirect to the home page in case of an error
    }
  }
);

app.get('/profile', (req, res) => {
  const isAuthenticated = req.session.user;
  if (isAuthenticated) {
    
  // req.session.user = { email: user.emails[0].value, username: user.displayName, photo: user.photos[0].value };
  let users_info=req.session.user;
  console.log(users_info);
  // const isAuthenticated = req.session.user;
  const originalPath = users_info.photo;
  const convertedPath = originalPath.replace(/\\/g, '/');
  const password=users_info.password;
  const password_length=password.length;
  // console.log()
    res.render('profile', { email: users_info.email,country: users_info.country,fname:users_info.fname,lname:users_info.lname,user_photo:convertedPath,username:users_info.username,
      phone:users_info.phone,country_code:users_info.country_code,country_symbol:users_info.country_symbol,password:users_info.password,isAuthenticated,password_length });
  } else {
    res.redirect('/');
  }
});

app.post('/updateProfile', upload.single('profileImage'), async (req, res) => {
  try {
    const { fname, lname, username, email, phone, password,country,country_code,country_symbol } = req.body;
      // Check if a file was uploaded
    
    // Fetch the user based on the provided email
    const usersRef = db.collection('site_users');
    const querySnapshot = await usersRef.where('email', '==', email).get();

    if (querySnapshot.empty) {
      // User not found
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

  


    // Assuming there's only one user with the given email
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

         // Prepare an object with non-empty values to update in Firestore
     const updateData = {};
     if (fname)             updateData.fname = fname;
     if (lname)             updateData.lname = lname;
     if (username)          updateData.username = username;
     if (email)             updateData.email = email;
     if (country)           updateData.country = country;
     if (country_code)      updateData.country_code = country_code;
     if (country_symbol)    updateData.country_symbol = country_symbol;
     if (phone)             updateData.phone = phone;
     if (password)          updateData.password = password;

     // Update user data in Firestore
         await db.collection('site_users').doc(userId).update(updateData);

    // Save profile image path to Firestore or use it as needed
    const profileImagePath = req.file ? req.file.path : null;

    if (req.file) {
      const profileImagePath = req.file.path;
      await db.collection('site_users').doc(userId).update({
          profileImage: profileImagePath,
      });
  }
   
    const normalizedProfileImagePath = req.file
  ? path.join('uploads', req.file.filename)
  : null;
    console.log(normalizedProfileImagePath);
    // Update session data
    req.session.user = {
      id:userId,
      fname: fname,
      lname: lname,
      username:username,
      email:email,
      country:country,
      country_code:country_code,
      country_symbol:country_symbol,
      phone:phone,
      googleUser:'yes',
      password:password,
      photo:normalizedProfileImagePath || req.session.user.photo, // Use the updated profile image path or keep the existing one
  };


    res.status(200).json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Route for user login
app.post('/login_request', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists in Firestore
    const userSnapshot = await admin.firestore().collection('site_users').where('email', '==', email).get();

    if (userSnapshot.empty) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify the password (this is a simple example, you should use a secure authentication method)
    const user = userSnapshot.docs[0].data();
    const userId = userSnapshot.docs[0].id;
    if (user.password !== password) {
      return res.status(401).json({ message: 'Incorrect Password' });
    }

    req.session.user = {
      id:userId,
      fname: user.fname,
      lname: user.lname,
      username:user.username,
      email:user.email,
      country:user.country,
      country_code:user.country_code,
      country_symbol:user.country_symbol,
      phone:user.phone,
      googleUser:user.googleUser,
      password:user.password,
      photo:user.photo, // Use the updated profile image path or keep the existing one
  };
    // Authentication successful
    return res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// // Function to fetch countries from the REST Countries API
// async function fetchCountries() {
//   try {
//     const response = await axios.get('https://restcountries.com/v2/all');
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching countries:', error.message);
//     throw error;
//   }
// }

// // Route to save name and alpha3Code of countries to Firestore
// app.get('/save-countries', async (req, res) => {
//   try {
//     // Fetch countries from the API
//     const countries = await fetchCountries();

//     // Save name and alpha3Code to Firestore
//     const batch = admin.firestore().batch();
//     const countriesCollection = admin.firestore().collection('countries');

//     countries.forEach((country) => {
//       const { name, alpha3Code } = country;
//       const countryDocRef = countriesCollection.doc(alpha3Code);
//       batch.set(countryDocRef, { name, alpha3Code });
//     });

//     await batch.commit();

//     res.status(200).json({ message: 'Countries saved successfully' });
//   } catch (error) {
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });


// Function to fetch countries from Firestore
async function getCountriesFromFirestore() {
  try {
    const snapshot = await admin.firestore().collection('countries').get();
    const countries = snapshot.docs.map(doc => doc.data());
    return countries;
  } catch (error) {
    console.error('Error fetching countries from Firestore:', error.message);
    throw error;
  }
}

// Route to get all countries from Firestore
app.get('/get-countries', async (req, res) => {
  try {
    const countries = await getCountriesFromFirestore();
    res.status(200).json(countries);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Function to generate a random reset token
function generateResetToken() {
  // Implement your logic to generate a unique token (e.g., using crypto or uuid)
  // For simplicity, using a random string for demonstration purposes
  return Math.random().toString(36).slice(2);
}

app.post('/forgot_password', async (req, res) => {
  try {
    const { email } = req.body;

     // Check if the email exists in your user database
     const userSnapshot = await admin.firestore().collection('site_users').where('email', '==', email).get();

     if (userSnapshot.empty) {
       // User not found, handle accordingly
       return res.status(404).json({ message: 'User not found' });
     }
 
     const userDoc = userSnapshot.docs[0];
     const userId = userDoc.id;
 
     // Generate a unique reset token
     const resetToken = generateResetToken();

      // Update the user document with the reset token
    await admin.firestore().collection('site_users').doc(userId).update({
      resetToken,
    });

    // Create a transport for sending emails (update with your email server details)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      secure: false, // use SSL
      port: 25, // port for secure SMTP
      auth: {
        user: 'raza.aursoft@gmail.com',
        pass: 'gcgnnxopwtcxvyfd',
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Compose the email message
    const mailOptions = {
      from: 'raza.aursoft@gmail.com',
      to: email,
      subject: 'Password Reset Request',
      html: `
      <!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
        }

        h1 {
            color: #333;
            text-align: center;
        }

        p {
            color: #555;
            line-height: 1.6;
            text-align: left;
        }

        a {
            color: #007bff;
            text-decoration: none;
        }

        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #ff6c00;
            color: #fff !important;
            text-decoration: none;
            border-radius: 4px;
        }

        .footer {
            margin-top: 20px;
            text-align: center;
            color: #777;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>Password Reset Request</h1>
        <p>Hello,</p>
        <p>We received a request to reset your password. If you did not make this request, you can ignore this email.</p>
        <p>To reset your password, click the following link:</p>
        <p><a href="http://localhost:5000/reset-password/${resetToken}" class="button">Reset Password</a></p>
        <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
        <p>http://localhost:5000/reset-password/${resetToken}</p>
        <p>If you have any questions or concerns, please contact our support team.</p>
        <p>Thank you,</p>
        <p>FUJTRADE</p>
    </div>
    <div class="footer">
        <p>This email was sent from notification-only address . Please do not reply to this email.</p>
    </div>
</body>

</html>

    `
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Password reset link sent successfully' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/reset_forgot_password', async (req, res) => {
  try {
    const { newPassword, confirmPassword, resetToken } = req.body;

    // Perform a check to see if the reset token is valid
    // You should check the validity of the token, whether it's expired, etc.
    // If the token is not valid, you might want to handle it accordingly

    // Find the user by the reset token in the 'site_users' collection
    const userRef = await admin.firestore().collection('site_users').where('resetToken', '==', resetToken).limit(1).get();
    
    if (userRef.empty) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Get the user document
    const userDoc = userRef.docs[0];

    // Update the user's password in the 'site_users' collection
    await admin.firestore().collection('site_users').doc(userDoc.id).update({
      password: newPassword,
      resetToken: null, // Reset the token after updating the password
    });

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log(token)

    // Check if the token is valid (you should implement your own validation logic)
    const userRef =  await admin.firestore().collection('site_users').where('resetToken', '==', token).limit(1).get();

    if (userRef.empty) {
      return res.render('resetPassword', { tokenError: true });
    }

    // Render the reset_password view with the token
    res.render('resetPassword', { token });
  } catch (error) {
    console.error('Error handling reset password route:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/terms', (req, res) => {
  if (req.session.user && Object.keys(req.session.user).length !== 0) {
    const isAuthenticated = req.session.user;
    let users_info=req.session.user;
    // console.log(users_info);
    const user_photo=users_info.photo;
    res.render('terms',{isAuthenticated,user_photo});
  } else {
    const isAuthenticated = false;
    const user_photo='default';
    res.render('terms',{isAuthenticated,user_photo});
  }
});

 
// Function to delete the existing PDF file
// function deleteExistingPdf(filepath) {
//   try {
//       if (fs.existsSync(filepath)) {
//           fs.unlinkSync(filepath);
//           console.log('Existing file deleted');
//       }
//   } catch (error) {
//       console.error('Error deleting the file:', error);
//   }
// }

async function uploadFileToS3(filePath, bucketName) {
  // Read content from the file
  const fileContent = fs.readFileSync(filePath);

  // Setting up S3 upload parameters
  const params = {
      Bucket: bucketName,
      Key: 'pdf/' + path.basename(filePath), // File name you want to save as in S3
      Body: fileContent,
      ContentType: 'application/pdf',
      ACL: 'public-read' // Add this line
  };

  // Uploading files to the bucket
  try {
    const data = await s3.upload(params).promise();
    console.log(`File uploaded successfully. ${data.Location}`);
    return data.Location; // Return the URL of the uploaded file
  } catch (err) {
    console.error("Error in file upload: ", err);
    throw err;
  }
}

// async function deleteExistingPdf(bucketName, fileName) {
//   try {
//     const deleteParams = {
//       Bucket: bucketName,
//       Key: 'pdf/'+path.basename(fileName),
//     };
//     console.log(deleteParams)
//     await s3Client.send(new DeleteObjectCommand(deleteParams));
//     console.log(`File ${fileName} deleted successfully from S3`);
//   } catch (err) {
//     console.error("Error in file deletion from S3: ", err);
//   }
// }

async function sendEmailWithPdfAttachment(toEmail, pdfUrl) {
  try {
    console.log(`this is the url for email ${pdfUrl}`)
    // Create a Nodemailer transporter using SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      secure: true, // use SSL
      port: 465, // port for secure SMTP
      auth: {
        user: 'raza.aursoft@gmail.com',
        pass: 'gcgnnxopwtcxvyfd',
      },
      tls: {
        rejectUnauthorized: false, // correct usage
      },
    });

    // Email options
    const mailOptions = {
      from: 'raza.aursoft@gmail.com',
      to: toEmail,
      subject: 'Contract Form',
      html: '<p>Please find the attached contract form.</p>',
      attachments: [
        {
          path: pdfUrl, // URL of the PDF file in S3
        },
      ],
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

app.post('/open_account', async (req, res) => {
  try {
    const bucketName = process.env.S3_BUCKET;
    const fileName = 'output.pdf';
    // deleteExistingPdf(bucketName, fileName);
    // Prepare the SQL query
    const { email } = req.body;
const email_demo = email; // Replace with the actual email variable
      const sql = `
        SELECT * 
        FROM tap_records 
        WHERE email = ? AND status = 'CAPTURED' 
        ORDER BY created ASC 
        LIMIT 1
      `;

     // Execute the query
dbConnection.query(sql, [email_demo], async (error, results, fields) => {
  if (error) {
    console.error(error);
    return; // Exit the function in case of an error
  }

  // Ensure results are not empty
  if (results.length === 0) {
    console.log('No records found.');
    return; // Exit the function if no results found
  }

  const row = results[0];
  console.log(`Email: ${row.email}, Last Name: ${row.last_name}, Country Code: ${row.country_code}, Number: ${row.number}`);
  
  // Assuming you have a function to delete an existing PDF
 

  let name = row.first_name+' '+row.last_name;
  let email = row.email; // Use email from query result
  let date = row.created; // Replace with actual date
  let number = row.country_code +' '+ row.number; // Use number from query result

  try {
    const pdfPath = await createPdf(name, date, email, number);

     // Upload pdfPath to S3 and get the URL
     const s3PdfUrl = await uploadFileToS3(pdfPath, process.env.S3_BUCKET);
    //  console.log(s3PdfUrl)
     await sendEmailWithPdfAttachment('tech@fujtown.com', s3PdfUrl);
  
    // Further actions with pdfPath
  } catch (pdfError) {
    console.error('Error creating PDF:', pdfError);
  }
});
  




  //   const { email } = req.body;
  //   const firestore = admin.firestore();
  //   const lastDoc = await firestore.collection('all_tap_payment')
  //   .where('email', '==', email)
  //   .where('status', '==', 'CAPTURED')
  //   .orderBy('date', 'asc')
  //   .limit(1)
  //   .get();
  // if (lastDoc.empty) {
  
  //   res.status(200).json({ message: 'Record Not Found With this Email ', email });
  // }
  // else{
    // const lastInsertedDoc = lastDoc.docs[0].data();
    // console.log(lastInsertedDoc)
    // let name=lastInsertedDoc.first_name;
    // let email=lastInsertedDoc.email;
    // let date=lastInsertedDoc.date;
    // let number=lastInsertedDoc.number;

    // res.status(200).json({ message: 'Record Found With this Email ', lastInsertedDoc });
    // Delete existing PDF file
 
    // Check if the PDF file has been created
    // if (fs.existsSync(pdfPath)) {
    //     const transporter = nodemailer.createTransport({
    //       host: 'smtp.gmail.com',
    //       secure: false, // use SSL
    //       port: 25, // port for secure SMTP
    //       auth: {
    //         user: 'raza.aursoft@gmail.com',
    //         pass: 'gcgnnxopwtcxvyfd',
    //       },
    //       tls: {
    //         rejectUnauthorized: false,
    //       },
    //     });

    // // // Compose the email message
    //     const mailOptions = {
    //       from: 'raza.aursoft@gmail.com',
    //       to: email,
    //       cc: 'marketing@fujtown.com',
    //       subject: 'Contract Form',
    //       attachments: [
    //         {
    //           path: pdfPath,
    //         },
    //       ],
    //     };

    // // // Send the email
    //     await transporter.sendMail(mailOptions);

    //     res.status(200).json({ message: 'Email sent successfully' });
    // } else {
    // //   console.error('Failed to create PDF');
    //   res.status(500).json({ message: 'Failed to create PDF' });
    // }
  // }

     // Check if the email exists in your user database
    //  const userSnapshot = await admin.firestore().collection('site_users').where('email', '==', email).get();

    //  if (userSnapshot.empty) {
    //    return res.status(404).json({ message: 'User not found' });
    //  }
    
      
 

    
  } catch (error) {
    // let name='See Sheng Sim';
    // let email=' sim99@gmail.com';
    // let date='1701004011669';
    // let number='00 601165583946';
    // const pdfPath = await createPdf(name, date,email,number);
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.listen(process.env.PORT || port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
