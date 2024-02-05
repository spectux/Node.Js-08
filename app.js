const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, 'userData.db');

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/');
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get('/books/', async (request, response) => {
  const getBooksQuery = `
  SELECT
    *
  FROM
    book
  ORDER BY
    book_id;`;
  const booksArray = await db.all(getBooksQuery);
  response.send(booksArray);
});

app.post('/register/', async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  if (password.length < 5) {
    response.status(400);
    response.send('Password is too short');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user
  WHERE 
    username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const createUserQuery = `
    INSERT INTO 
      user (username, name, password, gender, location)
    VALUES (
      '${username}',
      '${name}',
      '${hashedPassword}',
      '${gender}',
      '${location}'
    );`;
    await db.run(createUserQuery);
    response.send('User created successfully');
  } else {
    response.status(400);
    response.send('User already exists');
  }
});

app.post('/login', async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send('Invalid user');
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send('Login success!');
    } else {
      response.status(400);
      response.send('Invalid password');
    }
  }
});


app.put('/change-password', async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send('Invalid User');
    return;
  }

  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);
  if (!isPasswordMatched) {
    response.status(400);
    response.send('Invalid current password');
    return;
  }

  if (newPassword.length < 5) {
    response.status(400);
    response.send('Password is too short');
    return;
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  const updatePasswordQuery = `
    UPDATE user
    SET password = '${hashedNewPassword}'
    WHERE username = '${username}';
  `;
  await db.run(updatePasswordQuery);

  response.send('Password updated');
});

module.exports = app;
