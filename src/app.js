const express = require("express");

const app = express();
const ejs = require("ejs");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bcrypt = require("bcryptjs");
var flash = require("connect-flash");
const mysql = require("mysql");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const multer = require("multer");
const path = require("path");
const bodyParser = require('body-parser');
const { spawn } = require('child_process');




app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: "smartteams"
});
  
// Connect to database
conn.connect((err) =>{
    if(err) throw err;
    console.log('Mysql Connected...');
}); 


const port = 4006;



const static_path = path.join(__dirname, "../public");
const template_path = path.join(__dirname, "template/views");
const partials_path = path.join(__dirname, "./template/partials");
const image_path = path.join(__dirname, "../public/uploads/image");
const profile_image_path = path.join(__dirname, "../public/uploads/profile_image");




app.use(cookieParser());

app.use(express.static(static_path));
app.set('view engine', "ejs");
app.set("views", template_path);

app.use(flash());

console.log("image path*",image_path);
// Set up image storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, image_path)
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
  });
  
  // Create upload object with storage options
  const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        return cb(new Error('Only image files are allowed!'));
      }
      cb(null, true);
    }
  });

    // Set up profile image storage
    const profile_storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, profile_image_path)
        },
        filename: function (req, file, cb) {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
        }
    });

    // Create upload object with storage options
    const profile_upload = multer({
        storage: profile_storage,
        fileFilter: function (req, file, cb) {
            if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
                return cb(new Error('Only image files are allowed!'));
            }
            cb(null, true);
        }
    });

var punchsuccess = "Punch In Successfully!";
var punchsuccessout = "Punch Out Successfully!";
var logout = "Logout Successfully!";

app.use(session({ 
    secret: 'secret', 
    resave: false, 
    saveUninitialized: false, 
    cookie: { maxAge: 3600000 }
}));

const isAuth = (req, res, next) => {
    if (req.session.isAuth) {
        next(); 
    } else {
        res.redirect("/");
    }
};



console.log("Directory name:",__dirname);

// app.get('/verify-face', (req, res) => {
//     const pythonProcess = spawn('python', ['C:/Users/Dell/Desktop/30-03-23 (1)/src/verify_face.py']);

//     let pythonOutput = '';

//     pythonProcess.stdout.on('data', (data) => {
//         // Accumulate the data received from the Python script
//         pythonOutput += data.toString('utf-8');
//     });

//     pythonProcess.stderr.on('data', (data) => {
//         // Handle any errors that occur during the execution of the Python script
//         console.error(`Error from Python script: ${data}`);
//         res.status(500).json({ error: 'Internal server error' });
//     });

//     console.log("pythonOutput:",pythonOutput);
//     // ...

//     pythonProcess.on('close', (code) => {
//         console.log(`Python script exited with code ${code}`);
//         try {
//             const startIndex = pythonOutput.indexOf('[');  // Find the start of the JSON array
//             const jsonString = pythonOutput.slice(startIndex);  // Extract the JSON string
//             const results = JSON.parse(jsonString);
//             res.json({ result: results });
//         } catch (error) {
//             console.error(`Error parsing JSON: ${error}`);
//             res.status(500).json({ error: 'Error parsing JSON' });
//         }
//     });

// // ...

// });

// ...



app.get("/", (req,res) => {
    res.render("login",{message:req.flash('message')});
});


app.post("/userlogin",(req,res) => {
    var email = req.body.email;
    var password1 = req.body.password;

    console.log("email",email);
    console.log("password",password1);
  
    conn.query("Select * from users where email = ? ",[email], async (err,results) => {
      if(err){
        console.log(err);
        res.json({message:"Something went wrong"});
    
      }
      else{
        console.log("result",results);
        if(results.length == 0 || !(await bcrypt.compare(password1, results[0].password))){
          req.flash('message', 'Invalid Email or Password');
          res.json({message:"Invalid Email or Password"});
        //   res.redirect('/');
        } else {
            console.log("I'm in");
            const token = jwt.sign({userId: results[0].id,employeeID:results[0].employee_id,employee_name:results[0].name, image: results[0].image}, 'secret', {expiresIn: '21900h'});
            console.log("token", token)
            const userId = results[0].id;
            const employeeID = results[0].employee_id;
            const employee_name = results[0].name;
            const image = results[0].image;
  
            console.log("Employee ID:-",employeeID);
  
            console.log("jwt:-",token)
            // Store the session token in the session table
            conn.query(`
              INSERT INTO session (user_id, token, expiry_time)
              VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 21900 HOUR));
            `, [userId, token], (error, results) => {
              if (error) {
                res.status(500).send('Error storing session token');
              } else {
                // Set the session cookie
                
                res.cookie('token', token, { maxAge: 3600000, httpOnly: true },userId,employeeID);
                req.session.isAuth = true;
                // console.log("cookie",cookie);
                // res.send('Logged in <a href="/protected">Go to protected content</a><br><a href="/logout">Logout</a>');
                // res.json({message:"Login Successfull", token:token, userId:userId, employeeID:employeeID});
                // res.redirect('/dashboard');
                // res in json with success message:
  
                res.status(200).json({status:'success', token:token, userId:userId, employeeID:employeeID,employee_name:employee_name,image:image});
              }
            });
          }
        }
    });
});

app.get("/leaves",isAuth, (req,res) => {
    let sql = "select leave_tbl.id, leave_tbl.employee_id,users.name, leave_tbl.date_of_applying, leave_tbl.on_date, leave_tbl.leave_type, leave_tbl.reason, leave_tbl.status from leave_tbl inner join users on leave_tbl.employee_id = users.employee_id";
    let query = conn.query(sql, (err, results) => {
      if(err) throw err;
      res.render('leaveapproval', {rows: results});
    });
});
;
app.get("/approveleave/:id",isAuth, (req,res) => {
    var employee_id = req.params.id;

    console.log("employee_id",employee_id);
    // console.log("status",status);

    conn.query("UPDATE leave_tbl SET status = ? WHERE id = ?",["Approved",employee_id], (err,results) => {
        if(err) {
            console.log(err);
            res.json({message:"Something went wrong"});
        }
        else{
            res.redirect('/leaves');
        }
    });
});

app.get("/rejectleave/:id",isAuth, (req,res) => {
    var employee_id = req.params.id;

    console.log("employee_id",employee_id);
    // console.log("status",status);

    conn.query("UPDATE leave_tbl SET status = ? WHERE id = ?",["Rejected",employee_id], (err,results) => {
        if(err) {
            console.log(err);
            res.json({message:"Something went wrong"});
        }
        else{
            console.log("result",results);
            res.redirect('/leaves');
        }
    });
});

app.post("/applyleave", (req,res) => {
    var employee_id = req.body.employee_id;
    var leave_type = req.body.leave_type;
    var date_of_apply = req.body.date_of_apply;
    var date_of_leave = req.body.date_of_leave;
    var reason = req.body.reason;

    console.log("employee_id",employee_id);
    console.log("leave_type",leave_type);
    console.log("date_of_apply",date_of_apply);
    console.log("date_of_leave",date_of_leave);
    console.log("reason",reason);

    conn.query("INSERT INTO leave_tbl(employee_id,leave_type,date_of_applying,on_date,reason) VALUES(?,?,?,?,?)",[employee_id,leave_type,date_of_apply,date_of_leave,reason], (err,results) => {
        if(err){
            console.log(err);
            res.status(401).json({status:'success', message:"Something went wrong"});
        }
        else{
            res.status(200).json({status:'success', message:"Leave Applied Successfully"});
        }
    });


    // jwt.verify(token, 'secret', (error, decoded) => {
    //     console.log("I'm in");
    //     console.log("decoded",decoded)
    //       const userId = decoded.userId;
    //       const employeeID = decoded.employeeID;
    //       let employeename = decoded.employee_name;
    //       // const date_utc = decoded.date_utc;
    //       console.log("I'm with user:",userId);
    //       // console.log("I'm with user:",date_utc);
    //       console.log("I'm with user:",employeeID);
    
    //       conn.query("SELECT * FROM emp_attendance WHERE employee_id = ? AND utc_punchin_date = ?",[employeeID,date_utc], (error, results) => {
    //         if(error) {
    //           console.log(error);
    //           res.render("attendancecheckin",{employeeid:userId});
    //         } else {
    //           console.log(results);
    //           if(results.length > 0) {
    //               if(results[0].state == 2){
    //                 console.log("Already punched out");
    //                 res.status(200).json({status:'failure-success', message:"Sorry!You have already punched-out today!", employeeid:employeeID, employeename:employeename, punchouttime:(results[0].punch_out_utc_time)});
    //                 // res.render("attendancecheckin",{employeeid:userId, message:"already punched out"});
    //               } else {
    //                 console.log(results);
    //               // console.log("type of punch out time",(results[0].punch_out_utc_time).toISOString().slice(0,10));
    //               // console.log("Already punched in");
    //               res.status(200).json({status:'success', message:"already punched in", employeeid:employeeID, employeename:employeename, punchintime:(results[0].punch_in_utc_time)});
    
    //               }               
    //               // res.render("attendancecheckout",{employeeid:userId});
    //           } else {
    //               console.log("Not punched in");
    //               res.status(200).json({status:'failure', message:"not punched in", employeeid:employeeID, employeename:employeename});
    //               // res.render("attendancecheckin",{employeeid:userId, message:"not punched in"});
    //             }
    //         }
    //       });
          
    //   });
});

app.get("/listofleaves/:id", (req,res) => {
    var employee_id = req.params.id;
    conn.query("SELECT employee_id,date_of_applying,on_date,status FROM leave_tbl WHERE employee_id = ?",[employee_id], (err,results) => {
        if(err){
            console.log(err);
            res.json({message:"Something went wrong"});
        }
        else{
            console.log(results);
            res.json({message:"Here is the list",results:results});
        }
    });
});




app.get("/attendancepage",isAuth, (req,res) => {
    let date_time = new Date();

    // get current date
    // adjust 0 before single digit date
    let date = ("0" + date_time.getDate()).slice(-2);

    // get current month
    let month = ("0" + (date_time.getMonth() + 1)).slice(-2);

    // get current year
    let year = date_time.getFullYear();

    // get current hours
    let hours = date_time.getHours();

    // get current minutes
    let minutes = date_time.getMinutes();

    // get current seconds
    let seconds = date_time.getSeconds();

    // console.log(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
    let date_time_utc = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds

    let date_utc = year + "-" + month + "-" + date;
    // var time = req.body.




    const token = req.cookies.token;
    jwt.verify(token, 'secret', (error, decoded) => {
      console.log("I'm in");
      console.log("decoded",decoded)
        const userId = decoded.userId;
        const employeeID = decoded.employeeID;
        let employeename = decoded.employee_name;
        // const date_utc = decoded.date_utc;
        console.log("I'm with user:",userId);
        // console.log("I'm with user:",date_utc);
        console.log("I'm with user:",employeeID);
  
        conn.query("SELECT * FROM emp_attendance WHERE employee_id = ? AND utc_punchin_date = ?",[employeeID,date_utc], (error, results) => {
          if(error) {
            console.log(error);
            res.render("attendancecheckin",{employeeid:userId});
          } else {
            console.log(results);
            if(results.length > 0) {
                if(results[0].state == 2){
                  console.log("Already punched out");
                  res.status(200).json({status:'failure-success', message:"Sorry!You have already punched-out today!", employeeid:employeeID, employeename:employeename, punchouttime:(results[0].punch_out_utc_time)});
                  // res.render("attendancecheckin",{employeeid:userId, message:"already punched out"});
                } else {
                  console.log(results);
                // console.log("type of punch out time",(results[0].punch_out_utc_time).toISOString().slice(0,10));
                // console.log("Already punched in");
                res.status(200).json({status:'success', message:"already punched in", employeeid:employeeID, employeename:employeename, punchintime:(results[0].punch_in_utc_time)});
  
                }               
                // res.render("attendancecheckout",{employeeid:userId});
            } else {
                console.log("Not punched in");
                res.status(200).json({status:'failure', message:"not punched in", employeeid:employeeID, employeename:employeename});
                // res.render("attendancecheckin",{employeeid:userId, message:"not punched in"});
              }
          }
        });
        
    });
});


app.post('/punchin',upload.single('image'), async(req,res) => {
    let date_time = new Date();
	
    // get current date
    // adjust 0 before single digit date
    let date1 = ("0" + date_time.getDate()).slice(-2);

    // get current month
    let month = ("0" + (date_time.getMonth() + 1)).slice(-2);

    // get current year
    let year = date_time.getFullYear();

    // get current hours
    let hours = date_time.getHours();

    // get current minutes
    let minutes = date_time.getMinutes();

    // get current seconds
    let seconds = date_time.getSeconds();

    // console.log(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
    let date_time_utc = year + "-" + month + "-" + date1 + " " + hours + ":" + minutes + ":" + seconds

    let date_utc = year + "-" + month + "-" + date1;
    var date = date_utc;
    var punchin_user_time = req.body.punch_in_user_time;
    var punchin_utc_time = date_time_utc;
    var punchinlatitude = req.body.punch_in_latitude;
    var punchinlongitude = req.body.punch_in_longitude;
    var state = 1;
    
    var profile_image = req.cookies.token;

    console.log("profile_image in punch in",profile_image);

    // Get the image path from the request
  const imagePath = req.file ? req.file.path : null;

  console.log("oldimage path",imagePath);
    // remove \public\ from the path
    

    let imagePaths = imagePath.replace(/\\/g, "/");
    const publicIndex = imagePaths.indexOf("/uploads");

    let imagePathss = imagePaths.substring(publicIndex);

    console.log("new imagepath", imagePathss);
  


    
    const token = req.cookies.token;
    jwt.verify(token, 'secret', (error, decoded) => {
      console.log("I'm in here");
      console.log(decoded);
        const employeeID = decoded.employeeID;
        let employeename = decoded.employee_name;
        let employeeprofileimage = decoded.image;
        let referenceImagePath = employeeprofileimage;
        let punchedInImagePath = imagePathss;
        
        console.log("I'm with in user:",decoded.employeeID);
        console.log("I'm with punch in image path:",punchedInImagePath);
        console.log("I'm with user profile images::",referenceImagePath);

        
        
        const pythonProcess = spawn('python', [
            'C:/Users/Dell/Desktop/30-03-23 (1)/src/verify_face.py',
            referenceImagePath,
            punchedInImagePath
        ]);

        console.log("pythonProcess:",pythonProcess);
        let pythonOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            // Accumulate the data received from the Python script
            pythonOutput += data.toString('utf-8');
        });

        pythonProcess.stderr.on('data', (data) => {
            // Handle any errors that occur during the execution of the Python script
            console.error(`Error from Python script: ${data}`);
            res.status(500).json({ error: 'Internal server error' });
        });

        pythonProcess.on('close', async(code) => {
            console.log(`Python script exited with code ${code}`);
            try {
                console.log("I'm in close of pythonOutput:",pythonOutput);
                
                const startIndex = pythonOutput.indexOf('[');  // Find the start of the JSON array
                const jsonString = pythonOutput.slice(startIndex);  // Extract the JSON string
                const results = await JSON.parse(jsonString);

                console.log("results:",results[0].accuracy);
                // Add the face verification results to the response
                if(results[0].accuracy>0.5){

                    console.log("results",results);
                    conn.query('INSERT INTO emp_attendance(employee_id, utc_punchin_date,punch_in_utc_time, punch_in_user_time, punch_in_latitude, punch_in_longitude, state,image) values (?, ?, ?, ?, ?, ?, ?, ?)', [employeeID,date,punchin_utc_time,punchin_user_time,punchinlatitude,punchinlongitude,state,imagePathss], (error, results) => {
                        if(error) 
                        {
                            console.log(error);
                                res.status(200).json({status:'failure', message:"punch in unsuccessful. Please try again!", employeeid:employeeID, employeename:employeename, image:employeeprofileimage});
                            
                        }
                        else{
                            req.flash('context', punchsuccess);
                            // res.redirect("/dashboard");
                            res.status(200).json({status:'success', message:"punch-in is successful", employeeid:employeeID, employeename:employeename, image:employeeprofileimage});
                        }
                    
                    });
                    
                }
                else{
                    res.status(200).json({status:'failure', message:"punch in unsuccessful. Please try again!", employeeid:employeeID, employeename:employeename, image:employeeprofileimage});
                }


            } catch (error) {
                console.error(`Error parsing JSON: ${error}`);
                res.status(200).json({status:'failure', message:"punch in unsuccessful. Please try again!", employeeid:employeeID, employeename:employeename, image:employeeprofileimage});

            }
        });

        
        
        // conn.query('INSERT INTO emp_attendance(employee_id, utc_punchin_date,punch_in_utc_time, punch_in_user_time, punch_in_latitude, punch_in_longitude, state,image) values (?, ?, ?, ?, ?, ?, ?, ?)', [employeeID,date,punchin_utc_time,punchin_user_time,punchinlatitude,punchinlongitude,state,imagePathss], (error, results) => {
        //     if(error) 
        //     {
        //         console.log(error);
                
        //     }
        //     else{
        //         req.flash('context', punchsuccess);
        //         // res.redirect("/dashboard");
        //         res.status(200).json({status:'success', message:"punch in successfull", employeeid:employeeID, employeename:employeename, image:employeeprofileimage});
        //     }
        
        // });
    });
});


app.post('/punchout',isAuth, (req,res) => {
    // var employeeID = req.body.employeeid;
    let date_time = new Date();

    // get current date
    // adjust 0 before single digit date
    let date = ("0" + date_time.getDate()).slice(-2);

    // get current month
    let month = ("0" + (date_time.getMonth() + 1)).slice(-2);

    // get current year
    let year = date_time.getFullYear();

    // get current hours
    let hours = date_time.getHours();

    // get current minutes
    let minutes = date_time.getMinutes();

    // get current seconds
    let seconds = date_time.getSeconds();

    // console.log(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
    let date_time_utc = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds

    let date_utc = year + "-" + month + "-" + date;

    var punchout_user_time = req.body.punch_out_user_time;
    var punchout_utc_time = date_time_utc;
    var punchoutlatitude = req.body.punch_out_latitude;
    var punchoutlongitude = req.body.punch_out_longitude;
    var state = 2;
    const token = req.cookies.token;

    jwt.verify(token, 'secret', (error, decoded) => {
        console.log("I'm in");
        const employeeID = decoded.employeeID;
        let employeename = decoded.employee_name;

        conn.query('UPDATE emp_attendance SET punch_out_utc_time = ?, punch_out_user_time = ?, punch_out_latitude = ?, punch_out_longitude = ?, state = ? WHERE employee_id = ? AND utc_punchin_date = ?', [punchout_utc_time,punchout_user_time,punchoutlatitude,punchoutlongitude,state,employeeID,date_utc], (error, results) => {
            if(error) 
            {
                console.log(error);
            }
            else{
                req.flash('context', punchsuccessout);
                // res.redirect("/dashboard");
                res.status(200).json({status:'success', message:"punch out successfull", employeeid:employeeID, employeename:employeename});
            }
        
        });
    });
});


app.get("/checkinpage",isAuth, (req,res) => {
    let date_time = new Date();

    // get current date
    // adjust 0 before single digit date
    let date = ("0" + date_time.getDate()).slice(-2);

    // get current month
    let month = ("0" + (date_time.getMonth() + 1)).slice(-2);

    // get current year
    let year = date_time.getFullYear();

    // get current hours
    let hours = date_time.getHours();

    // get current minutes
    let minutes = date_time.getMinutes();

    // get current seconds
    let seconds = date_time.getSeconds();

    // console.log(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
    let date_time_utc = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds

    let date_utc = year + "-" + month + "-" + date;
    // var time = req.body.
    const token = req.cookies.token;
  
    jwt.verify(token, 'secret', (error, decoded) => {
        console.log("I'm in");
        console.log("decoded",decoded)
        const userId = decoded.userId;
        const employeeID = decoded.employeeID;
        let employeename = decoded.employee_name;
        let state = 1;
        // const date_utc = decoded.date_utc;
        console.log("I'm with user:",userId);
        // console.log("I'm with user:",date_utc);
        console.log("I'm with user:",employeeID);
  
        if(conn.query("SELECT * FROM emp_attendance WHERE employee_id = ? AND utc_punchin_date = ? AND state = ?",[employeeID,date_utc,state], (error, results) => {
            if(error) {
                console.log(error);
                res.render("attendancecheckin",{employeeid:userId});
            } else {
                console.log(results);
                if(results.length > 0) {
                    res.status(200).json({status:'success', message:"Check-IN", employeeid:employeeID, employeename:employeename});
                } else {
                    res.status(200).json({status:'failure', message:"Sorry!You cannot check-in here. As you have punched-out.", employeeid:employeeID, employeename:employeename});
                    // res.render("attendancecheckin",{employeeid:userId, message:"not punched in"});
                }
            }
        }));
        
    });
});


app.post('/checkin',upload.single('image'), (req,res) => {
    let date_time = new Date();

    // get current date
    // adjust 0 before single digit date
    let date1 = ("0" + date_time.getDate()).slice(-2);

    // get current month
    let month = ("0" + (date_time.getMonth() + 1)).slice(-2);

    // get current year
    let year = date_time.getFullYear();

    // get current hours
    let hours = date_time.getHours();

    // get current minutes
    let minutes = date_time.getMinutes();

    // get current seconds
    let seconds = date_time.getSeconds();

    // console.log(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
    let date_time_utc = year + "-" + month + "-" + date1 + " " + hours + ":" + minutes + ":" + seconds

    let date_utc = year + "-" + month + "-" + date1;

    var date = date_utc;
    var checkin_user_time = req.body.check_in_user_time;
    var checkin_utc_time = date_time_utc;
    var checkinlatitude = req.body.check_in_latitude;
    var checkinlongitude = req.body.check_in_longitude;
    // var userimage = req.body.image;

   const imagePath = req.file ? req.file.path : null;

//    console.log("oldimage path",imagePath);
    // remove \public\ from the path

    let imagePaths = imagePath.replace(/\\/g, "/");
  imagePaths = imagePaths.replace("/root/Smarteam-Backend-2023/public", "");

   // console.log("new imagepath", imagePaths);
    
    const token = req.cookies.token;
  
    jwt.verify(token, 'secret', (error, decoded) => {
      console.log("I'm in here");
      console.log(decoded);
        const employeeID = decoded.employeeID;
        let employeename = decoded.employee_name;
        console.log("I'm with in user:",decoded.employeeID);
        conn.query('INSERT INTO checkin(employee_id, utc_checkin_date, check_in_utc_time, check_in_user_time, check_in_latitude, check_in_longitude, image) values (?, ?, ?, ?, ?, ?, ?)', [employeeID,date,checkin_utc_time,checkin_user_time,checkinlatitude,checkinlongitude,imagePaths], (error, results) => {
            if(error) 
            {
                console.log(error);
            }
            else{
                req.flash('context', punchsuccess);
                res.status(200).json({status:'success', message:"check in successfull", employeeid:employeeID, employeename:employeename});
            }
        
        });
    });
});

  app.get("/userprofie/:id", (req, res) => {
    let employee_id = req.params.id;
    let name = req.body.email;

    console.log("employee_id",employee_id);
    console.log("name",name);
    let sql = `SELECT * FROM users WHERE employee_id = '${employee_id}'`;
    conn.query(sql, (err, results) => {
        if(err) throw err;
    //   res.send(results.protocol41)
    res.status(200).json({status:'success', message:"Display profile page", employeeid:results,name:name});
    });
    });

    

    app.post("/profileupdate/:id",profile_upload.single('image'), (req, res) => {
        let employee_id = req.params.id;
        var name = req.body.username;
        var mobile = req.body.mobile;
        var image = req.body.imageder;

        console.log("employee_id",req.body);

        res.send(req.body);
        

        const imagePath = req.file ? req.file.path : null;

        console.log("oldimage path",imagePath);
            // remove \public\ from the path

        let imagePaths = imagePath.replace(/\\/g, "/");
        
        // replace this string C:/Users/Dell/Downloads/30-03-23 (1)/public from imagePaths which has the full path as C:/Users/Dell/Desktop/30-03-23 (1)/public/uploads/profile_image/image-1702141659022.jpeg with "" in imagePaths
        const publicIndex = imagePaths.indexOf("/uploads");

        let imagePathss = imagePaths.substring(publicIndex);
        
        

        

        console.log("new imagepath in profile picture:::  ", imagePathss);

        
        let sql = `UPDATE users SET name = '${name}', mobile = '${mobile}', image = '${imagePathss}' WHERE employee_id = '${employee_id}'`;
        conn.query(sql, (err, results) => {
            if(err){
                res.status(200).json({status:'failure', message:"Profile not updated", employeeid:results});
                
            }
            else
            {
                res.status(200).json({status:'success', message:"Profile updated successfully", employeeid:results});
            }
            
        });
        
    });

    app.post("/profileupdatewiimage/:id", (req, res) => {
        let employee_id = req.params.id;
        var name = req.body.username;
        var mobile = req.body.mobile;
        var image = req.body.imageder;

        console.log("employee_id",req.body);

        let sql = `UPDATE users SET name = '${name}', mobile = '${mobile}', image = '${image}' WHERE employee_id = '${employee_id}'`;
        conn.query(sql, (err, results) => {
            if(err){
                res.status(200).json({ status: 'failure', message: "Profile not updated", employeeid: results });
            }
            else
            {
                res.status(200).json({ status: 'success', message: "Profile updated successfully", employeeid: results });
            }
            
        });
        
    });
    


app.post("/adminlogin", (req,res) => {
    var email = req.body.email;
    var password = req.body.password;

    conn.query("Select * from users where email = ?",[email], async (err,results) => {
        if(err){
            console.log(err);
        }
        else{
            console.log(results);
            if(results[0].email == email){
                if(await bcrypt.compare(password, results[0].password)) {
                    if(results[0].Is_admin == 1){
                    
                    
                    const userId = results[0].id;
                    const employeeID = results[0].employee_id;
                    const token = jwt.sign({ userId,employeeID }, 'secret', { expiresIn: '1h' });
                    conn.query(`
                        INSERT INTO session (user_id, token, expiry_time)
                        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR));
                    `, [userId, token], (error, results) => {
                        if (error) {
                        res.status(500).send('Error storing session token');
                        } else {
                        res.cookie('token', token, { httpOnly: true, secure: true });
                        req.session.isAuth = true;
                        res.redirect("/userdetails");
                        // res.status(200).json({status:'success', token:token, userId:userId, employeeID:employeeID});
                        }
                    });
                }
                else{
                    res.redirect('/');
                }
                }else{
                    res.redirect('/');
                }
            }else{
                res.redirect('/');
            }
        }
    });
                
});


app.get("/admindashboard",isAuth, (req,res) => {
    res.render("dashboard");
});

app.get("/adduser", isAuth, (req,res) => {
    res.render("adduser");
})

app.post("/adduser",isAuth, async(req,res) => {
    var name = req.body.username;
    var employee_id = req.body.employeeid;
    var mobile = req.body.mobile;
    var email = req.body.email;
    var password1 = req.body.password;
    var role = req.body.role;
    var hasedPswd = await bcrypt.hash(password1, 10);
    conn.query("Select * from users where email = ?",[email], function(err,results){
        if(err){
            console.log(err);
        }
        else{
            if(results.length==0){
                console.log("hello in");
                conn.query("Insert into users(employee_id,name,mobile,email,password,Is_admin) values(?,?,?,?,?,?)",[employee_id,name,mobile,email,hasedPswd,role],(error, results) => {
                    if(error) 
                    {
                        console.log(error);
                    }
                    else{
                        res.redirect("/userdetails");
                    }
                    
                });
            }
            else{
                res.render("end");
            }
            
        }

    });
});


app.get("/userattend/:id", (req,res) => {
    employee_id = req.params.id
    let sql = `SELECT * FROM emp_attendance WHERE employee_id = '${employee_id}'`;
    let query = conn.query(sql, (err, results) => {
      if(err) throw err;
    res.send(results)
    });
});


app.get("/usercheckin/:id", (req,res) => {
    employee_id = req.params.id
    let sql = `SELECT * FROM checkin WHERE employee_id = '${employee_id}'`;
    let query = conn.query(sql, (err, results) => {
      if(err) throw err;
    res.send(results)
    });
});


app.get("/userdelete/:id", (req, res) => {
    let employee_id = req.params.id;
    let sql = `DELETE FROM users WHERE employee_id = '${employee_id}'`;
    let query = conn.query(sql, (err, results) => {
        if(err) throw err;
    //   res.send(results.protocol41)
    res.redirect('/userdetails')
      });
  });







app.get("/userdetails",isAuth, (req,res) => {
    let sql = "select users.employee_id, users.name, users.email, users.mobile, users.Is_admin from users";
    let query = conn.query(sql, (err, results) => {
      if(err) throw err;
      res.render('userlist', {rows: results});
    });
});

app.get("/userattendance", isAuth, (req,res) => {
    let sql = "select emp.employee_id,users.name, emp.utc_punchin_date, emp.punch_in_utc_time, emp.punch_in_user_time, emp.punch_in_latitude, emp.punch_in_longitude, emp.punch_out_utc_time, emp.punch_out_user_time, emp.punch_out_latitude, emp.punch_out_longitude, emp.state from emp_attendance as emp join users on users.employee_id= emp.employee_id";
    let query = conn.query(sql, (err, results) => {
      if(err) throw err;
      res.render('userattendance', {rows: results});
    });
})

app.get("/usercheckin", isAuth, (req,res) => {
    let sql = "select emp_attendance.employee_id,users.name, emp_attendance.utc_punchin_date, emp_attendance.punch_in_utc_time, emp_attendance.punch_in_user_time, emp_attendance.punch_in_latitude, emp_attendance.punch_in_longitude, checkin.check_in_utc_time, checkin.check_in_user_time, checkin.check_in_latitude, checkin.check_in_longitude, checkin.image from checkin join users on users.employee_id= checkin.employee_id JOIN emp_attendance on checkin.utc_checkin_date = emp_attendance.utc_punchin_date";
    let query = conn.query(sql, (err, results) => {
      if(err) throw err;
      res.render('usercheckin', {rows: results});
    });
})

app.get('/logout',isAuth, (req, res) => { 
    const token = req.cookies.token; 
    if (!token) { 
        req.flash('message', 'Sorry!,please login again')
        res.redirect('/'); 
    } else { 
        jwt.verify(token, 'secret', (error, decoded) => { 
            if (error) { 
                req.flash('message', 'Sorry!,please login again') 
                res.redirect('/');
            } else {
                const userId = decoded.userId; 
                // Delete the session token from the session table        
                conn.query(`DELETE FROM session WHERE user_id = ? AND token = ?;`, [userId, token], (error, results) => {
                    if (error) {
                        res.status(500).send('Error deleting session token');
                    } else { 
                        res.clearCookie('token');
                        req.session.isAuth = false;
                        req.flash('message', 'You have been logged out');
                        // res.status(200).json({status:'success-logout', message:"check in successfull"});
                        res.redirect("/");   
                    }
                });
            }
        });
    }
});

app.get('/userlogout',isAuth, (req, res) => { 
    const token = req.cookies.token; 
    if (!token) { 
        req.flash('message', 'Sorry!,please login again')
        res.redirect('/'); 
    } else { 
        jwt.verify(token, 'secret', (error, decoded) => { 
            if (error) { 
                req.flash('message', 'Sorry!,please login again') 
                res.redirect('/');
            } else {
                const userId = decoded.userId; 
                // Delete the session token from the session table        
                conn.query(`DELETE FROM session WHERE user_id = ? AND token = ?;`, [userId, token], (error, results) => {
                    if (error) {
                        res.status(500).send('Error deleting session token');
                    } else { 
                        res.clearCookie('token');
                        req.session.isAuth = false;
                        req.flash('message', 'You have been logged out');
                        res.status(200).json({status:'success-logout', message:"logout successfull"});

                        
                    }
                });
            }
        });
    }
});
  

app.listen(port, () => {
    console.log("port is Listening at http://localhost:4006/");
});