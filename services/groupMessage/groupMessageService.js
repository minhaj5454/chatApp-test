const mongoose = require('mongoose');
const MessageGroup = require('../../models/messageGroup');

const get = async (id, project) => {
    let result = await MessageGroup.findById(id, project);
    return result;
};
const findOne = async (query) => {
    const result = await MessageGroup.findOne(query);
    return result;
};
const findMany = async (query) => {
    let result = await MessageGroup.find({ ...query, isDeleted: { $ne: true } }).sort({ createdAt: 1 });
    return result;
};
const create = async (data) => {
    let result = await MessageGroup.create(data);
    return result;
};
const findByIdAndUpdate = async (id, data) => {
    let result = await MessageGroup.findByIdAndUpdate(id, data);
    return result;
}

module.exports = {
    get,
    findOne,
    findMany,
    create,
    findByIdAndUpdate
}