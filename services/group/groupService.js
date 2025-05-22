const mongoose = require('mongoose');
const Group = require('../../models/group');

const get = async (id, project) => {
    let result = await Group.findById(id, project);
    return result;
};
const findOne = async (query) => {
    const result = await Group.findOne(query);
    return result;
};
const findMany = async (query) => {
    let result = await Group.find(query);
    return result;
};
const create = async (data) => {
    let result = await Group.create(data);
    return result;
};
const patch = async (id, data) => {
    let result = await Group.udpateOne(id, data);
    return result;
}

module.exports = {
    get,
    findOne,
    findMany,
    create,
    patch
}