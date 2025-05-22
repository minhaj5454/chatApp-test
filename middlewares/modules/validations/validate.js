function validate(schema, body) {
    const { error } = schema.validate(body);
    if (error) throw new Error(error.details[0].message);
};

module.exports = {
    validate
}