//get secret key.
const { ACCESS_TOKEN_SECRET } = process.env;

const jwt = require('jsonwebtoken');


//Below module is authorizing the end user.
module.exports = authorization = async (req, res, next) => {
    try {
        const header = req.get('authorization');
        if (!header) {
            res.status(400).send({
                status: 0,
                message: req.t('token_not_found')
            });
        } else {

              const token = header.startsWith('Bearer ') ? header.split(' ')[1] : header;
            jwt.verify(token, ACCESS_TOKEN_SECRET, function (error, result) {
                if (error) {
                  return  res.status(400).send({
                        status: 0,
                        message: req.t('token_hasnt_verified')
                    });
                } else {
                    req.user = result;
                    next();
                }
            })
        }
    } catch (error) {
        console.log(error)
       return res.status(400).send({
            status: 0,
            message: req.t('authorization_wrong')
        })
    }
}