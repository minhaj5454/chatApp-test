const Joi = require('joi');
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

exports.USER_SCHEMA = {
    POST: Joi.object().keys({
        id: Joi.string().regex(MONGO_ID_REGEX).required()
    }),
    CREATE: Joi.object().keys({
        username: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().required(),
        dob_year: Joi.date().iso(),
        country_code: Joi.string(),
        country_name: Joi.string(),
        city_name: Joi.string(),
        device_id: Joi.string(),
        device_type: Joi.string(),
        device_token: Joi.string(),
        gender: Joi.string(),
        postal_code: Joi.number(),
    }),
};