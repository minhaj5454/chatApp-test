const mongoose = require('mongoose');
const Admin = require('../../models/admin');

const get = async (id, project) => {
    let result = await Admin.findById(id, project);
    return result;
};
const findOne = async (id) => {
    const result = await Admin.findOne({
        _id: new mongoose.Types.ObjectId(id),
    });
    return result;
};
const findMany = async (query) => {
    let result = await Admin.find(query);
    return result;
};
const create = async (data) => {
    let result = await Admin.create(data);
    return result;
};
const patch = async (id, data) => {
    let result = await Admin.udpateOne(id, data);
    return result;
}

module.exports = {
    get,
    findOne,
    findMany,
    create,
    patch
}