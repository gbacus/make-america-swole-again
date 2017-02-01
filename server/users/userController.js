var jwt = require('jwt-simple');
var knex = require('../db.js');

module.exports = {
  storeWorkout: function(req, res) {

    console.log('inserting workout exercise data into workout history');
    console.log('req.body:', req.body);
    var exercises = req.body.exercises;
    var user = req.body.user;
    console.log('this is what is being inserted:', exercises);
    var userId;

    if (user) {
      knex('users')
        .select('uid')
        .where('username', user)
        .then(function(uid) {
          if (exercises) {
            exercises.forEach((exercise) => {
              // lookup the eid by e-name
              // have a ref to user by uid
              console.log(exercise.name); // correctly logs exercise's name
              knex('exercises')
                .select('eid')
                .where('name', exercise.name) // if the name doesn't match db then eid will not be set properly
                .then(function(eid) {
                  knex('history')
                    .insert({
                      uid: uid[0].uid,
                      eid: eid[0].eid,
                      sets: exercise.sets,
                      reps: exercise.reps,
                      target_weight: exercise.targetWeight,
                      created_at: new Date(),
                      updated_at: new Date()
                    })
                    .then(function() {
                      res.status(200).end('workout exercise data was successfuly stored in workout history!');
                    });
                });
            });
          }
        });
    } else {
      console.error('no user :(((((((((((');
    }
  },

  getWorkoutHistory: function(req, res) {

    knex('exercises')
      .select('eid', 'name')
      .then(function(exerciseNames) {
        var exerciseNamesObj = {};
        exerciseNames.forEach(function(exerciseName) {
          exerciseNamesObj[exerciseName.eid] = exerciseName.name;
        });
        knex('users')
          .select('uid')
          .where('username', req.params.user)
          .then(function(uid) {
            knex('history')
              .select('eid', 'sets', 'reps', 'target_weight', 'actual_weight')
              .where('uid', uid[0].uid)
              .then(function(exercises) { // should return an array of exercise objects - {eid: , sets: , reps: , weight: }
                var result = [];
                exercises.forEach(function(exercise) {
                  result.push({
                    name: exerciseNamesObj[exercise.eid],
                    sets: exercise.sets,
                    reps: exercise.reps,
                    targetWeight: exercise.target_weight,
                    actualWeight: exercise.actual_weight
                  });
                });

                console.log('array of objects with exercise data being returned to client:', result);

                res.json(result);
              });
          })
      });

  },

  signup: function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    console.log('inside signup');
    console.log('req.body:', req.body);

    // check to see if user already exists
    knex('users')
      .select('username')
      .where('username', username)
      .then(function(user) {
        if (user.length) {
          console.log('this user', user, 'already exists');
          next(new Error('User already exist!'));
        } else {
          // make a new user if not one
          knex('users')
            .insert({
              username: username,
              password: password,
              created_at: new Date(),
              updated_at: new Date()
            })
            .then(function(user) {
              console.log('created user:', user);
            })
        }
        return user;
      })
      .then(function(user) {
      console.log('signup user:', user);
        console.log('giving user jwt token');
        // create token to send back for auth
        // var token = jwt.encode(user[0].username, 'secret');
        var token = jwt.encode(username, 'secret');
        res.json({token: token});
      })
      .catch(function (error) {
        next(error);
      });
  },

  signin: function (req, res, next) {
    var username = req.body.username; // should be getting the correct data from the signin page here
    var password = req.body.password;

    console.log('at the beginning of signin server side');

    knex('users')
      .select('username')
      .where('username', username)
      .then(function (user) {
        if (!user.length) { // evals as true if no user, at least in theory
          next(new Error('User does not exist'));
        } else {
          // return user.comparePasswords(password)
          // below should be equivalent
          console.log('comparing the username and password passed in from signin to a user account with a matching username');
          console.log('matched user account:', user);
          console.log('password from signin:', password);
          var userPassword = '';
          knex('users') // finding password of matched user account
            .select('password')
            .where('username', username) // user.username? already have the data
            .then(function(userPw) {
              userPassword = userPw[0].password;
              return password === userPassword; // comparing password entered with password in the db
            })

            .then(function(pwMatch) { // do pws match? true or false?
              if (pwMatch) {
                console.log('signing in, found user, pws match, user is:', user);
                var token = jwt.encode(user[0].username, 'secret');
                console.log('token for user is:', token);
                res.json({token: token});
              } else { // pws don't match
                return next(new Error('No user')); // there is a user, but pws don't match, right???????
              }
            })
            .catch(function (error) {
              next(error);
            });
        }
      });
  },


  checkAuth: function (req, res, next) {
    // checking to see if the user is authenticated
    // grab the token in the header if any
    // then decode the token, which ends up being the user object
    // check to see if that user exists in the database
    var token = req.headers['x-access-token'];
    console.log('Checkauth ran');
    if (!token) {
      next(new Error('No token'));
    } else {
      var user = jwt.decode(token, 'secret');

      knex('users')
        .select()
        .where('username', user.username)
        .then(function (foundUser) {
          if (foundUser.length) { // could return empty array which is truthy
            res.send(200);
          } else {
            res.send(401);
          }
        })
        .catch(function (error) {
          next(error);
        });
    }
  }

};
