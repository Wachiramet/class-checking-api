const express = require('express')
const request = require('request')
let app = express()

var Nightmare = require('nightmare')
var nightmare = Nightmare({ show: false })


var admin = require("firebase-admin");
var serviceAccount = require("./classchecking-c66d9-09d316fdeec2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://classchecking-c66d9.firebaseio.com/"
}); 

var db = admin.database();
var ref = db.ref("data");
var ref2 = db.ref("StudentUser");
var port = process.env.PORT || 5000;



app.set('port',(process.env.PORT || 9000))
app.listen(app.get('port'),function(){
  console.log('run at port',app.get('port'))
})


//ข้อมูลทั้งหมดใน Firebase เก็บไว้ในตัวแปล Arr
var Arr = []
var reArr = []
var checkID = []
var checkemail = []
var StaUID = []
var Staemail = []

setInterval(( ) => {
  work()
},60000)

function work(){

ref2.on('child_added', function (snapshot) {
  var item = snapshot.val()
  item.id = snapshot.key
  Arr.push(item)
  StaUID.push(item.id)
  checkemail.push(item.email.substring (0,13))
  //console.log(StaName)
})
var ref3 = db.ref("terms/register1:60");
ref3.on('child_added', function (snapshot) {
  var item = snapshot.val()
  item.id = snapshot.key
  reArr.push(item.id)
  //console.log(Arr)
})



 function filedata(){
    if(StaUID){
       checkID = StaUID.filter(StudentID => !reArr.includes(StudentID))
       var checkvalues = checkID.length
       Arr.forEach(function(element) {
           checkID.map(id => {
               if(id == element.id) Staemail.push(element.email.substring(0,13))
            })
    }, this);
    console.log(Staemail)
    console.log(checkID.length)
    }
}

setTimeout(( ) => {
  filedata()
},30000)


let i = 0
setInterval(() => { 

      if(i < checkID.length){
      console.dir(i);
      nm(i)
      i = i+1
      }
      if(i > checkID.length){
        i = 0
        checkID.splice(0, checkID.length);
        console.dir("i :"+i)
        console.dir("CheckID :"+checkID.length);
      }

 }, 32000)

function nm (x) {
  if(x < 1){
      nightmare
        .goto('http://klogic2.kmutnb.ac.th:8080/kris/index.jsp')
        .wait(1000)
        .type('input[name="username"]', '6WKN')
        .wait(1000)
        .type('input[name="password"]', '6WKN')
        .wait(1000)
        .click('input[type="submit"]')
        .wait(1000)
  }
  nightmare
        .click('a[href="checkregpicker.jsp"]')
        .wait(2000)
        .type('input[name="student_code"]', '')
        .wait(1000)
        .type('input[name="student_code"]', Staemail[x])
        .wait(1000)
        .click('input[name="do"]')
        .wait(4000)
        if(x < 1){
        nightmare
        .select('select[name="semyear"]', '1:2560')
        .wait(1000)
        .click('a[href="checkregpicker.jsp"]')
        .wait(1000)
        .type('input[name="student_code"]', '')
        .wait(1000)
        .type('input[name="student_code"]', Staemail[x])
        .wait(1000)
        .click('input[name="do"]')
        .wait(4000)
        }
        nightmare
        .evaluate(function() {
          let register = [] 
            let x = document.getElementsByTagName('tr')
            let nameTH = document.getElementsByTagName('table')[6]
            
            for (let z = 0; z < x.length; z++) {
              if (x[z].getElementsByTagName('td').length === 10) {
                let arrnameTH = nameTH.getElementsByTagName('td')[1].innerText.split(" ")
                //let arrtimez = x[z].getElementsByTagName('td')[8].innerText.split("\n")
                
                let data = {
                  nameTH : arrnameTH[1] + " " + arrnameTH[2],
                  subjectId: x[z].getElementsByTagName('td')[1].innerText,
                  section: x[z].getElementsByTagName('td')[2].innerText.trim(),
                  subjectName: x[z].getElementsByTagName('td')[3].innerText,
                  time : x[z].getElementsByTagName('td')[8].innerText
                }
                register.push(data)
              }

              if (x[z].getElementsByTagName('td').length === 9) {
                let data = {
                  nameTH : arrnameTH[1] + " " + arrnameTH[2],
                  subjectId: x[z].getElementsByTagName('td')[1].innerText,
                  section: x[z].getElementsByTagName('td')[2].innerText.trim(),
                  subjectName: x[z].getElementsByTagName('td')[3].innerText,
                  time : x[z].getElementsByTagName('td')[8].innerText
                }
                resgister.push(data)
              }
            
            }
            return register
        })
        
        //.end()
        .then(function (result) {
          console.log(result) 
          for (var i = 0; i < result.length; i++) {
            db.ref("terms/register1:60/"+checkID[x]+"/"+i).set(result[i])
            db.ref("terms/register1:60/"+checkID[x]+"/"+i+"/"+"status/firstReg").set("No")
           }
        })
          .catch(function (error) {
            console.error('Search failed:', error)
          })
          
    }
  }
