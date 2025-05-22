const mongoose = require('mongoose');
const User = require('../../models/user');

const get = async (id, project) => {
    let result = await User.findById(id, project);
    return result;
};
const findOne = async (query) => {
    const result = await User.findOne(query);
    return result;
};
const findMany = async (query) => {
    let result = await User.find(query);
    return result;
};
const create = async (data) => {
    let result = await User.create(data);
    return result;
};
const patch = async (id, data) => {
    let result = await User.udpateOne(id, data);
    return result;
}

const findByIdAndUpdate = async (id, data) => {
    let result = await User.findByIdAndUpdate(id, data)
    return result 
}

module.exports = {
    get,
    findOne,
    findMany,
    create,
    patch,
    findByIdAndUpdate
}