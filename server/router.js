const express = require('express');
const router = express.Router();

const cookieParser = require('cookie-parser');

const Utils = require('./Utils');
const Sessions = require('./Sessions');

global.sessions = new Sessions();
const utils = new Utils();

function checkIfLoggedIn(req, res, next) {
	let id = req.cookies.id;

	//If the client doesn't have an id or it isn't valid
	if (!utils.hasValidId(id)) 
		id = utils.createCookie(res); //Create an id

	if (!utils.isLoggedIn(id) && req.url != "/")
		utils.redirect(res, "/");

	res.locals.id = id;
	res.locals.hadValidId = utils.hasValidId(req.cookies.id);
	res.locals.isLoggedIn = utils.isLoggedIn(id);

	next();
}

router.use(cookieParser());
router.use(checkIfLoggedIn);

module.exports = router;