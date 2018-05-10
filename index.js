const express = require('express')
const cors = require('cors')
const PORT = process.env.PORT || 5000
const timeout = require('connect-timeout'); //express v4
const bodyParser = require('body-parser')

const mailer = require('gmail-send');
const xlsx = require('xlsx');
const moment = require('moment')
const admin = require('firebase-admin');

const Nightmare = require('nightmare')
const nightmare = Nightmare({ show: false })

const serviceAccount = require('./classchecking-c66d9-09d316fdeec2.json');
moment.locale('th')
const app = express()
app.use(cors({ origin: false }))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(timeout(120000));
app.use(haltOnTimedout);

function haltOnTimedout (req, res, next) {
  if (!req.timedout) next();
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://classchecking-c66d9.firebaseio.com/'
});

app.listen(PORT, () => {
  console.log('Server start....')
})

app.get('/update-date', async (req, res) => {
  try {
    console.log('Start update-date ....')
    const ref = admin.database().ref('dateStart')
    const snap = (await ref.once('value')).val()
    if (snap) {
      const registerKey = Object.keys(snap).filter(item => item.includes('register'))
      let data = snap
      const lastYear = moment(snap[registerKey[registerKey.length - 1]]).get('year')
      const lastTerm = registerKey[registerKey.length - 1].substr(8, registerKey[registerKey.length - 1].length).split(':')
      let temp = 0
      for (n = 1; n < 10; n++) {
        let termIs = (Number(lastTerm[0]) + n) % 2 || 2
        let calYear = lastYear + n - temp - (Number(lastTerm[0]) - 1)
        let term = moment().year(calYear).month(7 * Math.abs(termIs - 2)).startOf('month').add(1, 'w').day(1).format('YYYY-MM-DD')
        temp += termIs - 1
        let year = Number(lastTerm[1]) + n - temp
        data[`register${termIs}:${year}`] = term
      }
      ref.set(data)
    } else {
      let data = {}
      const lastYear = 2017
      const lastTerm = ['2', '59']
      let temp = 0
      for (n = 1; n < 10; n++) {
        let termIs = (Number(lastTerm[0]) + n) % 2 || 2
        let calYear = lastYear + n - temp - (Number(lastTerm[0]) - 1)
        let term = moment().year(calYear).month(7 * Math.abs(termIs - 2)).startOf('month').add(1, 'w').day(1).format('YYYY-MM-DD')
        temp += termIs - 1
        let year = Number(lastTerm[1]) + n - temp
        data[`register${termIs}:${year}`] = term
      }
      ref.set(data)
    }
    console.log('End update-date ....')
    res.sendStatus(200)
  } catch (error) {
    console.log('Error [/update-date]', error)
    res.sendStatus(500)
  }
})

app.post('/register', async (req, res) => {
  try{
    console.log('[/register] Process');
    const regi = req.body
    
    const result = await nightmare
    .goto('http://klogic2.kmutnb.ac.th:8080/kris/index.jsp')
    .wait(1000)
    // .wait('input[name="username"]')
    .type('input[name="username"]', '6WKN')
    .wait(1000)
    // .wait('input[name="password"]')
    .type('input[name="password"]', '6WKN')
    .wait(1000)
    // .wait('input[type="submit"]')
    .click('input[type="submit"]')
    .wait(1000)
    // .wait('a[href="checkregpicker.jsp"]')
    .click('a[href="checkregpicker.jsp"]')
    .wait(1000)
    // .wait('input[name="student_code"]')
    .type('input[name="student_code"]', '')
    .wait(1000)
    // .wait('input[name="student_code"]')
    .type('input[name="student_code"]', regi['studentId'])
    .wait(1000)
    // .wait('input[name="do"]')
    .click('input[name="do"]')
    .wait(4000)
    // .wait('form[name="pickSemYearForm"]')
    .evaluate(() => {
      let register = {term: [], subject: []}
      let x = document.getElementsByTagName('tr')
      let nameTH = document.getElementsByTagName('table')[6].getElementsByTagName('td')[1].innerText.split(" ")
      
      for (let z = 0; z < x.length; z++) {
        if (x[z].getElementsByTagName('td').length === 4) {
          if (x[z].getElementsByTagName('td')[2].innerText.includes('ภาค/ปีการศึกษาปัจจุบัน')) {
            let data = x[z].getElementsByTagName('td')[2].innerText.trim().split(' ')[1].split('/')
            register.term = data
          }
        }
        
        if (x[z].getElementsByTagName('td').length === 10) {
          
          let data = {
            nameTH : nameTH[1] + " " + nameTH[2],
            subjectId: x[z].getElementsByTagName('td')[1].innerText,
            section: x[z].getElementsByTagName('td')[2].innerText.trim(),
            subjectName: x[z].getElementsByTagName('td')[3].innerText,
            time : x[z].getElementsByTagName('td')[8].innerText
          }
          register.subject.push(data)
        }
        
        if (x[z].getElementsByTagName('td').length === 9) {
          let data = {
            nameTH : nameTH[1] + " " + nameTH[2],
            subjectId: x[z].getElementsByTagName('td')[1].innerText,
            section: x[z].getElementsByTagName('td')[2].innerText.trim(),
            subjectName: x[z].getElementsByTagName('td')[3].innerText,
            time : x[z].getElementsByTagName('td')[8].innerText
          }
          register.subject.push(data)
        }
        
      }
      return register
    })
    // .end()
    console.log(result)
    const ref = admin.database().ref(`/terms/register${result.term[0]}:${result.term[1].substring(2, 4)}`)
    for (let i = 0; i < result.subject.length; i++) {
      ref.child(regi['uid']).child(i).set(result.subject[i])
      ref.child(regi['uid']).child(i).child('status/firstReg').set(false)
    }
    console.log('[/register] End process');
    res.sendStatus(200)
  } catch (error) {
    console.error('Search failed:', error)
    res.status(500).send(error)
  }
})

app.post('/student', (req, res) => {
  try {
    console.log('[/student] Process');
    const a = req.body
    const refStudents = admin.database().ref('/StudentUser')
      .orderByChild('email')
      .equalTo(a.studentId + '@fitm.kmutnb.ac.th');
    refStudents.once('value', function (snapshot) {
      if(snapshot.val()) {
        const uid = Object.keys(snapshot.val())[0]

        const refClass = admin.database().ref('/Class56').child(a.subjectId)
        refClass.once('value', function (snapshotClass) {
          let subName = snapshotClass.val()['subName']
          //let timeclass = snapshotClass.val()[a.section]['time']
        
          const refStudent = admin.database().ref(`terms/register${a['term'][0]}:${a['term'][1]}`).child(uid)
          refStudent.once('value', function (snapshotStudent) {
            let temp = [...snapshotStudent.val()]
            if (temp.find(item => item.subjectId === a.subjectId)) {
              return
            }
            get_student_data(a['studentId']).then(result => {
              temp.push({
                subjectId: a.subjectId,
                section: a.section,
                subjectName: subName,
                nameTH: result
              })
              refStudent.set(temp)

              const refList = admin.database().ref('/list').child(a.subjectId).child(a.section).child(a.studentId)
              refList.set({
                Laststatus : '',
                firstSta: false,
                green:0,
                red:0,
                yellow:0,
                secondSta:false,
                nameTH: result
              })
              console.log('[/student] Completed process');
              res.sendStatus(200)
            })
          })
        })
      } else {
        res.sendStatus(204)
      }
    })
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/excel', (req, res) => {
 res.send("get excel report!");
});

app.get('/pdf', (req, res) => {
  res.send("get pdf report!");
 });

 app.get('/email', (req, res) => {
  const id = req.query.id;
  const section = req.query.section;
  const week = req.query.week;
  const mailTo = req.query.mail;

  const send = mailer({
    user: 'pamezeza2@gmail.com',
    pass: 'igrpzbdmgexlyinq',
    from: 'noreply@email.com',
    to: mailTo,
  })

  const db = admin.database().ref('/report');
  let path = week ? `${id}/${section}/${week}` : `${id}/${section}`;
  db.child(path).once('value').then((value) => {
    if (value.val()) {
      try {
        let data = week ? report_per_weeek(value.val()) : report_per_term(value.val());
      
        const ws = xlsx.utils.aoa_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'report');
      
        const buff = xlsx.write(wb, {type: 'buffer', bookType: 'xlsx'});
      
        send({
          subject: 'attached report.xlsx',
          attachments: [
            {
              filename: 'report.xlsx',
              content: buff
            }
          ],
        }, function (err, res) {
          console.log(err, res);
        })
        
        // res.setHeader('Content-Disposition', `attachment;filename=Report.xlsx`);
        res.status(200).send('Ok');
      } catch (error) {
        res.status(500).send(error);
      }
    } else {
      res.status(500).send('No data.');
    }
  });
});

report_per_weeek = (value) => {
  const date = Object.keys(value)[0];
  let data = [
    [date],
    ['ลำดับ', 'เลขประจำตัว', 'ชื่อ - นามสกุล', 'สาขา', 'สถานะ', 'หมายเหตุ']
  ];
  Object.keys(value[date]).forEach((el, index) => {
    let note = '';
    let status = value[date][el].Laststatus;
    if (status === 'ปกติ') status = '/';
    else if (status === 'มาเรียนสาย') status = 'ส';
    else if (status === 'ขาดเรียน') status = 'ข';
    else {
      note = status;
      status = '*';
    }
    data[2 + index] = [];
    data[2 + index][0] = index + 1;
    data[2 + index][1] = el;
    data[2 + index][2] = value[date][el].nameTH;
    data[2 + index][3] = 'IT';
    data[2 + index][4] = status;
    data[2 + index][5] = note;
  });

  return data;
}

report_per_term = (value) => {
  let sortData = Object.keys(value).sort((item1, item2) => {
    return Number(item1.substr(4, item1.length)) - Number(item2.substr(4, item2.length));
  })

  let data = [
    ['ลำดับ', 'เลขประจำตัว', 'ชื่อ - นามสกุล', 'สาขา', ...sortData]
  ];
  sortData.forEach((el, index) => {
    const elValue = value[el][Object.keys(value[el])[0]];
    let studentKeys = Object.keys(elValue);
    studentKeys.forEach((_el, _index) => {
      let status = elValue[_el].Laststatus;
      if (status === 'ปกติ') status = '/';
      else if (status === 'มาเรียนสาย') status = 'ส';
      else if (status === 'ขาดเรียน') status = 'ข';
      else status = '*';

      data[1 + _index] = data[1 + _index] ? data[1 + _index] : [];
      data[1 + _index][0] = _index + 1;
      data[1 + _index][1] = _el;
      data[1 + _index][2] = elValue[_el].nameTH;
      data[1 + _index][3] = 'IT';
      data[1 + _index][4 + index] = status;
    })
  })

  return data;
}

get_student_data = (id) => {
  return new Promise(function(resolve, reject) {
    console.log('Get Data', id)
      nightmare
        .goto('http://klogic2.kmutnb.ac.th:8080/kris/index.jsp')
        .wait('input[name="username"]')
        .type('input[name="username"]', '6WKN')
        .wait('input[name="password"]')
        .type('input[name="password"]', '6WKN')
        .wait('input[type="submit"]')
        .click('input[type="submit"]')
        .wait('a[href="checkregpicker.jsp"]')
        .click('a[href="checkregpicker.jsp"]')
        .wait('input[name="student_code"]')
        .type('input[name="student_code"]', id)
        .wait('input[type="submit"]')
        .click('input[type="submit"]')
        .wait('form[name="pickSemYearForm"]')
        .evaluate(function() {
          return document.getElementsByTagName('table')[6].getElementsByTagName('td')[1].innerText.split(" ")
        })
        .end()
        .then(function (result) {
          resolve(result[1] + " " + result[2])
        })
  })
}
